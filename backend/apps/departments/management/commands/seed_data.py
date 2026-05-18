"""
SECE CO-PO Platform — Seed Data Management Command
Populates the database with initial institutional data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --skip-if-exists
    python manage.py seed_data --reset
"""
from django.core.management.base import BaseCommand
from django.db import transaction


# ── Department & Programme Seed Data ─────────────────────────────────────
DEPARTMENTS = [
    {"name": "Computer Science & Engineering (Artificial Intelligence & Machine Learning)",
     "code": "CSE_AIML", "short_name": "CSE(AI&ML)"},
    {"name": "Artificial Intelligence & Data Science",
     "code": "AIDS", "short_name": "AIDS"},
    {"name": "Computer Science & Engineering",
     "code": "CSE", "short_name": "CSE"},
    {"name": "Computer & Communication Engineering",
     "code": "CCE", "short_name": "CCE"},
    {"name": "Computer Science & Business Systems",
     "code": "CSBS", "short_name": "CSBS"},
    {"name": "Computer Science & Engineering (Cyber Security)",
     "code": "CSE_CY", "short_name": "CSE(CY)"},
    {"name": "Electrical & Electronics Engineering",
     "code": "EEE", "short_name": "EEE"},
    {"name": "Electronics & Communication Engineering (VLSI Design)",
     "code": "VLSI", "short_name": "VLSI"},
    {"name": "Mechanical Engineering",
     "code": "MECH", "short_name": "MECH"},
    {"name": "Electronics & Communication Engineering",
     "code": "ECE", "short_name": "ECE"},
    {"name": "Information Technology",
     "code": "IT", "short_name": "IT"},
]

# NBA Standard POs — same for all B.E. programmes (Section 4.3 of Research1.md)
NBA_POs = [
    (1, "Engineering knowledge: Apply knowledge of mathematics, science, engineering fundamentals, and engineering specialisation to the solution of complex engineering problems."),
    (2, "Problem analysis: Identify, formulate, research literature and analyse complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences and engineering sciences."),
    (3, "Design/development of solutions: Design solutions for complex engineering problems and design system components or processes that meet specified needs with appropriate consideration for public health and safety, cultural, societal, and environmental considerations."),
    (4, "Conduct investigations of complex problems using research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of information to provide valid conclusions."),
    (5, "Modern tool usage: Create, select and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modelling to complex engineering activities with an understanding of the limitations."),
    (6, "The engineer and society: Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to professional engineering practice."),
    (7, "Environment and sustainability: Understand the impact of professional engineering solutions in societal and environmental contexts and demonstrate knowledge of and need for sustainable development."),
    (8, "Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of engineering practice."),
    (9, "Individual and team work: Function effectively as an individual, and as a member or leader in diverse teams and in multidisciplinary settings."),
    (10, "Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large, such as being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions."),
    (11, "Project management and finance: Demonstrate knowledge and understanding of engineering and management principles and apply these to one's own work, as a member and leader in a team, to manage projects and in multidisciplinary environments."),
    (12, "Life-long learning: Recognise the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change."),
]

# Assessment Types (from Section 4.2 INSERT statements)
ASSESSMENT_TYPES = [
    {"code": "CIA1", "name": "CIA 1", "category": "INTERNAL", "default_max_marks": 50, "weightage_percent": 10, "display_order": 1},
    {"code": "CIA2", "name": "CIA 2", "category": "INTERNAL", "default_max_marks": 50, "weightage_percent": 10, "display_order": 2},
    {"code": "CIA3", "name": "CIA 3", "category": "INTERNAL", "default_max_marks": 50, "weightage_percent": 10, "display_order": 3},
    {"code": "ESE", "name": "End Semester Exam", "category": "EXTERNAL", "default_max_marks": 100, "weightage_percent": 60, "display_order": 4},
    {"code": "QUIZ", "name": "Quiz", "category": "CONTINUOUS", "default_max_marks": 10, "weightage_percent": 5, "display_order": 5},
    {"code": "ASSIGN", "name": "Assignment", "category": "CONTINUOUS", "default_max_marks": 10, "weightage_percent": 5, "display_order": 6},
    {"code": "PROJ_R1", "name": "Project Review 1", "category": "PROJECT", "default_max_marks": 50, "weightage_percent": None, "display_order": 7},
    {"code": "PROJ_R2", "name": "Project Review 2", "category": "PROJECT", "default_max_marks": 50, "weightage_percent": None, "display_order": 8},
    {"code": "PROJ_R3", "name": "Project Review 3", "category": "PROJECT", "default_max_marks": 50, "weightage_percent": None, "display_order": 9},
    {"code": "PROJ_FINAL", "name": "Final Review", "category": "PROJECT", "default_max_marks": 100, "weightage_percent": None, "display_order": 10},
    {"code": "PRESENTATION", "name": "Presentation", "category": "CONTINUOUS", "default_max_marks": 50, "weightage_percent": None, "display_order": 11},
]


# ── Regulation Seed Data ────────────────────────────────────────────────
REGULATIONS = [
    {
        "name": "R2021",
        "description": "Anna University Regulation 2021",
        "rules": {
            "cia_weightage": 40,
            "ese_weightage": 60,
            "passing_marks": 50,
            "attendance_threshold": 75,
            "cia_best_of": 2,
        }
    },
    {
        "name": "R2023",
        "description": "Anna University Regulation 2023",
        "rules": {
            "cia_weightage": 50,
            "ese_weightage": 50,
            "passing_marks": 50,
            "attendance_threshold": 75,
            "cia_best_of": 2,
        }
    }
]


