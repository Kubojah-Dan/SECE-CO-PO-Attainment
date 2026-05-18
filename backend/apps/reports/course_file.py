import io
import zipfile
import json
from datetime import datetime
from openpyxl import Workbook
from apps.allocations.models import SubjectAllocation
from apps.subjects.models import CourseOutcome, COPOMapping
from apps.attainment.models import COAttainment, ActionTakenReport
from .excel_generators import generate_marks_template

class CourseFileGenerator:
    """
    Service to compile institutional Course Files.
    Aggregates syllabus, COs, Mappings, Marks, and Attainment into a ZIP.
    """

    @classmethod
    def generate_zip(cls, allocation_id):
        try:
            allocation = SubjectAllocation.objects.select_related(
                'subject', 'section', 'batch', 'academic_year', 'subject__department'
            ).get(id=allocation_id)
        except SubjectAllocation.DoesNotExist:
            raise ValueError("Allocation not found")

        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 1. Subject Metadata (Text)
            metadata = [
                f"COLLEGE: SRI ESHWAR COLLEGE OF ENGINEERING",
                f"DEPARTMENT: {allocation.subject.department.name}",
                f"ACADEMIC YEAR: {allocation.academic_year.label}",
                f"BATCH: {allocation.batch.label}",
                f"SUBJECT: {allocation.subject.subject_code} - {allocation.subject.subject_name}",
                f"SEMESTER: {allocation.semester}",
                f"GENERATED ON: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "\n========================================================\n"
            ]
            zf.writestr("01_Metadata.txt", "\n".join(metadata))

            # 2. Course Outcomes (Text)
            cos = CourseOutcome.objects.filter(subject=allocation.subject)
            co_lines = ["COURSE OUTCOMES (COs)\n", "======================\n"]
            for co in cos:
                co_lines.append(f"{co.co_code}: {co.description} [Bloom: {co.bloom_level}]")
            zf.writestr("02_Course_Outcomes.txt", "\n".join(co_lines))

            # 3. CO-PO Mapping (CSV-like Text)
            mappings = COPOMapping.objects.filter(co__in=cos)
            mapping_lines = ["CO-PO MAPPING\n", "============\n", "CO | PO | Level\n", "---|----|------\n"]
            for m in mappings:
                mapping_lines.append(f"{m.co.co_code} | {m.po.po_code} | {m.correlation_level}")
            zf.writestr("03_CO_PO_Mapping.txt", "\n".join(mapping_lines))

            # 4. Attainment Summary (JSON)
            attainments = COAttainment.objects.filter(subject_allocation=allocation)
            att_data = []
            for att in attainments:
                att_data.append({
                    "co": att.co.co_code,
                    "attainment_pct": float(att.attainment_percentage or 0),
                    "level": att.attainment_level,
                    "target_achieved": att.target_achieved
                })
            zf.writestr("04_Attainment_Report.json", json.dumps(att_data, indent=4))

            # 5. Action Taken Report (if exists)
            try:
                atr = ActionTakenReport.objects.get(subject_allocation=allocation)
                atr_lines = [
                    f"ACTION TAKEN REPORT (ATR)\n",
                    f"========================\n",
                    f"Status: {atr.implementation_status}",
                    f"Root Cause: {atr.root_cause}",
                    f"Proposed Actions: {atr.proposed_actions}",
                    f"HOD Remarks: {atr.hod_remarks}"
                ]
                zf.writestr("05_Action_Taken_Report.txt", "\n".join(atr_lines))
            except ActionTakenReport.DoesNotExist:
                zf.writestr("05_Action_Taken_Report.txt", "No ATR submitted for this subject.")

        zip_buffer.seek(0)
        return zip_buffer.getvalue()
