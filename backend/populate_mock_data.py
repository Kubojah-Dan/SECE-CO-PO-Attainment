

import random
from decimal import Decimal
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.users.models import FacultyProfile, HODProfile, IQACProfile
from apps.departments.models import Department, Programme, Regulation, Batch, Section
from apps.subjects.models import Subject, AcademicYear, CourseOutcome
from apps.allocations.models import SubjectAllocation, AssessmentType, SubjectAssessmentConfig, COAssessmentMapping
from apps.students.models import Student
from apps.marks.models import StudentMark
from apps.attainment.calculators import AttainmentOrchestrator

User = get_user_model()

def create_users():
    print("Creating IQAC user...")
    iqac_user, _ = User.objects.get_or_create(email="iqac@sece.ac.in", defaults={"role": "IQAC", "first_name": "IQAC", "last_name": "Coordinator"})
    iqac_user.set_password("sece@123")
    iqac_user.save()
    IQACProfile.objects.get_or_create(user=iqac_user)

    print("Creating S&H HOD and Faculty...")
    sh_dept = Department.objects.get(code="S&H")
    
    sh_hod_user, _ = User.objects.get_or_create(email="hod_sh@sece.ac.in", defaults={"role": "HOD", "first_name": "Dr. S&H", "last_name": "HOD"})
    sh_hod_user.set_password("sece@123")
    sh_hod_user.save()
    HODProfile.objects.get_or_create(user=sh_hod_user, department=sh_dept)

    for i in range(1, 5):
        fac_user, _ = User.objects.get_or_create(email=f"sh_fac_{i}@sece.ac.in", defaults={"role": "FACULTY", "first_name": "S&H", "last_name": f"Faculty {i}"})
        fac_user.set_password("sece@123")
        fac_user.save()
        FacultyProfile.objects.get_or_create(user=fac_user, department=sh_dept, defaults={"employee_id": f"SH-FAC-{i}"})

@transaction.atomic
def create_academic_structure():
    print("Creating Batches, Sections, and Students...")
    years = [
        {"start": 2022, "end": 2026, "reg": "R2021"},
        {"start": 2023, "end": 2027, "reg": "R2023"},
    ]
    
    for y in years:
        reg, _ = Regulation.objects.get_or_create(name=y["reg"])
        for prog in Programme.objects.all():
            batch, _ = Batch.objects.get_or_create(
                programme=prog, 
                start_year=y["start"], 
                end_year=y["end"],
                defaults={"label": f"{y['start']}-{y['end']}", "regulation": reg}
            )
            
            for sec_name in ["A", "B"]:
                section, _ = Section.objects.get_or_create(batch=batch, name=sec_name, defaults={"strength": 30})
                
                # Create students if none
                if Student.objects.filter(section=section).count() < 30:
                    students = []
                    for i in range(1, 31):
                        roll = f"{y['start']}{prog.department.code[:3].upper()}{sec_name}{i:02d}"
                        students.append(Student(
                            roll_number=roll,
                            name=f"Student {i} {sec_name}",
                            email=f"{roll.lower()}@sece.ac.in",
                            section=section,
                            batch=batch,
                            department=prog.department
                        ))
                    Student.objects.bulk_create(students, ignore_conflicts=True)

@transaction.atomic
def create_curriculum_and_allocations():
    print("Creating Subjects and Allocations...")
    # Make sure we have enough subjects
    for dept in Department.objects.all():
        for sem in [1, 2, 3, 4, 5, 6]:
            sub_code = f"{dept.short_name}{sem}01"
            Subject.objects.get_or_create(
                subject_code=sub_code,
                department=dept,
                defaults={
                    "subject_name": f"{dept.short_name} Core Subject {sem}",
                    "credits": 3,
                    "semester": sem,
                    "subject_type": "Theory"
                }
            )

    ay_23_24, _ = AcademicYear.objects.get_or_create(label="2023-2024", defaults={"start_date": "2023-08-01", "end_date": "2024-05-31", "is_current": False})
    ay_24_25, _ = AcademicYear.objects.get_or_create(label="2024-2025", defaults={"start_date": "2024-08-01", "end_date": "2025-05-31", "is_current": True})
    
    # Assign subjects to faculty
    for section in Section.objects.all():
        # Let's say batch 2022-2026 is in Sem 5 & 6 in 24-25, Sem 3 & 4 in 23-24
        # Just create some random allocations to give faculties subjects.
        dept = section.batch.programme.department
        faculties = list(FacultyProfile.objects.filter(department=dept))
        if not faculties:
            continue
        
        sem_list = [3, 4] if section.batch.start_year == 2022 else [1, 2]
        ay = ay_23_24
        for sem in sem_list:
            subject = Subject.objects.filter(department=dept, semester=sem).first()
            if subject:
                fac = random.choice(faculties)
                alloc, _ = SubjectAllocation.objects.get_or_create(
                    subject=subject, section=section, academic_year=ay,
                    defaults={"faculty": fac}
                )

        sem_list = [5, 6] if section.batch.start_year == 2022 else [3, 4]
        ay = ay_24_25
        for sem in sem_list:
            subject = Subject.objects.filter(department=dept, semester=sem).first()
            if subject:
                fac = random.choice(faculties)
                alloc, _ = SubjectAllocation.objects.get_or_create(
                    subject=subject, section=section, academic_year=ay,
                    defaults={"faculty": fac}
                )