class Command(BaseCommand):
    help = 'Seed the database with initial SECE institutional data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-if-exists',
            action='store_true',
            help='Skip seeding if data already exists'
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset existing seed data before reseeding (CAUTION)'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.departments.models import College, Department, Programme, ProgramOutcome, Regulation
        from apps.allocations.models import AssessmentType
        from apps.attainment.models import AttainmentConfig

        if options['skip_if_exists']:
            if College.objects.exists() and Regulation.objects.exists():
                self.stdout.write(self.style.WARNING('⚡ Seed data already exists. Skipping.'))
                return

        self.stdout.write(self.style.MIGRATE_HEADING('\n🌱 Seeding SECE CO-PO Platform...\n'))

        # ── 0. Regulations ────────────────────────────────────────────
        self.stdout.write('  📜 Seeding regulations...')
        for reg_data in REGULATIONS:
            reg, created = Regulation.objects.get_or_create(
                name=reg_data['name'],
                defaults={
                    'description': reg_data['description'],
                    'academic_rules': reg_data['rules'],
                }
            )
            action = 'Created' if created else 'Found'
            self.stdout.write(f'    ✓ {action} regulation: {reg.name}')

        # Get R2023 for default assignment
        latest_reg = Regulation.objects.get(name='R2023')

        # ── 1. College ────────────────────────────────────────────────
        college, created = College.objects.get_or_create(
            code='SECE',
            defaults={
                'name': 'Sri Eshwar College of Engineering',
                'address': 'Kondampatti, Kinathukadavu, Coimbatore — 641 202',
                'established_year': 2008,
                'accreditation_status': 'NBA Accredited',
                'website': 'https://www.sece.ac.in',
            }
        )
        action = 'Created' if created else 'Found'
        self.stdout.write(f'  ✓ {action} college: {college.name}')

        # ── 2. Departments ────────────────────────────────────────────
        self.stdout.write('\n  📚 Seeding departments...')
        for dept_data in DEPARTMENTS:
            dept, created = Department.objects.get_or_create(
                college=college,
                code=dept_data['code'],
                defaults={
                    'name': dept_data['name'],
                    'short_name': dept_data['short_name'],
                }
            )
            action = '  + Created' if created else '  ~ Found'
            self.stdout.write(f"{action}: {dept.short_name}")

            # ── 3. Programme per department ───────────────────────────
            programme, _ = Programme.objects.get_or_create(
                department=dept,
                name=f"B.E. {dept_data['name']}",
                defaults={
                    'degree_type': 'UG',
                    'duration_years': 4,
                    'total_semesters': 8,
                    'regulation': latest_reg,
                }
            )

            # ── 4. NBA POs per programme ──────────────────────────────
            for po_num, po_desc in NBA_POs:
                ProgramOutcome.objects.get_or_create(
                    programme=programme,
                    po_number=po_num,
                    category='PO',
                    defaults={
                        'po_code': f'PO{po_num}',
                        'description': po_desc,
                    }
                )

            self.stdout.write(f"    → Created programme + 12 POs for {dept.short_name}")

        # ── 5. Assessment Types ───────────────────────────────────────
        self.stdout.write('\n  📋 Seeding assessment types...')
        for at_data in ASSESSMENT_TYPES:
            at, created = AssessmentType.objects.get_or_create(
                code=at_data['code'],
                defaults={
                    'name': at_data['name'],
                    'category': at_data['category'],
                    'default_max_marks': at_data['default_max_marks'],
                    'weightage_percent': at_data['weightage_percent'],
                    'display_order': at_data['display_order'],
                }
            )
            action = '+' if created else '~'
            self.stdout.write(f"  {action} {at.name} ({at.code})")

        # ── 6. Global Attainment Config ───────────────────────────────
        self.stdout.write('\n  ⚙️  Creating global attainment config...')
        AttainmentConfig.objects.get_or_create(
            department__isnull=True,
            defaults={
                'threshold_marks_pct': 60,
                'level3_student_pct': 70,
                'level2_student_pct': 60,
                'level1_student_pct': 50,
                'direct_weightage': 80,
                'indirect_weightage': 20,
                'target_co_level': 2,
                'cia_best_of': 2,
            }
        )

        # ── 7. Super Admin User ───────────────────────────────────────
        self.stdout.write('\n  👤 Creating super admin...')
        from apps.authentication.models import User
        admin_email = 'admin@sece.ac.in'
        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                email=admin_email,
                password='SECE@Admin2024!',
                first_name='Super',
                last_name='Admin',
                role='admin',
            )
            self.stdout.write(
                self.style.SUCCESS(f'  + Created super admin: {admin_email} / SECE@Admin2024!')
            )
            self.stdout.write(
                self.style.WARNING('  ⚠️  Change this password immediately after first login!')
            )
        else:
            self.stdout.write(f'  ~ Admin user already exists: {admin_email}')

        # ── 8. Academic Year ──────────────────────────────────────────
        from apps.subjects.models import AcademicYear
        AcademicYear.objects.get_or_create(
            label='2024-25',
            defaults={
                'is_current': True,
            }
        )
        self.stdout.write('\n  📅 Created academic year 2024-25 (current)')

        # ── Done ──────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(
            '\n✅ Seeding complete!\n'
            f'   • {len(DEPARTMENTS)} departments\n'
            f'   • {len(DEPARTMENTS)} programmes\n'
            f'   • {len(DEPARTMENTS) * 12} program outcomes (POs)\n'
            f'   • {len(ASSESSMENT_TYPES)} assessment types\n'
            '   • 1 global attainment config\n'
            '   • 1 admin user (admin@sece.ac.in)\n'
        ))
