"""
SECE CO-PO Platform — Celery Tasks for Marks Processing
Async Excel upload processing and attainment recalculation.
"""
import logging
from io import BytesIO
from datetime import datetime

import pandas as pd
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    queue='marks_processing',
    max_retries=3,
    default_retry_delay=30,
    name='marks.process_marks_excel',
)
def process_marks_excel(self, upload_log_id: int):
    """
    Process an uploaded Excel marks file asynchronously.

    Pipeline:
    1. Read Excel file (pandas)
    2. Validate each row (roll number, marks range, absent flag)
    3. Match roll number to student in section
    4. Bulk-save valid marks (update_or_create)
    5. Store row-level errors in upload log
    6. Trigger attainment recalculation if any marks saved
    """
    from apps.marks.models import ExcelUploadLog, StudentMark
    from apps.students.models import Student

    try:
        log = ExcelUploadLog.objects.select_related(
            'subject_allocation__subject',
            'subject_allocation__section',
            'assessment_type',
            'uploaded_by',
        ).get(id=upload_log_id)
    except ExcelUploadLog.DoesNotExist:
        logger.error(f"ExcelUploadLog {upload_log_id} not found")
        return

    log.status = ExcelUploadLog.Status.PROCESSING
    log.task_id = self.request.id
    log.save(update_fields=['status', 'task_id'])

    errors = []
    success_count = 0

    try:
        # ── Intelligent Ingestion ────────────────────────────────────
        # Load excel file to check sheets
        xl = pd.ExcelFile(log.file.path)
        sheet_name = xl.sheet_names[0] # Default to first sheet
        
        # Try to match section name in sheets (e.g., "AIML A")
        section_name = log.subject_allocation.section.name.upper()
        for s in xl.sheet_names:
            if section_name in s.upper():
                sheet_name = s
                break
        
        # Load the selected sheet to find headers
        raw_df = pd.read_excel(log.file.path, sheet_name=sheet_name, header=None)
        
        header_row_idx = -1
        roll_col_idx = -1
        
        # 1. Find Header Row
        HEADER_KEYS = ('ROLL NO', 'ROLL NUMBER', 'REGISTER NO', 'REG NO', 'REG. NO', 'ROLLNO', 'REGISTERNO', 'REGISTER NUMBER', 'REGISTER', 'REG. NUMBER')
        HEADER_ROW_KEYS = HEADER_KEYS + ('SERIAL NUMBER', 'S.NO', 'S.NO.')
        
        for i, row in raw_df.head(15).iterrows():
            row_str = [str(cell).strip().upper() for cell in row]
            # Match Roll No or Register No in a highly flexible way (check substring)
            if any(any(k in cell for k in HEADER_ROW_KEYS) for cell in row_str):
                header_row_idx = i
                # Find which column index is the Roll Number (ONLY match actual roll keys, NEVER serial number)
                for idx, cell in enumerate(row_str):
                    if any(k in cell for k in HEADER_KEYS):
                        roll_col_idx = idx
                        break
                break
        
        if header_row_idx == -1:
            raise ValueError("Could not find header row with 'Roll Number' / 'Register Number' in the first 15 rows.")
            
        # 2. Reload with correct header
        df = pd.read_excel(log.file.path, sheet_name=sheet_name, header=header_row_idx)
        log.records_total = len(df)
        log.save(update_fields=['records_total'])

        max_marks = log.get_max_marks()
        assessment_code = log.assessment_type.code.upper() # e.g., 'CIA1'

        # 3. Detect Relevant Columns
        cols = {str(c).strip().upper(): c for c in df.columns}
        
        # Total Marks Column (look for matching assessment)
        # Patterns: "CIA - 1", "CIA 1", "CIA1", "MARKS", "ESE"
        marks_col = None
        for col_name, original_col in cols.items():
            cleaned_col = col_name.replace(' ', '').replace('-', '').replace('_', '')
            if assessment_code in cleaned_col:
                marks_col = original_col
                break
        
        if not marks_col:
            # Fallback to assessment full name matching
            assessment_name = log.assessment_type.name.upper().replace(' ', '').replace('-', '').replace('_', '')
            for col_name, original_col in cols.items():
                cleaned_col = col_name.replace(' ', '').replace('-', '').replace('_', '')
                if assessment_name in cleaned_col or cleaned_col in assessment_name:
                    marks_col = original_col
                    break

        if not marks_col:
            # Fallback to general marks/total/obtained terms
            marks_col = next((c for k, c in cols.items() if any(x in k for x in ('MARKS', 'TOTAL', 'SCORE', 'OBTAINED'))), None)

        if not marks_col:
            # Fallback to the first numeric column after the roll number column
            for idx, col in enumerate(df.columns):
                if idx == roll_col_idx:
                    continue
                try:
                    if pd.to_numeric(df[col], errors='coerce').dropna().count() > 0:
                        marks_col = col
                        break
                except Exception:
                    continue

        # CO Columns (for this assessment)
        # If we are in CIA1, we might want CO1, CO2
        # But wait, the Excel might have CO1 (40) and CO2 (20) for CIA1
        co_cols = [c for k, c in cols.items() if k.startswith('CO') and '(' in k]

        # 4. Pre-fetch students
        students_map = {
            s.roll_number.strip().upper(): s
            for s in Student.objects.filter(
                section=log.subject_allocation.section,
                is_active=True,
            )
        }

        from apps.marks.models import StudentQuestionMark, QuestionCOMapping

        # 5. Process Rows
        for idx, row in df.iterrows():
            row_num = header_row_idx + idx + 2 # Excel row (1-indexed)
            
            roll_raw = str(row.iloc[roll_col_idx]).strip().upper()
            if not roll_raw or roll_raw in ('NAN', 'NONE', ''):
                continue

            # Dynamically resolve student name from name column if present (keys in cols are uppercase)
            name_col = next((c for k, c in cols.items() if 'NAME' in k), None)
            excel_name = str(row.get(name_col)).strip() if name_col is not None else None
            if excel_name and excel_name.lower() not in ('nan', 'none', ''):
                student_name = excel_name
            else:
                student_name = None

            student = students_map.get(roll_raw)
            if not student:
                # Check if student exists globally
                student = Student.objects.filter(roll_number=roll_raw).first()
                
            resolved_name = student_name or f"Student {roll_raw}"

            try:
                if not student:
                    student = Student.objects.create(
                        department=log.subject_allocation.subject.department,
                        roll_number=roll_raw,
                        name=resolved_name,
                        batch=log.subject_allocation.section.batch,
                        section=log.subject_allocation.section,
                        is_active=True
                    )
                else:
                    # Update existing student's section/batch/name if required
                    needs_save = False
                    if student.section != log.subject_allocation.section:
                        student.section = log.subject_allocation.section
                        needs_save = True
                    if student.batch != log.subject_allocation.section.batch:
                        student.batch = log.subject_allocation.section.batch
                        needs_save = True
                    
                    current_is_placeholder = student.name.startswith('Student ') or not student.name or student.name.strip() == ''
                    if student_name and (current_is_placeholder or student.name != student_name):
                        student.name = student_name
                        needs_save = True
                    
                    if needs_save:
                        student.save()
                
                students_map[roll_raw] = student
            except Exception as ex:
                errors.append({
                    'row': row_num,
                    'roll_number': roll_raw,
                    'error': f"Failed to dynamically register/update student '{roll_raw}': {str(ex)}"
                })
                continue

            # Attendance check
            absent_col = next((c for k, c in cols.items() if any(x in k for x in ('ABSENT', 'ATTENDANCE'))), None)
            is_absent = False
            if absent_col:
                val = str(row.get(absent_col, '')).strip().upper()
                is_absent = val in ('Y', 'YES', 'A', 'AB', 'ABSENT')

            if is_absent:
                total_marks = 0
            else:
                # Try to get marks from marks_col
                marks_val = row.get(marks_col) if marks_col else None
                try:
                    total_marks = float(marks_val) if (marks_val is not None and not pd.isna(marks_val)) else None
                except (ValueError, TypeError):
                    total_marks = None
                
                # Fetch mappings for this allocation/assessment
                mappings = QuestionCOMapping.objects.filter(
                    subject_allocation=log.subject_allocation,
                    assessment_type=log.assessment_type
                )
                
                question_total = 0
                has_questions = False
                for mapping in mappings:
                    # Cleaned question number variation
                    q_num = str(mapping.question_number).upper().strip().replace(' ', '').replace('_', '').replace('Q', '')
                    col = next((c for k, c in cols.items() if 
                        k.replace(' ', '').replace('_', '').replace('Q', '').replace('QUESTION', '') == q_num or
                        f"CO{mapping.co.co_number}" in k.replace(' ', '').replace('_', '') or
                        mapping.co.co_code.upper() in k.replace(' ', '').replace('_', '')
                    ), None)
                    
                    if col:
                        val = row.get(col)
                        try:
                            q_mark = float(val) if not pd.isna(val) else 0
                            StudentQuestionMark.objects.update_or_create(
                                student=student,
                                question_mapping=mapping,
                                defaults={'marks_obtained': q_mark}
                            )
                            question_total += q_mark
                            has_questions = True
                        except (ValueError, TypeError):
                            pass

                if total_marks is None:
                    if has_questions:
                        total_marks = question_total
                    else:
                        total_marks = 0
                elif total_marks == 0 and has_questions and question_total > 0:
                    total_marks = question_total

            # Save StudentMark
            StudentMark.objects.update_or_create(
                student=student,
                subject_allocation=log.subject_allocation,
                assessment_type=log.assessment_type,
                defaults={
                    'marks_obtained': total_marks,
                    'max_marks': max_marks,
                    'is_absent': is_absent,
                    'entered_by': log.uploaded_by,
                }
            )
            success_count += 1

        # ── Update log ───────────────────────────────────────────────
        if errors and success_count == 0:
            log.status = ExcelUploadLog.Status.FAILED
        elif errors:
            log.status = ExcelUploadLog.Status.PARTIAL
        else:
            log.status = ExcelUploadLog.Status.SUCCESS

        log.records_processed = success_count
        log.errors = errors
        log.completed_at = timezone.now()
        log.save(update_fields=['status', 'records_processed', 'errors', 'completed_at'])

        # ── Trigger dynamic live notifications ───────────────────────
        try:
            from apps.audit.models import create_notification
            subject_code = log.subject_allocation.subject.subject_code
            assessment_name = log.assessment_type.name
            
            if log.status == ExcelUploadLog.Status.SUCCESS:
                create_notification(
                    user=log.uploaded_by,
                    title="Excel Processing Complete",
                    message=f"Marks for {assessment_name} of course {subject_code} successfully imported.",
                    level="success"
                )
            elif log.status == ExcelUploadLog.Status.PARTIAL:
                create_notification(
                    user=log.uploaded_by,
                    title="Excel Processing Completed with Errors",
                    message=f"Marks for {assessment_name} of course {subject_code} imported with some errors. Please check details.",
                    level="warning"
                )
            else:
                create_notification(
                    user=log.uploaded_by,
                    title="Excel Processing Failed",
                    message=f"Import of {assessment_name} marks for {subject_code} failed completely.",
                    level="danger"
                )
        except Exception as e:
            logger.error(f"Failed to trigger upload notification: {e}")

        logger.info(
            f"[ExcelUpload] {log.filename}: {success_count} records saved, "
            f"{len(errors)} errors | Allocation {log.subject_allocation_id}"
        )

        # ── Trigger attainment recalculation ─────────────────────────
        if success_count > 0:
            calculate_attainment.delay(log.subject_allocation_id)

    except Exception as exc:
        log.status = ExcelUploadLog.Status.FAILED
        log.errors = [{'error': str(exc)}]
        log.completed_at = timezone.now()
        log.save(update_fields=['status', 'errors', 'completed_at'])
        logger.exception(f"[ExcelUpload] Failed for log {upload_log_id}: {exc}")

        # Retry on transient errors
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    queue='attainment',
    name='attainment.calculate',
)
def calculate_attainment(self, subject_allocation_id: int):
    """
    Trigger full CO→PO→PSO attainment recalculation for a subject allocation.
    Called after marks are saved (either via Excel upload or manual entry).
    """
    from apps.attainment.calculators import AttainmentOrchestrator

    try:
        orchestrator = AttainmentOrchestrator(subject_allocation_id)
        results = orchestrator.run()
        logger.info(
            f"[Attainment] Recalculated for allocation {subject_allocation_id}: "
            f"{len(results.get('co_results', []))} COs updated"
        )
        
        # ── Trigger dynamic live notification of successful attainment calculation ────
        try:
            from apps.audit.models import create_notification
            from apps.allocations.models import SubjectAllocation
            alloc = SubjectAllocation.objects.get(id=subject_allocation_id)
            create_notification(
                user=alloc.faculty.user,
                title="Attainment Calculated Successfully",
                message=f"Direct and indirect attainment calculations for {alloc.subject.subject_code} - {alloc.section.name} have been finalized.",
                level="success"
            )
        except Exception as e:
            logger.error(f"Failed to trigger calculation notification: {e}")
            
        return results
    except Exception as exc:
        logger.exception(f"[Attainment] Failed for allocation {subject_allocation_id}: {exc}")
        raise


@shared_task(name='marks.generate_excel_template')
def generate_excel_template_task(subject_allocation_id: int, assessment_type_code: str) -> bytes:
    """Generate pre-filled Excel template for a subject allocation."""
    from apps.reports.excel_generators import generate_marks_template
    return generate_marks_template(subject_allocation_id, assessment_type_code)
