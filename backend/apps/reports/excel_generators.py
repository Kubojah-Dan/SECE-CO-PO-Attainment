import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Fill, PatternFill, Border, Side
from django.utils import timezone
from apps.allocations.models import SubjectAllocation, AssessmentType
from apps.students.models import Student
from apps.subjects.models import CourseOutcome, COPOMapping, COPSOMapping
from apps.attainment.models import COAttainment, POAttainment, PSOAttainment
from apps.departments.models import ProgramOutcome, ProgramSpecificOutcome

def generate_marks_template(allocation_id, assessment_type_code):
    """
    Generates a pre-filled SECE Excel template for marks entry.
    Contains: Subject info, Assessment info, Student List.
    """
    try:
        allocation = SubjectAllocation.objects.select_related(
            'subject', 'section', 'batch', 'academic_year'
        ).get(id=allocation_id)
        
        assessment = AssessmentType.objects.get(code=assessment_type_code)
    except (SubjectAllocation.DoesNotExist, AssessmentType.DoesNotExist):
        raise ValueError("Invalid allocation or assessment type")

    students = Student.objects.filter(
        section=allocation.section,
        is_active=True
    ).order_by('roll_number')

    wb = Workbook()
    ws = wb.active
    ws.title = "Marks Entry"

    # ── Styles ──────────────────────────────────────────────────
    header_fill = PatternFill(start_color="1E4A8A", end_color="1E4A8A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=12)
    info_font = Font(bold=True)
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    # ── Institutional Header ─────────────────────────────────────
    ws.merge_cells('A1:D1')
    ws['A1'] = "SRI ESHWAR COLLEGE OF ENGINEERING (AUTONOMOUS)"
    ws['A1'].font = Font(size=14, bold=True, color="1E4A8A")
    ws['A1'].alignment = Alignment(horizontal="center")

    ws.merge_cells('A2:D2')
    ws['A2'] = "CO-PO Attainment Management System — Marks Entry Template"
    ws['A2'].font = Font(size=11, italic=True)
    ws['A2'].alignment = Alignment(horizontal="center")

    # ── Subject Info ─────────────────────────────────────────────
    ws['A4'] = "Subject:"
    ws['B4'] = f"{allocation.subject.subject_code} — {allocation.subject.subject_name}"
    ws['A5'] = "Assessment:"
    ws['B5'] = f"{assessment.name} (Max: {assessment.default_max_marks})"
    ws['C4'] = "Batch:"
    ws['D4'] = str(allocation.batch)
    ws['C5'] = "Section:"
    ws['D5'] = f"Sem {allocation.semester} - {allocation.section.name}"

    for cell in ['A4', 'A5', 'C4', 'C5']:
        ws[cell].font = info_font

    # ── Data Table Header ────────────────────────────────────────
    # ── Detect Dynamic Columns ───────────────────────────────────
    from apps.marks.models import QuestionCOMapping
    q_maps = list(QuestionCOMapping.objects.filter(
        subject_allocation=allocation,
        assessment_type=assessment
    ).order_by('question_number'))
    
    headers = ["S.No", "Roll Number", "Student Name"]
    if q_maps:
        for qm in q_maps:
            headers.append(f"{qm.question_number} (Max: {qm.max_marks})")
    else:
        headers.append(f"Marks (Max: {assessment.default_max_marks})")
    
    headers.append("Absent (Y/N)")
    
    # ── Data Table Header ────────────────────────────────────────
    ws.append([]) # Row 6 blank
    header_row = 7
    for col, text in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col, value=text)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
        cell.border = border

    # ── Student Data ─────────────────────────────────────────────
    for idx, student in enumerate(students, 1):
        curr_row = header_row + idx
        ws.cell(row=curr_row, column=1, value=idx).border = border
        ws.cell(row=curr_row, column=2, value=student.roll_number).border = border
        ws.cell(row=curr_row, column=3, value=student.name).border = border
        
        # Add empty cells with borders for all mark columns
        for col_idx in range(4, len(headers) + 1):
            ws.cell(row=curr_row, column=col_idx).border = border

    # ── Adjust Column Widths ─────────────────────────────────────
    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 40
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 15

    # ── Save to Buffer ───────────────────────────────────────────
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()