@transaction.atomic
def generate_attainment_data():
    print("Generating COs, Mappings, and Marks...")
    allocations = SubjectAllocation.objects.all()
    cia1 = AssessmentType.objects.get(code="CIA1")
    cia2 = AssessmentType.objects.get(code="CIA2")
    ese = AssessmentType.objects.get(code="ESE")

    for alloc in allocations:
        # Create COs
        cos = []
        for i in range(1, 6):
            co, _ = CourseOutcome.objects.get_or_create(
                subject=alloc.subject,
                co_number=i,
                defaults={
                    "co_code": f"CO{i}",
                    "description": f"Learn concept {i}",
                    "bloom_level": "Apply"
                }
            )
            cos.append(co)
        
        # Configure Assessments
        SubjectAssessmentConfig.objects.get_or_create(subject_allocation=alloc, assessment_type=cia1, defaults={"max_marks": 50})
        SubjectAssessmentConfig.objects.get_or_create(subject_allocation=alloc, assessment_type=cia2, defaults={"max_marks": 50})
        SubjectAssessmentConfig.objects.get_or_create(subject_allocation=alloc, assessment_type=ese, defaults={"max_marks": 100})
        
        # Configure Mappings (Simple)
        if not COAssessmentMapping.objects.filter(subject_allocation=alloc).exists():
            COAssessmentMapping.objects.create(subject_allocation=alloc, assessment_type=cia1, co=cos[0], weightage=50)
            COAssessmentMapping.objects.create(subject_allocation=alloc, assessment_type=cia1, co=cos[1], weightage=50)
            COAssessmentMapping.objects.create(subject_allocation=alloc, assessment_type=cia2, co=cos[2], weightage=50)
            COAssessmentMapping.objects.create(subject_allocation=alloc, assessment_type=cia2, co=cos[3], weightage=50)
            for co in cos:
                COAssessmentMapping.objects.create(subject_allocation=alloc, assessment_type=ese, co=co, weightage=20)

        # Generate Marks
        students = Student.objects.filter(section=alloc.section)
        marks_to_create = []
        
        # Check if marks already exist
        if not StudentMark.objects.filter(subject_allocation=alloc).exists():
            for student in students:
                # Randomize performance per student mostly high and average
                base_perf = random.uniform(0.5, 0.95)
                m1 = min(50, max(0, int(50 * base_perf * random.uniform(0.8, 1.2))))
                m2 = min(50, max(0, int(50 * base_perf * random.uniform(0.8, 1.2))))
                me = min(100, max(0, int(100 * base_perf * random.uniform(0.8, 1.2))))
                
                marks_to_create.append(StudentMark(student=student, subject_allocation=alloc, assessment_type=cia1, marks_obtained=m1, max_marks=50))
                marks_to_create.append(StudentMark(student=student, subject_allocation=alloc, assessment_type=cia2, marks_obtained=m2, max_marks=50))
                marks_to_create.append(StudentMark(student=student, subject_allocation=alloc, assessment_type=ese, marks_obtained=me, max_marks=100))
            
            StudentMark.objects.bulk_create(marks_to_create)

def calculate_attainment():
    print("Triggering Attainment Calculations (this may take a bit)...")
    allocations = SubjectAllocation.objects.all()
    count = 0
    for alloc in allocations:
        try:
            orch = AttainmentOrchestrator(alloc.id)
            orch.run()
            count += 1
            if count % 10 == 0:
                print(f"Calculated {count}/{len(allocations)} allocations...")
        except Exception as e:
            print(f"Failed to calculate for alloc {alloc.id}: {e}")
            pass

create_users()
create_academic_structure()
create_curriculum_and_allocations()
generate_attainment_data()
calculate_attainment()
print("Mock data generation complete!")