def generate_nba_attainment_report(allocation_id):
    """
    Generates a comprehensive NBA/NAAC Attainment Report.
    Sheets: PO_AND_PSO, CO_PO_MAPPING, CO_ATTAINMENT_CALC, FINAL_MATRIX.
    """
    try:
        allocation = SubjectAllocation.objects.select_related(
            'subject__department', 'section__batch__programme', 'academic_year'
        ).get(id=allocation_id)
    except SubjectAllocation.DoesNotExist:
        raise ValueError("Invalid allocation")

    wb = Workbook()
    
    # ── Style Definitions ────────────────────────────────────────
    header_fill = PatternFill(start_color="2C3E50", end_color="2C3E50", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    center_align = Alignment(horizontal="center", vertical="center")
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    # ── Sheet 1: PO & PSO ────────────────────────────────────────
    ws1 = wb.active
    ws1.title = "PO_AND_PSO"
    ws1.append(["PO/PSO", "Statement / Description"])
    
    pos = ProgramOutcome.objects.filter(programme=allocation.section.batch.programme)
    for po in pos:
        ws1.append([po.po_code, po.description])
    
    psos = ProgramSpecificOutcome.objects.filter(programme=allocation.section.batch.programme)
    for pso in psos:
        ws1.append([pso.pso_code, pso.description])

    # ── Sheet 2: CO_PO MAPPING ───────────────────────────────────
    ws2 = wb.create_sheet("CO_PO MAPPING")
    cos = CourseOutcome.objects.filter(subject=allocation.subject)
    headers = ["Course Outcome"] + [p.po_code for p in pos] + [p.pso_code for p in psos]
    ws2.append(headers)
    
    for co in cos:
        row = [co.co_code]
        mappings = COPOMapping.objects.filter(co=co)
        pso_mappings = COPSOMapping.objects.filter(co=co)
        
        mapping_dict = {m.po_id: m.correlation_level for m in mappings}
        pso_mapping_dict = {m.pso_id: m.correlation_level for m in pso_mappings}
        
        for po in pos:
            row.append(mapping_dict.get(po.id, ""))
        for pso in psos:
            row.append(pso_mapping_dict.get(pso.id, ""))
        ws2.append(row)

    # ── Sheet 3: CO ATTAINMENT CALC ──────────────────────────────
    ws3 = wb.create_sheet("CO ATTAINMENT")
    ws3.append(["CO Code", "Direct Attainment (%)", "Indirect Attainment (%)", "Final Attainment (%)", "Attainment Level"])
    
    attainments = COAttainment.objects.filter(subject_allocation=allocation).order_by('co__co_number')
    for att in attainments:
        ws3.append([
            att.co.co_code,
            float(att.direct_attainment or 0),
            float(att.indirect_attainment or 0),
            float(att.final_attainment or 0),
            att.attainment_level
        ])

    # ── Final Matrix formatting ──────────────────────────────────
    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                cell.border = border

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()

def generate_student_template():
    """Generates a blank template for bulk student import."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Student Import"
    
    headers = ["Roll Number", "Register Number", "Name", "Email", "Phone", "Section Code", "Batch Name"]
    ws.append(headers)
    
    # Style
    header_fill = PatternFill(start_color="1E4A8A", end_color="1E4A8A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    for col, text in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = header_font
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()

def generate_subject_template():
    """Generates a blank template for course catalog import."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Course Catalog"
    
    headers = ["Subject Code", "Subject Name", "Department Code", "Regulation", "Credits", "Type (Theory/Lab/Project)"]
    ws.append(headers)
    
    # Style
    header_fill = PatternFill(start_color="1E4A8A", end_color="1E4A8A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    for col, text in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = header_font
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()

def generate_co_summary_report(allocation_id):
    """
    Generates a detailed Course Outcome Attainment Summary report.
    """
    try:
        allocation = SubjectAllocation.objects.select_related(
            'subject__department', 'section__batch__programme', 'academic_year', 'faculty__user'
        ).get(id=allocation_id)
    except SubjectAllocation.DoesNotExist:
        raise ValueError("Invalid allocation")

    wb = Workbook()
    ws = wb.active
    ws.title = "CO Attainment Summary"

    # Styles
    title_font = Font(size=14, bold=True, color="1E4A8A")
    subtitle_font = Font(size=11, italic=True)
    header_fill = PatternFill(start_color="1E4A8A", end_color="1E4A8A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    info_font = Font(bold=True)
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    center_align = Alignment(horizontal="center", vertical="center")

    # Header
    ws.merge_cells('A1:I1')
    ws['A1'] = "SRI ESHWAR COLLEGE OF ENGINEERING (AUTONOMOUS)"
    ws['A1'].font = title_font
    ws['A1'].alignment = center_align

    ws.merge_cells('A2:I2')
    ws['A2'] = "Course Outcome Attainment Summary & Target Analysis"
    ws['A2'].font = subtitle_font
    ws['A2'].alignment = center_align

    # Info Block
    ws['A4'] = "Course:"
    ws['B4'] = f"{allocation.subject.subject_code} — {allocation.subject.subject_name}"
    ws['A5'] = "Faculty:"
    ws['B5'] = allocation.faculty.user.get_full_name() if allocation.faculty else "N/A"
    ws['F4'] = "Section / Sem:"
    ws['G4'] = f"Sem {allocation.semester} - {allocation.section.name}"
    ws['F5'] = "Academic Year:"
    ws['G5'] = str(allocation.academic_year)

    for cell in ['A4', 'A5', 'F4', 'F5']:
        ws[cell].font = info_font

    # Table Header
    headers = [
        "CO Code", "Description", "Bloom's Level", 
        "Target Level", "Direct (%)", "Indirect (%)", 
        "Final (%)", "Attainment Level", "Target Achieved"
    ]
    ws.append([]) # Row 6 blank
    header_row = 7
    for col, text in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col, value=text)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = border

    # Get threshold values from configuration
    from apps.attainment.calculators import _get_config
    config = _get_config(allocation.subject.department_id)

    # Data
    attainments = COAttainment.objects.filter(subject_allocation=allocation).order_by('co__co_number')
    for idx, att in enumerate(attainments, 1):
        curr_row = header_row + idx
        ws.cell(row=curr_row, column=1, value=att.co.co_code).alignment = center_align
        ws.cell(row=curr_row, column=2, value=att.co.description)
        ws.cell(row=curr_row, column=3, value=att.co.bloom_level).alignment = center_align
        ws.cell(row=curr_row, column=4, value=float(config.target_co_level)).alignment = center_align
        ws.cell(row=curr_row, column=5, value=float(att.direct_attainment or 0)).alignment = center_align
        ws.cell(row=curr_row, column=6, value=float(att.indirect_attainment or 0)).alignment = center_align
        ws.cell(row=curr_row, column=7, value=float(att.final_attainment or 0)).alignment = center_align
        ws.cell(row=curr_row, column=8, value=att.attainment_level).alignment = center_align
        
        achieved_cell = ws.cell(row=curr_row, column=9, value="YES" if att.target_achieved else "NO")
        achieved_cell.alignment = center_align
        if att.target_achieved:
            achieved_cell.fill = PatternFill(start_color="D4EDDA", end_color="D4EDDA", fill_type="solid")
            achieved_cell.font = Font(color="155724", bold=True)
        else:
            achieved_cell.fill = PatternFill(start_color="F8D7DA", end_color="F8D7DA", fill_type="solid")
            achieved_cell.font = Font(color="721C24", bold=True)

        for col_idx in range(1, len(headers) + 1):
            ws.cell(row=curr_row, column=col_idx).border = border

    # Column dimensions
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 45
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 14
    ws.column_dimensions['G'].width = 12
    ws.column_dimensions['H'].width = 18
    ws.column_dimensions['I'].width = 18

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()

def generate_consolidated_marks_report(allocation_id):
    """
    Generates a consolidated marks report displaying student marks across all assessments.
    """
    try:
        allocation = SubjectAllocation.objects.select_related(
            'subject', 'section__batch', 'academic_year'
        ).get(id=allocation_id)
    except SubjectAllocation.DoesNotExist:
        raise ValueError("Invalid allocation")

    students = Student.objects.filter(
        section=allocation.section,
        is_active=True
    ).order_by('roll_number')

    assessments = list(AssessmentType.objects.all().order_by('id'))

    wb = Workbook()
    ws = wb.active
    ws.title = "Consolidated Marks"

    # Styles
    title_font = Font(size=14, bold=True, color="1E4A8A")
    subtitle_font = Font(size=11, italic=True)
    header_fill = PatternFill(start_color="1E4A8A", end_color="1E4A8A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    info_font = Font(bold=True)
    border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    center_align = Alignment(horizontal="center", vertical="center")

    # Header
    cols_count = 3 + len(assessments)
    cols_letter = chr(64 + min(cols_count, 26))
    ws.merge_cells(f'A1:{cols_letter}1')
    ws['A1'] = "SRI ESHWAR COLLEGE OF ENGINEERING (AUTONOMOUS)"
    ws['A1'].font = title_font
    ws['A1'].alignment = center_align

    ws.merge_cells(f'A2:{cols_letter}2')
    ws['A2'] = f"Consolidated Student Mark Sheet — {allocation.subject.subject_code} : {allocation.subject.subject_name}"
    ws['A2'].font = subtitle_font
    ws['A2'].alignment = center_align

    # Info
    ws['A4'] = "Section:"
    ws['B4'] = allocation.section.name
    ws['C4'] = "Batch:"
    ws['D4'] = str(allocation.section.batch)

    ws['A4'].font = info_font
    ws['C4'].font = info_font

    # Headers
    headers = ["S.No", "Roll Number", "Student Name"]
    for at in assessments:
        headers.append(at.code)

    ws.append([]) # Row 5 blank
    header_row = 6
    for col, text in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col, value=text)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = border

    # Prefetch marks
    from apps.marks.models import StudentMark
    marks = StudentMark.objects.filter(subject_allocation=allocation)
    marks_map = {}
    for m in marks:
        marks_map[(m.student_id, m.assessment_type_id)] = m

    # Data
    for idx, student in enumerate(students, 1):
        curr_row = header_row + idx
        ws.cell(row=curr_row, column=1, value=idx).border = border
        ws.cell(row=curr_row, column=2, value=student.roll_number).border = border
        ws.cell(row=curr_row, column=3, value=student.name).border = border
        
        for c_idx, at in enumerate(assessments, 4):
            mark_entry = marks_map.get((student.id, at.id))
            if mark_entry:
                if mark_entry.is_absent:
                    val = "AAA"
                else:
                    val = float(mark_entry.marks_obtained)
            else:
                val = "-"
            
            cell = ws.cell(row=curr_row, column=c_idx, value=val)
            cell.alignment = center_align
            cell.border = border

    # Widths
    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 35
    for c in range(4, cols_count + 1):
        ws.column_dimensions[chr(64 + c)].width = 12

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()

