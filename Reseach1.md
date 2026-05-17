# 🎓 CO-PO Attainment Web Application
## Master Blueprint — Sri Eshwar College of Engineering (SECE)
### Comprehensive Research, Design & Implementation Guide

---

> **Project Codename:** SECE-COPO  
> **Target Timeline:** 10–15 Days to Production  
> **Scope:** Entire College — All Departments, All Roles  
> **Purpose:** Centralized CO-PO Attainment Management, NBA/NAAC Accreditation Support

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack — Final Recommendations](#3-technology-stack--final-recommendations)
4. [Database Design — Complete Schema](#4-database-design--complete-schema)
5. [CO-PO Calculation Engine](#5-co-po-calculation-engine)
6. [API Design — Full Endpoint Map](#6-api-design--full-endpoint-map)
7. [UI/UX Design System](#7-uiux-design-system)
8. [Module-by-Module Implementation Plan](#8-module-by-module-implementation-plan)
9. [Excel Integration Strategy](#9-excel-integration-strategy)
10. [Report Generation System](#10-report-generation-system)
11. [Security Architecture](#11-security-architecture)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [10–15 Day Development Sprint Plan](#13-1015-day-development-sprint-plan)
14. [College Assets Required](#14-college-assets-required)
15. [Accreditation Alignment (NBA/NAAC)](#15-accreditation-alignment-nbanaac)
16. [Post-Launch Maintenance Plan](#16-post-launch-maintenance-plan)

---

## 1. EXECUTIVE SUMMARY

### What This System Is

The **SECE CO-PO Attainment Platform** is a full-stack, role-aware, multi-department web application that automates the most time-intensive part of academic compliance work: **Course Outcome (CO) and Program Outcome (PO) attainment tracking**. It replaces scattered Excel sheets, manual calculations, and paper-based reporting with a single, centralized, browser-accessible platform designed exclusively around how Sri Eshwar College of Engineering operates.

### Why It Matters

NBA and NAAC accreditation audits require precise CO-PO mapping evidence. Currently, every faculty member maintains their own Excel files, HODs manually consolidate data, and IQAC coordinates with multiple departments at audit time — a process that takes weeks and introduces errors. This system **eliminates that overhead entirely**.

### Core Value Propositions

| Traditional Process | With SECE-COPO Platform |
|---|---|
| Faculty manually calculates CO attainment in Excel | System auto-calculates instantly on mark entry |
| HOD consolidates 20+ Excel files per semester | One click to view department-wide attainment |
| IQAC requests reports from all departments | Live dashboards and one-click NBA report export |
| Inconsistent CO-PO mapping across faculty | Enforced mapping templates per department |
| Data loss risk (local files) | Centralized, backed-up database |
| Hours spent formatting NBA reports | Pre-built NBA-format report generation |

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECE-COPO PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │   ADMIN UI   │    │   HOD UI     │    │  FACULTY UI  │      │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│          │                   │                    │               │
│          └───────────────────┼────────────────────┘               │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │   React.js SPA     │                        │
│                    │  (Vite + TailwindCSS)                       │
│                    └─────────┬──────────┘                        │
│                              │  HTTPS / REST                     │
│                    ┌─────────▼──────────┐                        │
│                    │   Django REST API  │                        │
│                    │  (DRF + JWT Auth)  │                        │
│                    └─────────┬──────────┘                        │
│                              │                                    │
│         ┌────────────────────┼────────────────┐                  │
│         │                    │                │                  │
│  ┌──────▼──────┐    ┌────────▼───────┐  ┌────▼──────┐          │
│  │ PostgreSQL  │    │  Redis Cache   │  │  File     │          │
│  │  Database  │    │  (Sessions/    │  │  Storage  │          │
│  │            │    │   Rate Limit)  │  │  (Excel/  │          │
│  └────────────┘    └────────────────┘  │  Reports) │          │
│                                         └───────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Architecture Decisions & Rationale

**Why Django (not Node.js)?**
- Django's ORM handles complex relational queries needed for CO-PO calculations with far less code
- Django REST Framework (DRF) provides battle-tested authentication, pagination, and serialization
- Python's `pandas` and `openpyxl` libraries are industry-standard for Excel processing
- Django's admin panel provides a free, powerful data management interface for college IT staff
- Faster to build correct and secure in the 10–15 day window

**Why PostgreSQL (not MySQL)?**
- Superior JSON support for flexible CO-PO mapping configurations
- Better performance on complex aggregation queries (attainment calculations)
- `ARRAY` and `JSONB` types eliminate need for extra junction tables in some cases
- Strong data integrity with transactions

**Why React + Vite (not plain HTML)?**
- The dashboard and data entry interfaces require reactive, real-time UI updates
- Component reusability across Admin/HOD/Faculty/IQAC views
- Vite gives instant hot-reload, making development faster within time constraints

**Why Redis?**
- Session caching for concurrent multi-department access
- Rate limiting to prevent Excel upload abuse
- Caching attainment calculations (expensive queries run once, served instantly to multiple users)

### 2.3 Deployment Architecture

```
Internet
    │
    ▼
[Nginx Reverse Proxy]
    ├── /api/*  →  [Django Gunicorn Workers x4]
    └── /*      →  [React Static Build]
                        │
                        ▼
                [PostgreSQL DB Server]
                [Redis Cache Server]
                [File Storage Volume]
```

---

## 3. TECHNOLOGY STACK — FINAL RECOMMENDATIONS

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| React.js | 18.x | Core UI framework |
| Vite | 5.x | Build tool (fast dev + HMR) |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router | 6.x | Client-side routing |
| Tanstack Query | 5.x | Server state, caching, API calls |
| React Hook Form | 7.x | Form management + validation |
| Zod | 3.x | Schema validation |
| Recharts | 2.x | Charts and analytics |
| Lucide React | latest | Icon system |
| XLSX (SheetJS) | 0.20.x | Client-side Excel preview |
| Framer Motion | 11.x | Animations |
| React Toastify | 10.x | Notifications |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12 | Language |
| Django | 5.x | Web framework |
| Django REST Framework | 3.15 | API layer |
| djangorestframework-simplejwt | 5.x | JWT authentication |
| django-cors-headers | 4.x | CORS for React frontend |
| celery | 5.x | Background tasks (Excel processing) |
| redis-py | 5.x | Redis connection |
| pandas | 2.x | Excel processing + calculations |
| openpyxl | 3.x | Excel read/write |
| reportlab | 4.x | PDF report generation |
| Pillow | 10.x | Image processing (logo embedding) |
| django-filter | 23.x | API filtering |
| whitenoise | 6.x | Static file serving |
| gunicorn | 21.x | Production WSGI server |

### Database & Infrastructure
| Tool | Purpose |
|---|---|
| PostgreSQL 16 | Primary database |
| Redis 7 | Cache + task queue |
| Nginx 1.26 | Reverse proxy + static files |
| Docker + Docker Compose | Containerization |
| GitHub Actions | CI/CD pipeline |

---

## 4. DATABASE DESIGN — COMPLETE SCHEMA

### 4.1 Entity Relationship Overview

```
College
  └── Department (many)
        └── Programme (many)  [CSE(AI&ML), AIDS, CSE, CCE, CSBS, CSE(CY), EEE, VLSI, MECH, ECE, IT]
              └── ProgramOutcome (12 POs per programme)
              └── Batch (many)  [2021-2025, 2022-2026, etc.]
                    └── Section (many)  [A, B, C]
                          └── StudentEnrollment (many)

User
  ├── AdminProfile
  ├── HODProfile → Department
  ├── FacultyProfile → Department
  └── IQACProfile

Subject
  ├── SubjectCO (many)
  │     └── CO_PO_Mapping (CO → POs with correlation level)
  ├── SubjectAssessmentConfig (which assessments enabled)
  └── SubjectAllocation → Faculty + Section + Semester

AssessmentRecord
  └── StudentMark → Student + Assessment

AttainmentResult (Computed & Cached)
  ├── CO_Attainment
  └── PO_Attainment
```

### 4.2 Complete Table Definitions

```sql
-- ============================================================
-- CORE ENTITIES
-- ============================================================

CREATE TABLE college (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    logo_url VARCHAR(500),
    established_year INTEGER,
    accreditation_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE department (
    id SERIAL PRIMARY KEY,
    college_id INTEGER REFERENCES college(id),
    name VARCHAR(200) NOT NULL,          -- "Artificial Intelligence & Machine Learning"
    code VARCHAR(20) NOT NULL,           -- "AI_ML"
    short_name VARCHAR(50),              -- "AI&ML"
    hod_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(college_id, code)
);

CREATE TABLE programme (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES department(id),
    name VARCHAR(200) NOT NULL,          -- "B.E. Artificial Intelligence & Machine Learning"
    degree_type VARCHAR(50) NOT NULL,    -- "UG" | "PG"
    duration_years INTEGER DEFAULT 4,
    total_semesters INTEGER DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- PROGRAM OUTCOMES (POs) — Per Programme
-- ============================================================

CREATE TABLE program_outcome (
    id SERIAL PRIMARY KEY,
    programme_id INTEGER REFERENCES programme(id),
    po_number INTEGER NOT NULL,          -- 1 to 12 (NBA standard)
    po_code VARCHAR(10) NOT NULL,        -- "PO1", "PO2"
    description TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'PO',   -- "PO" | "PSO"
    UNIQUE(programme_id, po_number, category)
);

-- Program Specific Outcomes (PSOs) — 2-3 per programme
CREATE TABLE program_specific_outcome (
    id SERIAL PRIMARY KEY,
    programme_id INTEGER REFERENCES programme(id),
    pso_number INTEGER NOT NULL,
    pso_code VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(programme_id, pso_number)
);

-- ============================================================
-- BATCHES, SECTIONS, STUDENTS
-- ============================================================

CREATE TABLE batch (
    id SERIAL PRIMARY KEY,
    programme_id INTEGER REFERENCES programme(id),
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    label VARCHAR(20),                   -- "2021-2025"
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE section (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batch(id),
    name VARCHAR(10) NOT NULL,           -- "A", "B", "C"
    strength INTEGER DEFAULT 60
);

CREATE TABLE student (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES department(id),
    roll_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    batch_id INTEGER REFERENCES batch(id),
    section_id INTEGER REFERENCES section(id),
    email VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,           -- "admin"|"hod"|"faculty"|"iqac"
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE faculty_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    department_id INTEGER REFERENCES department(id),
    employee_id VARCHAR(50) UNIQUE,
    designation VARCHAR(100),            -- "Assistant Professor"
    qualification VARCHAR(200),
    experience_years INTEGER
);

CREATE TABLE hod_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    department_id INTEGER UNIQUE REFERENCES department(id)
);

CREATE TABLE iqac_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    designation VARCHAR(100)
);

-- ============================================================
-- SUBJECTS & COs
-- ============================================================

CREATE TABLE academic_year (
    id SERIAL PRIMARY KEY,
    label VARCHAR(20) NOT NULL,          -- "2024-25"
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE
);

CREATE TABLE subject (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES department(id),
    subject_code VARCHAR(30) UNIQUE NOT NULL,
    subject_name VARCHAR(300) NOT NULL,
    semester INTEGER NOT NULL,           -- 1 to 8
    credits INTEGER DEFAULT 3,
    subject_type VARCHAR(30) DEFAULT 'THEORY', -- THEORY|LAB|PROJECT|ELECTIVE
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE course_outcome (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subject(id),
    co_number INTEGER NOT NULL,
    co_code VARCHAR(20) NOT NULL,        -- "CO1", "CO2"
    description TEXT NOT NULL,
    bloom_level VARCHAR(50),             -- "Remember"|"Understand"|"Apply"|"Analyze"|"Evaluate"|"Create"
    UNIQUE(subject_id, co_number)
);

-- CO-PO Mapping with correlation levels
CREATE TABLE co_po_mapping (
    id SERIAL PRIMARY KEY,
    co_id INTEGER REFERENCES course_outcome(id),
    po_id INTEGER REFERENCES program_outcome(id),
    correlation_level INTEGER NOT NULL   -- 1 (Low) | 2 (Medium) | 3 (High)
    CHECK (correlation_level IN (1, 2, 3))
);

CREATE TABLE co_pso_mapping (
    id SERIAL PRIMARY KEY,
    co_id INTEGER REFERENCES course_outcome(id),
    pso_id INTEGER REFERENCES program_specific_outcome(id),
    correlation_level INTEGER NOT NULL CHECK (correlation_level IN (1, 2, 3))
);

-- Subject allocation: which faculty teaches which section
CREATE TABLE subject_allocation (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subject(id),
    faculty_id INTEGER REFERENCES faculty_profile(id),
    section_id INTEGER REFERENCES section(id),
    academic_year_id INTEGER REFERENCES academic_year(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(subject_id, section_id, academic_year_id)
);

-- ============================================================
-- ASSESSMENT CONFIGURATION
-- ============================================================

CREATE TABLE assessment_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,    -- "CIA1", "CIA2", "ESE", "QUIZ", "ASSIGN"
    name VARCHAR(100) NOT NULL,          -- "CIA 1", "End Semester Exam"
    category VARCHAR(30) NOT NULL,       -- "INTERNAL"|"EXTERNAL"|"CONTINUOUS"
    default_max_marks DECIMAL(6,2),
    weightage_percent DECIMAL(5,2)       -- e.g., 25.00 for CIA, 50.00 for ESE
);

-- Insert standard assessment types
INSERT INTO assessment_type (code, name, category, default_max_marks, weightage_percent) VALUES
('CIA1', 'CIA 1', 'INTERNAL', 50, 10),
('CIA2', 'CIA 2', 'INTERNAL', 50, 10),
('CIA3', 'CIA 3', 'INTERNAL', 50, 10),
('ESE', 'End Semester Exam', 'EXTERNAL', 100, 60),
('QUIZ', 'Quiz', 'CONTINUOUS', 10, 5),
('ASSIGN', 'Assignment', 'CONTINUOUS', 10, 5),
('PROJ_R1', 'Review 1', 'CONTINUOUS', 50, NULL),
('PROJ_R2', 'Review 2', 'CONTINUOUS', 50, NULL),
('PROJ_R3', 'Review 3', 'CONTINUOUS', 50, NULL),
('PROJ_FINAL', 'Final Review', 'CONTINUOUS', 100, NULL),
('PRESENTATION', 'Presentation', 'CONTINUOUS', 50, NULL);

-- Per-subject assessment config (which are enabled, custom max marks)
CREATE TABLE subject_assessment_config (
    id SERIAL PRIMARY KEY,
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    assessment_type_id INTEGER REFERENCES assessment_type(id),
    is_enabled BOOLEAN DEFAULT TRUE,
    max_marks DECIMAL(6,2) NOT NULL,
    passing_marks DECIMAL(6,2),
    UNIQUE(subject_allocation_id, assessment_type_id)
);

-- CO-Assessment mapping: which COs are tested in which assessment
CREATE TABLE co_assessment_mapping (
    id SERIAL PRIMARY KEY,
    co_id INTEGER REFERENCES course_outcome(id),
    assessment_type_id INTEGER REFERENCES assessment_type(id),
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    weightage DECIMAL(5,2) DEFAULT 100.00  -- % of that assessment covering this CO
);

-- ============================================================
-- MARKS ENTRY
-- ============================================================

CREATE TABLE student_mark (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES student(id),
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    assessment_type_id INTEGER REFERENCES assessment_type(id),
    marks_obtained DECIMAL(6,2) NOT NULL,
    max_marks DECIMAL(6,2) NOT NULL,
    is_absent BOOLEAN DEFAULT FALSE,
    entered_by INTEGER REFERENCES users(id),
    entered_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_allocation_id, assessment_type_id)
);

-- For question-wise CO mapping (granular entry for CIA papers)
CREATE TABLE question_co_mapping (
    id SERIAL PRIMARY KEY,
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    assessment_type_id INTEGER REFERENCES assessment_type(id),
    question_number VARCHAR(10),         -- "Q1a", "Q1b", "Q2"
    co_id INTEGER REFERENCES course_outcome(id),
    max_marks DECIMAL(6,2) NOT NULL
);

CREATE TABLE student_question_mark (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES student(id),
    question_mapping_id INTEGER REFERENCES question_co_mapping(id),
    marks_obtained DECIMAL(6,2) NOT NULL,
    UNIQUE(student_id, question_mapping_id)
);

-- ============================================================
-- ATTAINMENT RESULTS (Computed & Cached)
-- ============================================================

CREATE TABLE co_attainment (
    id SERIAL PRIMARY KEY,
    co_id INTEGER REFERENCES course_outcome(id),
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    -- Direct attainment
    direct_attainment DECIMAL(5,2),
    -- Indirect attainment (from surveys)
    indirect_attainment DECIMAL(5,2),
    -- Final attainment (weighted average)
    final_attainment DECIMAL(5,2),
    attainment_level INTEGER,           -- 1, 2, or 3
    target_attainment DECIMAL(5,2) DEFAULT 60.00,
    target_achieved BOOLEAN,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(co_id, subject_allocation_id)
);

CREATE TABLE po_attainment (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES program_outcome(id),
    section_id INTEGER REFERENCES section(id),
    academic_year_id INTEGER REFERENCES academic_year(id),
    semester INTEGER,
    attainment_value DECIMAL(5,2),
    attainment_level INTEGER,
    target_attainment DECIMAL(5,2) DEFAULT 60.00,
    target_achieved BOOLEAN,
    calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pso_attainment (
    id SERIAL PRIMARY KEY,
    pso_id INTEGER REFERENCES program_specific_outcome(id),
    section_id INTEGER REFERENCES section(id),
    academic_year_id INTEGER REFERENCES academic_year(id),
    attainment_value DECIMAL(5,2),
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SURVEY / INDIRECT ATTAINMENT
-- ============================================================

CREATE TABLE survey_template (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    type VARCHAR(50),                   -- "EXIT_SURVEY"|"COURSE_END"|"ALUMNI"
    questions JSONB,                    -- Array of questions mapped to COs/POs
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE survey_response (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES survey_template(id),
    student_id INTEGER REFERENCES student(id),
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    responses JSONB,
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AUDIT & EXCEL UPLOAD LOGS
-- ============================================================

CREATE TABLE excel_upload_log (
    id SERIAL PRIMARY KEY,
    uploaded_by INTEGER REFERENCES users(id),
    subject_allocation_id INTEGER REFERENCES subject_allocation(id),
    assessment_type_id INTEGER REFERENCES assessment_type(id),
    filename VARCHAR(500),
    status VARCHAR(20),                 -- "PENDING"|"PROCESSING"|"SUCCESS"|"FAILED"
    records_processed INTEGER DEFAULT 0,
    errors JSONB,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_student_mark_student ON student_mark(student_id);
CREATE INDEX idx_student_mark_allocation ON student_mark(subject_allocation_id);
CREATE INDEX idx_student_mark_assessment ON student_mark(assessment_type_id);
CREATE INDEX idx_co_attainment_co ON co_attainment(co_id);
CREATE INDEX idx_co_attainment_allocation ON co_attainment(subject_allocation_id);
CREATE INDEX idx_po_attainment_po ON po_attainment(po_id);
CREATE INDEX idx_subject_allocation_faculty ON subject_allocation(faculty_id);
CREATE INDEX idx_student_roll ON student(roll_number);
CREATE INDEX idx_subject_code ON subject(subject_code);
```

### 4.3 Default Data to Pre-load

```python
# departments.py — Pre-seed on deployment

DEPARTMENTS = [
    {"name": "Computer Science & Engineering (Artificial Intelligence & Machine Learning)", "code": "CSE_AIML", "short_name": "CSE(AI&ML)"},
    {"name": "Artificial Intelligence & Data Science", "code": "AIDS", "short_name": "AIDS"},
    {"name": "Computer Science & Engineering", "code": "CSE", "short_name": "CSE"},
    {"name": "Computer & Communication Engineering", "code": "CCE", "short_name": "CCE"},
    {"name": "Computer Science & Business Systems", "code": "CSBS", "short_name": "CSBS"},
    {"name": "Computer Science & Engineering (Cyber Security)", "code": "CSE_CY", "short_name": "CSE(CY)"},
    {"name": "Electrical & Electronics Engineering", "code": "EEE", "short_name": "EEE"},
    {"name": "Electronics & Communication Engineering (VLSI Design)", "code": "VLSI", "short_name": "VLSI"},
    {"name": "Mechanical Engineering", "code": "MECH", "short_name": "MECH"},
    {"name": "Electronics & Communication Engineering", "code": "ECE", "short_name": "ECE"},
    {"name": "Information Technology", "code": "IT", "short_name": "IT"},
]

# NBA Standard POs (same for all B.E. programmes)
NBA_POs = [
    (1, "Engineering knowledge: Apply knowledge of mathematics, science, engineering fundamentals, and engineering specialisation."),
    (2, "Problem analysis: Identify, formulate, research literature and analyse complex engineering problems."),
    (3, "Design/development of solutions: Design solutions for complex engineering problems."),
    (4, "Conduct investigations of complex problems using research-based knowledge."),
    (5, "Modern tool usage: Create, select and apply appropriate techniques and engineering tools."),
    (6, "The engineer and society: Apply reasoning informed by contextual knowledge."),
    (7, "Environment and sustainability: Understand the impact of professional engineering solutions."),
    (8, "Ethics: Apply ethical principles and commit to professional ethics."),
    (9, "Individual and team work: Function effectively as an individual, and as a member or leader in diverse teams."),
    (10, "Communication: Communicate effectively on complex engineering activities."),
    (11, "Project management and finance: Demonstrate knowledge and understanding of engineering and management principles."),
    (12, "Life-long learning: Recognise the need for and have the preparation and ability to engage in independent life-long learning."),
]
```

---

## 5. CO-PO CALCULATION ENGINE

This is the intellectual heart of the application. All calculations must match NBA-prescribed methodologies precisely.

### 5.1 Attainment Level Definition

NBA defines attainment levels as:

| Level | Criterion |
|---|---|
| Level 3 (High) | ≥ 70% of students scored ≥ threshold (typically 60% of max marks) |
| Level 2 (Medium) | 60–69% of students scored ≥ threshold |
| Level 1 (Low) | 50–59% of students scored ≥ threshold |
| Level 0 (Not Attained) | < 50% of students scored ≥ threshold |

> **Note:** Thresholds and level boundaries are configurable per institution. SECE may use 60% marks threshold and 60%/55%/50% student pass rates. Admin can configure these.

### 5.2 Direct CO Attainment Calculation

```python
# calculation_engine.py

from decimal import Decimal
from django.db import models

class COAttainmentCalculator:
    """
    NBA Method 1: Marks-based CO Attainment
    
    Steps:
    1. For each assessment, determine which COs it covers
    2. Calculate per-student performance on each CO
    3. Find % of students who attained >= threshold on each CO
    4. Map that % to Level 1/2/3
    """
    
    def __init__(self, subject_allocation_id: int, config: dict = None):
        self.allocation_id = subject_allocation_id
        self.threshold_marks_pct = config.get('threshold_marks_pct', 60)  # 60% of max marks
        self.level3_student_pct = config.get('level3_student_pct', 70)    # 70% students
        self.level2_student_pct = config.get('level2_student_pct', 60)
        self.level1_student_pct = config.get('level1_student_pct', 50)
        
    def calculate_co_attainment(self, co_id: int) -> dict:
        """Calculate attainment for a single CO."""
        
        # Step 1: Get all assessments covering this CO
        co_assessments = COAssessmentMapping.objects.filter(
            co_id=co_id,
            subject_allocation_id=self.allocation_id
        ).select_related('assessment_type')
        
        # Step 2: Get all students in this allocation
        students = self._get_students()
        total_students = len(students)
        if total_students == 0:
            return None
        
        # Step 3: Calculate each student's CO performance
        student_co_scores = {}
        
        for student in students:
            weighted_marks = Decimal(0)
            weighted_max = Decimal(0)
            
            for co_assess in co_assessments:
                mark = StudentMark.objects.filter(
                    student=student,
                    subject_allocation_id=self.allocation_id,
                    assessment_type=co_assess.assessment_type,
                    is_absent=False
                ).first()
                
                if mark:
                    # Apply CO weightage within assessment
                    co_weight = co_assess.weightage / 100
                    weighted_marks += mark.marks_obtained * co_weight
                    weighted_max += mark.max_marks * co_weight
            
            if weighted_max > 0:
                student_co_scores[student.id] = (weighted_marks / weighted_max) * 100
        
        # Step 4: Count students who attained threshold
        attained_count = sum(
            1 for score in student_co_scores.values()
            if score >= self.threshold_marks_pct
        )
        
        attainment_pct = (attained_count / total_students) * 100
        
        # Step 5: Determine level
        if attainment_pct >= self.level3_student_pct:
            level = 3
        elif attainment_pct >= self.level2_student_pct:
            level = 2
        elif attainment_pct >= self.level1_student_pct:
            level = 1
        else:
            level = 0
        
        return {
            'co_id': co_id,
            'attainment_percentage': round(attainment_pct, 2),
            'attainment_level': level,
            'students_attained': attained_count,
            'total_students': total_students,
            'student_scores': student_co_scores
        }
    
    def calculate_all_cos(self) -> list:
        cos = CourseOutcome.objects.filter(
            subject__subjectallocation__id=self.allocation_id
        )
        return [self.calculate_co_attainment(co.id) for co in cos]


class POAttainmentCalculator:
    """
    PO Attainment from CO Attainment using CO-PO mapping.
    
    Formula:
    PO_attainment = Σ(CO_level × correlation_strength) / Σ(correlation_strength)
    where correlation_strength = number of COs with that correlation level × that level value
    """
    
    def calculate_po_attainment(self, po_id: int, co_attainments: list) -> dict:
        mappings = CO_PO_Mapping.objects.filter(po_id=po_id)
        
        if not mappings.exists():
            return None
        
        weighted_sum = Decimal(0)
        weight_total = Decimal(0)
        
        for mapping in mappings:
            co_result = next(
                (r for r in co_attainments if r['co_id'] == mapping.co_id),
                None
            )
            if co_result:
                level = Decimal(co_result['attainment_level'])
                corr = Decimal(mapping.correlation_level)
                weighted_sum += level * corr
                weight_total += corr
        
        if weight_total == 0:
            return None
        
        po_attainment = weighted_sum / weight_total
        
        return {
            'po_id': po_id,
            'attainment_value': round(po_attainment, 2),
            'attainment_level': round(po_attainment),  # Nearest integer
        }
    
    def calculate_all_pos(self, programme_id: int, co_attainments: list) -> list:
        pos = ProgramOutcome.objects.filter(programme_id=programme_id)
        return [self.calculate_po_attainment(po.id, co_attainments) for po in pos]


class AttainmentReport:
    """Orchestrator — calculates and persists everything."""
    
    def generate_full_report(self, subject_allocation_id: int):
        # 1. Calculate CO attainments
        co_calc = COAttainmentCalculator(subject_allocation_id)
        co_results = co_calc.calculate_all_cos()
        
        # 2. Save CO attainments
        for result in co_results:
            COAttainment.objects.update_or_create(
                co_id=result['co_id'],
                subject_allocation_id=subject_allocation_id,
                defaults={
                    'direct_attainment': result['attainment_percentage'],
                    'attainment_level': result['attainment_level'],
                    'target_achieved': result['attainment_level'] >= 2
                }
            )
        
        # 3. Calculate PO attainments
        allocation = SubjectAllocation.objects.get(id=subject_allocation_id)
        programme = allocation.section.batch.programme
        po_calc = POAttainmentCalculator()
        po_results = po_calc.calculate_all_pos(programme.id, co_results)
        
        # 4. Save PO attainments
        for result in po_results:
            if result:
                POAttainment.objects.update_or_create(
                    po_id=result['po_id'],
                    section_id=allocation.section_id,
                    academic_year_id=allocation.academic_year_id,
                    defaults={'attainment_value': result['attainment_value']}
                )
        
        return {'co_results': co_results, 'po_results': po_results}
```

### 5.3 Attainment Thresholds Configuration

Admin can configure the following per department/programme:

```python
ATTAINMENT_CONFIG = {
    "threshold_marks_percentage": 60,    # Students need ≥60% to "attain" a CO
    "level3_pass_percentage": 70,         # ≥70% students pass → Level 3
    "level2_pass_percentage": 60,         # 60-69% → Level 2  
    "level1_pass_percentage": 50,         # 50-59% → Level 1
    "direct_weightage": 80,               # Direct attainment = 80%
    "indirect_weightage": 20,             # Indirect (survey) = 20%
    "target_co_attainment_level": 2,     # Target level = 2 or above
    "cia_weightage": 50,                  # CIA contributes 50% to internal
    "ese_weightage": 50,                  # ESE contributes 50%
}
```

### 5.4 CIA Internal Marks Normalization

```python
def normalize_cia_marks(cia1, cia2, cia3, best_of=2):
    """
    Most colleges take best of 2 CIAs out of 3.
    Normalizes to a common scale (e.g., out of 50).
    """
    marks = [m for m in [cia1, cia2, cia3] if m is not None]
    marks.sort(reverse=True)
    best = marks[:best_of]
    return sum(best) / len(best)
```

---

## 6. API DESIGN — FULL ENDPOINT MAP

### 6.1 Authentication Endpoints

```
POST   /api/auth/login/           → { email, password } → { access_token, refresh_token, user }
POST   /api/auth/refresh/         → { refresh_token } → { access_token }
POST   /api/auth/logout/          → Invalidate token
GET    /api/auth/me/              → Current user profile
PATCH  /api/auth/change-password/ → { old_password, new_password }
```

### 6.2 Admin Endpoints

```
# Department Management
GET    /api/admin/departments/
POST   /api/admin/departments/
PATCH  /api/admin/departments/{id}/
DELETE /api/admin/departments/{id}/

# User Management
GET    /api/admin/users/                        → List all users (filterable by role, dept)
POST   /api/admin/users/                        → Create user
PATCH  /api/admin/users/{id}/
DELETE /api/admin/users/{id}/
POST   /api/admin/users/bulk-create/            → Import users from Excel
POST   /api/admin/users/reset-password/{id}/

# Academic Year
GET    /api/admin/academic-years/
POST   /api/admin/academic-years/
PATCH  /api/admin/academic-years/{id}/set-current/

# System Config
GET    /api/admin/config/attainment/
PATCH  /api/admin/config/attainment/

# Analytics
GET    /api/admin/analytics/college-overview/   → All dept CO-PO summary
GET    /api/admin/analytics/department/{dept_id}/
```

### 6.3 HOD Endpoints

```
# Department Overview
GET    /api/hod/dashboard/
GET    /api/hod/subjects/                       → Subjects in dept this semester
GET    /api/hod/faculty/                        → Faculty in dept
GET    /api/hod/co-attainment/                 → All CO attainments in dept
GET    /api/hod/po-attainment/                 → PO attainment matrix for dept
GET    /api/hod/attainment-comparison/         → Semester-wise comparison

# Reports
GET    /api/hod/reports/department-summary/
GET    /api/hod/reports/co-po-matrix/
GET    /api/hod/reports/nba-format/
POST   /api/hod/reports/export/                → { format: "excel"|"pdf", type: "..." }
```

### 6.4 Faculty Endpoints

```
# My Subjects
GET    /api/faculty/my-subjects/               → Subjects allocated this year
GET    /api/faculty/subjects/{alloc_id}/       → Subject detail

# Subject Setup
GET    /api/faculty/subjects/{alloc_id}/cos/
POST   /api/faculty/subjects/{alloc_id}/cos/
PATCH  /api/faculty/subjects/{alloc_id}/cos/{co_id}/
DELETE /api/faculty/subjects/{alloc_id}/cos/{co_id}/

GET    /api/faculty/subjects/{alloc_id}/co-po-mapping/
POST   /api/faculty/subjects/{alloc_id}/co-po-mapping/
PUT    /api/faculty/subjects/{alloc_id}/co-po-mapping/  → Bulk update

GET    /api/faculty/subjects/{alloc_id}/assessments/
PATCH  /api/faculty/subjects/{alloc_id}/assessments/{type_id}/  → enable/disable, set max marks

# Student Management
GET    /api/faculty/subjects/{alloc_id}/students/
POST   /api/faculty/subjects/{alloc_id}/students/upload/  → Excel upload

# Marks Entry
GET    /api/faculty/subjects/{alloc_id}/marks/{assessment_type}/
POST   /api/faculty/subjects/{alloc_id}/marks/
PUT    /api/faculty/subjects/{alloc_id}/marks/bulk/
POST   /api/faculty/subjects/{alloc_id}/marks/upload-excel/   → Excel marks upload
GET    /api/faculty/subjects/{alloc_id}/marks/download-template/ → Excel template

# Attainment
POST   /api/faculty/subjects/{alloc_id}/calculate-attainment/
GET    /api/faculty/subjects/{alloc_id}/co-attainment/
GET    /api/faculty/subjects/{alloc_id}/po-attainment/

# Reports
GET    /api/faculty/subjects/{alloc_id}/reports/co-attainment-report/
GET    /api/faculty/subjects/{alloc_id}/reports/marks-summary/
POST   /api/faculty/subjects/{alloc_id}/reports/export/
```

### 6.5 IQAC Endpoints

```
GET    /api/iqac/college-summary/              → College-wide attainment overview
GET    /api/iqac/department-comparison/        → All depts side by side
GET    /api/iqac/po-attainment-college/        → PO attainment across all programmes
GET    /api/iqac/nba-report/                   → Full NBA self-study report data
GET    /api/iqac/naac-criterion3/              → NAAC Criterion 3 data
POST   /api/iqac/export-accreditation-report/ → { format, academic_year }
```

---

## 7. UI/UX DESIGN SYSTEM

### 7.1 Brand Identity — SECE Visual Language

**Design Philosophy:** *Institutional Precision with Academic Warmth*
The interface should feel like a premium academic platform — trustworthy, organized, with clear hierarchy. Not corporate SaaS. Not generic admin panel. It should feel like it was specifically built for Sri Eshwar College of Engineering.

**Primary Color Palette:**
```css
:root {
  /* SECE Brand Colors — aligned with institutional identity */
  --primary-900: #0A1628;     /* Deep Navy — Authority, Trust */
  --primary-800: #0D1F3C;
  --primary-700: #102952;
  --primary-600: #1A3A6B;
  --primary-500: #1E4A8A;     /* SECE Primary Blue */
  --primary-400: #2563EB;
  --primary-300: #60A5FA;
  --primary-200: #BFDBFE;
  --primary-100: #EFF6FF;

  /* Accent — Innovation & Action */
  --accent-600: #D97706;      /* SECE Gold/Amber */
  --accent-500: #F59E0B;
  --accent-400: #FCD34D;
  --accent-100: #FFFBEB;

  /* Semantic Colors */
  --success: #059669;
  --success-light: #ECFDF5;
  --warning: #D97706;
  --warning-light: #FFFBEB;
  --danger: #DC2626;
  --danger-light: #FEF2F2;

  /* Attainment Level Colors */
  --level-3: #059669;         /* High — Green */
  --level-2: #2563EB;         /* Medium — Blue */
  --level-1: #F59E0B;         /* Low — Amber */
  --level-0: #DC2626;         /* Not Attained — Red */

  /* Neutrals */
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-500: #6B7280;
  --gray-700: #374151;
  --gray-900: #111827;

  /* Surface */
  --surface-primary: #FFFFFF;
  --surface-secondary: #F9FAFB;
  --surface-tertiary: #F3F4F6;
  --border: #E5E7EB;
}
```

**Typography:**
```css
/* Display Font — For headings, hero text */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');

/* UI Font — For body, labels, data */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

/* Monospace — For numbers, roll numbers, codes */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  --font-display: 'Playfair Display', serif;
  --font-ui: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Usage */
h1, h2 { font-family: var(--font-display); }
body, button, input { font-family: var(--font-ui); }
.roll-number, .marks-cell, .percentage { font-family: var(--font-mono); }
```

### 7.2 Component Library Specifications

#### Attainment Level Badge
```jsx
// AttainmentBadge.jsx
const levelConfig = {
  3: { label: 'Level 3', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
  2: { label: 'Level 2', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  1: { label: 'Level 1', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  0: { label: 'Not Attained', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
};

export const AttainmentBadge = ({ level, percentage }) => (
  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${levelConfig[level].color}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${levelConfig[level].dot}`} />
    {levelConfig[level].label}
    {percentage !== undefined && <span className="font-mono ml-1">{percentage}%</span>}
  </div>
);
```

#### CO-PO Mapping Matrix (Heatmap Table)
```jsx
// COPOMatrix.jsx — The signature component of the application
export const COPOMatrix = ({ cos, pos, mappings }) => {
  const getLevel = (coId, poId) => {
    const m = mappings.find(x => x.co_id === coId && x.po_id === poId);
    return m ? m.correlation_level : 0;
  };
  
  const cellStyles = {
    0: 'bg-gray-50 text-gray-300',
    1: 'bg-blue-50 text-blue-600 font-semibold',
    2: 'bg-blue-200 text-blue-800 font-bold',
    3: 'bg-blue-600 text-white font-bold',
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="px-4 py-3 text-left font-semibold">CO</th>
            {pos.map(po => (
              <th key={po.id} className="px-3 py-3 text-center font-mono text-xs w-12">{po.po_code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cos.map((co, i) => (
            <tr key={co.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-2.5 font-medium text-gray-700 font-mono">{co.co_code}</td>
              {pos.map(po => {
                const level = getLevel(co.id, po.id);
                return (
                  <td key={po.id} className="px-3 py-2.5 text-center">
                    <span className={`inline-block w-8 h-8 rounded-lg flex items-center justify-center text-sm ${cellStyles[level]}`}>
                      {level || '-'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 7.3 Page-by-Page UI Wireframe Descriptions

#### Login Page
- Full-screen split layout: Left = SECE college image/campus photo (parallax), Right = login form
- SECE logo + "CO-PO Attainment Portal" heading
- Role selector (tab pills): Admin | HOD | Faculty | IQAC
- Email + Password fields with show/hide
- Navy blue CTA button "Sign In"
- Footer: "Sri Eshwar College of Engineering — Coimbatore"

#### Faculty Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ [SECE Logo]  CO-PO Portal     [Dept: CSE(AI&ML)]  [Dr. Name ▼]   │
├────────────────────────────────────────────────────────────────-┤
│ OVERVIEW                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │Subjects  │ │Students  │ │Attainment│ │Pending   │           │
│ │   5      │ │  247     │ │  78%     │ │Marks: 2  │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│ MY SUBJECTS — Sem 5 | 2024-25                                   │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ U23AI501 Machine Learning      [Enter Marks] [Attainment]│    │
│ │ Status: CIA1 ✓  CIA2 ✓  CIA3 ✗  Quiz ✓  Assign ✓  ESE ✗ │    │
│ │ CO Attainment: CO1(L3) CO2(L2) CO3(L2) CO4(L1) CO5(L3) │    │
│ └──────────────────────────────────────────────────────────┘    │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ U23AI502 Deep Learning        [Enter Marks] [Attainment] │    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### Marks Entry Page (The Most-Used Screen)
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back  |  Machine Learning — CIA 1 Marks Entry                 │
│          Section A  |  Students: 62  |  Max Marks: 50           │
├─────────────────────────────────────────────────────────────────┤
│ [📤 Upload Excel]  [📥 Download Template]  [💾 Save All]        │
├──────┬─────────────────────────────┬──────┬──────────┬──────────┤
│  S.No│ Roll Number    │ Name       │ Marks│  Status  │  Action  │
├──────┼────────────────┼────────────┼──────┼──────────┼──────────┤
│  1   │ 23AI001        │ Aarav S    │ [45] │  ✓       │          │
│  2   │ 23AI002        │ Priya R    │ [  ] │  Pending │          │
│  3   │ 23AI003        │ Karthik M  │  AB  │  Absent  │[Mark AB] │
├──────┴────────────────┴────────────┴──────┴──────────┴──────────┤
│  Progress: 45/62 entered  [  ==================  ] 73%          │
└─────────────────────────────────────────────────────────────────┘
```

#### CO Attainment Report Page
```
┌─────────────────────────────────────────────────────────────────┐
│ Machine Learning — CO Attainment Report  [Export PDF] [Export XL│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ CO ATTAINMENT SUMMARY                                           │
│ ┌────┬──────────────────────────────┬──────┬───────┬─────────┐  │
│ │ CO │ Description                  │Direct│Target │ Status  │  │
│ ├────┼──────────────────────────────┼──────┼───────┼─────────┤  │
│ │CO1 │ Apply ML algorithms...       │ 78%  │  60%  │ L3 ✅   │  │
│ │CO2 │ Design neural networks...    │ 65%  │  60%  │ L2 ✅   │  │
│ │CO3 │ Evaluate model performance.. │ 55%  │  60%  │ L1 ⚠️   │  │
│ │CO4 │ Implement deep learning...   │ 48%  │  60%  │ L0 ❌   │  │
│ │CO5 │ Apply NLP techniques...      │ 72%  │  60%  │ L3 ✅   │  │
│ └────┴──────────────────────────────┴──────┴───────┴─────────┘  │
│                                                                  │
│  CO-PO CONTRIBUTION MATRIX                                      │
│  [Heatmap table with correlation levels and PO attainment]      │
│                                                                  │
│  ATTAINMENT TREND CHART                                         │
│  [Bar chart: CO1 CO2 CO3 CO4 CO5 with target line at 60%]      │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Navigation Structure

```
ADMIN
├── Dashboard (College Overview)
├── Departments
│   ├── View All
│   └── Manage Each
├── Users
│   ├── Faculty
│   ├── HODs
│   └── IQAC
├── Subjects (Master list)
├── Academic Years
├── Analytics
│   ├── College Overview
│   ├── Department Comparison
│   └── PO Attainment Matrix
├── Reports
└── Settings

HOD
├── Dashboard
├── My Department
│   ├── Faculty
│   ├── Subjects This Semester
│   └── Students
├── CO Attainment
│   ├── Subject-wise
│   └── Consolidated
├── PO Attainment
│   ├── Current Semester
│   └── Historical
├── Reports
│   ├── Generate NBA Report
│   └── Export Data
└── Settings

FACULTY
├── Dashboard
├── My Subjects
│   └── [Subject]
│       ├── Subject Info
│       ├── Course Outcomes
│       ├── CO-PO Mapping
│       ├── Assessment Setup
│       ├── Students
│       ├── Enter Marks
│       │   ├── CIA 1/2/3
│       │   ├── End Semester
│       │   ├── Quiz / Assignment
│       │   ├── Review 1/2/3 & Final
│       │   └── Presentation
│       ├── CO Attainment
│       ├── PO Attainment
│       └── Reports
└── Profile

IQAC
├── College Dashboard
├── Department-wise Analysis
├── PO Attainment — All Programmes
├── NBA Report Generator
├── NAAC Data
└── Export Reports
```

---

## 8. MODULE-BY-MODULE IMPLEMENTATION PLAN

### Module 1: Authentication System

**Backend (Django):**
```python
# apps/auth/models.py
# Custom user model extending AbstractBaseUser
# Role-based: admin, hod, faculty, iqac

# apps/auth/views.py
class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(email=email, password=password)
        if user:
            tokens = RefreshToken.for_user(user)
            return Response({
                'access': str(tokens.access_token),
                'refresh': str(tokens),
                'user': UserSerializer(user).data,
                'redirect_to': self._get_dashboard_url(user.role)
            })
```

**Frontend (React):**
```
src/
  pages/
    Login.jsx               ← Role-selector login page
  contexts/
    AuthContext.jsx         ← JWT storage, user state, auto-refresh
  hooks/
    useAuth.js             ← Login, logout, role checks
  components/
    ProtectedRoute.jsx     ← Route wrapper checking auth + role
```

### Module 2: Subject & CO Management

This is where faculty set up their subjects before entering marks.

**Key Screens:**
1. **Subject Info** — View subject details (pre-populated by admin/HOD)
2. **Add Course Outcomes** — Faculty defines CO1–CO6 with descriptions and Bloom's level
3. **CO-PO Mapping** — Interactive matrix where faculty marks correlation level (1/2/3)
4. **Assessment Configuration** — Enable/disable assessment types, set max marks

**CO-PO Mapping Component (Complex):**
```jsx
// The mapping interface uses a grid of radio button groups
// Each cell: CO (row) × PO (column) = Correlation level 0/1/2/3
// "0" = no mapping, shown as greyed out

const COPOMappingEditor = () => {
  const [mappings, setMappings] = useState(initialMappings);
  
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>CO \ PO</th>
            {POs.map(po => <th key={po.id}>{po.code}<br/><span>{po.desc_short}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {COs.map(co => (
            <tr key={co.id}>
              <td>{co.code}: {co.description}</td>
              {POs.map(po => (
                <td key={po.id}>
                  <select
                    value={getLevel(co.id, po.id)}
                    onChange={e => updateMapping(co.id, po.id, e.target.value)}
                    className="correlation-select"
                  >
                    <option value="0">-</option>
                    <option value="1">1 (Low)</option>
                    <option value="2">2 (Med)</option>
                    <option value="3">3 (High)</option>
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={saveMappings}>Save CO-PO Mapping</button>
    </div>
  );
};
```

### Module 3: Student Data Management

**Student Import Flow:**
1. HOD/Admin imports full student list department-wide once per year
2. Faculty views their allocated section's students automatically
3. Faculty can export an Excel template pre-filled with student names/rolls
4. Faculty fills marks in Excel, uploads back
5. System validates and imports marks

```python
# Excel Template Generation
def generate_marks_template(subject_allocation_id, assessment_type_code):
    allocation = SubjectAllocation.objects.get(id=subject_allocation_id)
    students = Student.objects.filter(section=allocation.section).order_by('roll_number')
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"{assessment_type_code} Marks"
    
    # Headers with instructions
    ws['A1'] = f"MARKS ENTRY TEMPLATE"
    ws['A2'] = f"Subject: {allocation.subject.subject_name}"
    ws['A3'] = f"Assessment: {assessment_type_code}"
    ws['A4'] = f"Max Marks: {get_max_marks(allocation, assessment_type_code)}"
    
    # Column headers
    ws.append(['S.No', 'Roll Number', 'Student Name', 'Marks', 'Absent (Y/N)'])
    
    # Pre-fill student data
    for i, student in enumerate(students, 1):
        ws.append([i, student.roll_number, student.name, '', ''])
    
    # Style and lock name/roll columns
    # Add data validation for marks range
    dv = DataValidation(type="decimal", operator="between", formula1="0", 
                       formula2=str(get_max_marks(allocation, assessment_type_code)))
    ws.add_data_validation(dv)
    dv.add(f"D5:D{4 + len(students)}")
    
    return wb
```

### Module 4: Marks Entry System

**Three Entry Methods:**
1. **Manual Grid Entry** — Web table with inline editing (fastest for small classes)
2. **Single Student Entry** — Search by roll, enter marks
3. **Excel Upload** — Bulk import from template

**Marks Validation:**
```python
def validate_marks(marks, max_marks, assessment_type):
    errors = []
    if marks < 0:
        errors.append("Marks cannot be negative")
    if marks > max_marks:
        errors.append(f"Marks exceed maximum ({max_marks})")
    if assessment_type in ['CIA1', 'CIA2', 'CIA3'] and max_marks not in [25, 50, 100]:
        errors.append("CIA max marks should be 25, 50, or 100")
    if assessment_type in ['PROJ_R1', 'PROJ_R2', 'PROJ_R3', 'PROJ_FINAL'] and max_marks not in [25, 50, 100]:
        errors.append("Review max marks should be 25, 50, or 100")
    if assessment_type == 'PRESENTATION' and max_marks not in [25, 50, 100]:
        errors.append("Presentation max marks should be 25, 50, or 100")
    return errors
```

### Module 5: Attainment Calculation & Reports

**Calculation Trigger Points:**
- Manual: Faculty clicks "Calculate Attainment" after all marks entered
- Automatic: Background task runs after each batch marks save
- Re-calculation: Triggered when marks are edited

**Report Types to Generate:**

| Report | Format | Primary User |
|---|---|---|
| Subject CO Attainment Summary | Excel + PDF | Faculty |
| CO-PO Attainment Matrix | Excel + PDF | Faculty/HOD |
| Department Attainment Summary | Excel + PDF | HOD |
| Semester-wise PO Attainment | Excel | HOD |
| NBA Criterion 2.1.3 Report | Word/Excel | IQAC/HOD |
| NBA Course File Format | PDF | Faculty |
| College-wide CO-PO Dashboard | PDF | IQAC |

### Module 6: Dashboards

**Admin Dashboard Metrics:**
- Total departments, faculty, students (summary cards)
- Department-wise attainment completion status (progress bars)
- Subjects with pending marks entry (alert list)
- College-wide PO attainment heatmap (current semester)
- Recent activity log

**HOD Dashboard Metrics:**
- Department PO attainment radar chart
- Subject-wise CO attainment bar chart
- Faculty marks entry completion status
- Low attainment COs requiring attention (highlighted red)
- Semester comparison chart

**Faculty Dashboard Metrics:**
- My subjects at-a-glance with marks entry status
- Quick link to most recently accessed subject
- CO attainment trend for each subject
- Pending tasks reminder

**IQAC Dashboard Metrics:**
- College-wide PO attainment matrix (all programmes)
- Department-wise NBA readiness score
- Year-over-year attainment trend
- Export NBA/NAAC report buttons

---

## 9. EXCEL INTEGRATION STRATEGY

### 9.1 Upload Processing Pipeline

```python
# tasks.py (Celery background task)

@app.task
def process_marks_excel(upload_log_id: int):
    """Process uploaded Excel file asynchronously."""
    log = ExcelUploadLog.objects.get(id=upload_log_id)
    log.status = 'PROCESSING'
    log.save()
    
    try:
        df = pd.read_excel(log.file_path, header=4)  # Header on row 5
        
        errors = []
        success_count = 0
        
        for idx, row in df.iterrows():
            roll_number = str(row['Roll Number']).strip()
            marks_raw = row['Marks']
            is_absent = str(row.get('Absent (Y/N)', '')).upper() == 'Y'
            
            # Find student
            student = Student.objects.filter(
                roll_number=roll_number,
                section=log.subject_allocation.section
            ).first()
            
            if not student:
                errors.append(f"Row {idx+5}: Roll number {roll_number} not found")
                continue
            
            # Validate marks
            if is_absent:
                marks = 0
            elif pd.isna(marks_raw):
                errors.append(f"Row {idx+5}: {roll_number} — marks is empty")
                continue
            else:
                marks = float(marks_raw)
                max_marks = log.get_max_marks()
                if marks < 0 or marks > max_marks:
                    errors.append(f"Row {idx+5}: {roll_number} — marks {marks} out of range")
                    continue
            
            # Save mark
            StudentMark.objects.update_or_create(
                student=student,
                subject_allocation=log.subject_allocation,
                assessment_type=log.assessment_type,
                defaults={
                    'marks_obtained': marks,
                    'max_marks': max_marks,
                    'is_absent': is_absent,
                    'entered_by': log.uploaded_by
                }
            )
            success_count += 1
        
        log.status = 'SUCCESS' if not errors else 'PARTIAL'
        log.records_processed = success_count
        log.errors = errors
        log.save()
        
        # Trigger attainment recalculation
        if success_count > 0:
            calculate_attainment.delay(log.subject_allocation_id)
        
    except Exception as e:
        log.status = 'FAILED'
        log.errors = [str(e)]
        log.save()
```

### 9.2 Excel Templates to Pre-build

| Template | Purpose | Columns |
|---|---|---|
| `marks_entry_{code}_{type}.xlsx` | Faculty marks entry (CIA/ESE/Quiz/Assign/Review/Presentation) | S.No, Roll, Name, Marks, Absent |
| `student_list_import.xlsx` | Admin bulk student import | Roll, Name, Batch, Section, Email |
| `faculty_import.xlsx` | Admin bulk faculty import | EmpID, Name, Email, Dept, Desig |
| `co_po_mapping_template.xlsx` | HOD standardizes CO-PO | CO, PO1–PO12, PSO1–PSO3 |
| `co_attainment_report.xlsx` | Generated output | COs, Direct%, Level, Target, Status |
| `po_attainment_report.xlsx` | Generated output | POs, Attainment, Level, Target, Status |
| `nba_criterion_report.xlsx` | NBA format output | NBA-specific format |

### 9.3 CO Attainment Excel Export (Output)

```python
def export_co_attainment_excel(subject_allocation_id: int) -> bytes:
    allocation = SubjectAllocation.objects.get(id=subject_allocation_id)
    cos = CourseOutcome.objects.filter(subject=allocation.subject)
    co_attainments = COAttainment.objects.filter(
        subject_allocation=allocation
    ).select_related('co')
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "CO Attainment"
    
    # College header with logo
    ws.merge_cells('A1:J1')
    ws['A1'] = 'Sri Eshwar College of Engineering, Coimbatore'
    ws['A1'].font = Font(bold=True, size=14)
    
    ws.merge_cells('A2:J2')
    ws['A2'] = f'Department of {allocation.section.batch.programme.department.name}'
    
    # Subject info
    ws['A4'] = 'Subject Code:'
    ws['B4'] = allocation.subject.subject_code
    ws['D4'] = 'Subject Name:'
    ws['E4'] = allocation.subject.subject_name
    ws['A5'] = 'Semester:'
    ws['B5'] = allocation.subject.semester
    ws['D5'] = 'Academic Year:'
    ws['E5'] = allocation.academic_year.label
    
    # CO Attainment Table Header
    headers = ['CO', 'CO Description', 'Students Attained', 'Total Students', 
               'Attainment %', 'Target %', 'Level', 'Status']
    ws.append([''] * len(headers))  # blank row
    ws.append(headers)
    
    # Apply header styling
    for cell in ws[ws.max_row]:
        cell.fill = PatternFill("solid", fgColor="1E4A8A")
        cell.font = Font(color="FFFFFF", bold=True)
    
    # CO Data rows
    for co in cos:
        att = next((a for a in co_attainments if a.co_id == co.id), None)
        level_text = {3: 'Level 3 (High)', 2: 'Level 2 (Medium)', 
                     1: 'Level 1 (Low)', 0: 'Not Attained'}.get(att.attainment_level if att else 0, '-')
        
        row = [
            co.co_code,
            co.description,
            att.students_attained if att else '-',
            att.total_students if att else '-',
            f"{att.direct_attainment}%" if att else '-',
            f"{att.target_attainment}%",
            level_text,
            '✓ Attained' if (att and att.target_achieved) else '✗ Not Attained'
        ]
        ws.append(row)
        
        # Color rows by attainment level
        if att:
            fill_colors = {3: "D1FAE5", 2: "DBEAFE", 1: "FEF3C7", 0: "FEE2E2"}
            fill = PatternFill("solid", fgColor=fill_colors.get(att.attainment_level, "FFFFFF"))
            for cell in ws[ws.max_row]:
                cell.fill = fill
    
    # CO-PO Mapping sheet
    ws2 = wb.create_sheet("CO-PO Mapping")
    # ... (similar structure showing the mapping matrix)
    
    output = BytesIO()
    wb.save(output)
    return output.getvalue()
```

---

## 10. REPORT GENERATION SYSTEM

### 10.1 Report Types & Format Specifications

#### NBA Course File Report (PDF)
Each subject's course file must contain (NBA Tier 1 requirement):
1. Cover Page (Subject name, code, faculty, dept, SECE logo)
2. Syllabus copy
3. CO statements with Bloom's taxonomy levels
4. CO-PO mapping matrix
5. Assessment plan (which assessments test which COs)
6. Marks entry tables for each assessment
7. CO attainment calculation with formulae
8. CO attainment result table
9. PO attainment contribution
10. Analysis and action plan for low-attaining COs

#### Department NBA Summary Report
Generated by HOD, shows:
- All subjects → CO attainment levels
- PO attainment matrix (all 12 POs)
- Semester-wise comparison
- Year-wise trend
- COs not meeting target (Action Required list)

### 10.2 PDF Generation with ReportLab

```python
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

def generate_co_attainment_pdf(subject_allocation_id: int) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    
    # Custom SECE styles
    sece_blue = colors.HexColor('#1E4A8A')
    
    story = []
    
    # Header with college logo
    logo_path = settings.SECE_LOGO_PATH
    img = Image(logo_path, width=80, height=80)
    
    header_data = [[img, 
                   Paragraph("Sri Eshwar College of Engineering", title_style),
                   '']]
    header_table = Table(header_data, colWidths=[90, 370, 90])
    story.append(header_table)
    
    # Title
    story.append(Paragraph("CO Attainment Report", heading_style))
    
    # Subject details table
    subject_data = [
        ['Subject Code:', allocation.subject.subject_code, 
         'Subject Name:', allocation.subject.subject_name],
        ['Semester:', str(allocation.subject.semester),
         'Academic Year:', allocation.academic_year.label],
        ['Department:', allocation.section.batch.programme.department.name,
         'Faculty:', allocation.faculty.user.get_full_name()],
    ]
    
    story.append(Table(subject_data, style=subject_table_style))
    story.append(Spacer(1, 12))
    
    # CO Attainment Table
    co_table_data = [
        ['CO', 'CO Description', 'Students\nAttained', 'Total', 'Attainment\n%', 'Level', 'Target\nMet?']
    ]
    
    for co in cos:
        att = attainments.get(co.id)
        co_table_data.append([
            co.co_code, co.description[:60],
            str(att.students_attained), str(att.total_students),
            f"{att.direct_attainment:.1f}%",
            f"L{att.attainment_level}",
            '✓' if att.target_achieved else '✗'
        ])
    
    # Color coding per row
    table_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), sece_blue),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        # Conditional coloring per row added dynamically
    ])
    
    for i, (co, att) in enumerate(zip(cos, attainment_list), 1):
        row_color = {3: colors.HexColor('#D1FAE5'), 2: colors.HexColor('#DBEAFE'),
                    1: colors.HexColor('#FEF3C7'), 0: colors.HexColor('#FEE2E2')}
        table_style.add('BACKGROUND', (0,i), (-1,i), row_color[att.attainment_level])
    
    story.append(Table(co_table_data, style=table_style))
    story.append(PageBreak())
    
    # CO-PO Matrix page
    # ... build heatmap-style table
    
    doc.build(story)
    return buffer.getvalue()
```

---

## 11. SECURITY ARCHITECTURE

### 11.1 Authentication & Authorization

```python
# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),    # Work-day session
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# Role-based permission classes
class IsFacultyUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'faculty'

class IsHODUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'hod'

# Department-level data isolation
class DepartmentScopedViewMixin:
    """Ensures HOD/Faculty can only access their own department's data."""
    def get_queryset(self):
        user = self.request.user
        if user.role == 'faculty':
            dept_id = user.faculty_profile.department_id
        elif user.role == 'hod':
            dept_id = user.hod_profile.department_id
        else:
            return super().get_queryset()  # Admin/IQAC see all
        return super().get_queryset().filter(department_id=dept_id)
```

### 11.2 Security Checklist

- [x] JWT tokens with short expiry (8 hours)
- [x] HTTPS enforced via Nginx (TLS 1.3)
- [x] CORS restricted to known frontend origin
- [x] Django CSRF protection on all state-changing requests
- [x] Rate limiting: 100 requests/minute per user (Redis-based)
- [x] Excel upload: file type validation, size limit (5MB), virus scan on server
- [x] SQL injection protection: Django ORM (parameterized queries only)
- [x] XSS protection: DRF serializers, React auto-escaping
- [x] Audit log on all mark entry/modification actions
- [x] Password hashing: Argon2 (Django default pbkdf2 is acceptable, Argon2 is stronger)
- [x] Department-level data isolation: faculty cannot access other departments
- [x] Input validation on all API endpoints via DRF serializers
- [x] File storage outside web root (uploaded files not directly accessible)

### 11.3 Data Privacy Considerations

- Student roll numbers and marks are academic records — access must be role-gated
- IQAC sees aggregated data, not individual student marks
- All mark modifications are logged with user + timestamp
- Soft delete for all records (no hard deletes of academic data)

---

## 12. INFRASTRUCTURE & DEPLOYMENT

### 12.1 Server Requirements (Minimum)

**For college internal deployment (intranet):**
```
Server Specification:
- CPU: 4 cores (Intel i5 or equivalent)
- RAM: 8 GB (16 GB recommended)
- Storage: 100 GB SSD
- OS: Ubuntu 22.04 LTS
- Network: Ethernet (college intranet)

OR: Cloud Deployment (recommended for reliability)
- AWS EC2: t3.medium (2 vCPU, 4 GB RAM)
- RDS PostgreSQL: db.t3.micro
- ElastiCache Redis: cache.t3.micro
- Estimated cost: ~$50/month
```

### 12.2 Docker Compose Configuration

```yaml
# docker-compose.yml

version: '3.9'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sece_copo
      POSTGRES_USER: sece_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sece_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  backend:
    build: ./backend
    command: gunicorn sece_copo.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DATABASE_URL=postgresql://sece_admin:${DB_PASSWORD}@db:5432/sece_copo
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - SECRET_KEY=${DJANGO_SECRET_KEY}
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
      - DEBUG=False
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - media_files:/app/media
      - static_files:/app/staticfiles

  celery:
    build: ./backend
    command: celery -A sece_copo worker --loglevel=info --concurrency=2
    environment:
      - DATABASE_URL=postgresql://sece_admin:${DB_PASSWORD}@db:5432/sece_copo
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    volumes:
      - frontend_dist:/app/dist

  nginx:
    image: nginx:1.26-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - static_files:/var/www/static
      - media_files:/var/www/media
      - frontend_dist:/var/www/frontend
      - ./ssl:/etc/ssl
    depends_on:
      - backend

volumes:
  postgres_data:
  media_files:
  static_files:
  frontend_dist:
```

### 12.3 Nginx Configuration

```nginx
# nginx/nginx.conf

upstream django_backend {
    server backend:8000;
}

server {
    listen 80;
    server_name copo.sece.ac.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name copo.sece.ac.in;

    ssl_certificate /etc/ssl/sece_copo.crt;
    ssl_certificate_key /etc/ssl/sece_copo.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 10M;  # For Excel uploads

    # React frontend
    location / {
        root /var/www/frontend;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Django API
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django static files
    location /static/ {
        alias /var/www/static/;
        expires 30d;
    }

    # Protected media files (accessed via Django view, not directly)
    location /media/ {
        internal;
        alias /var/www/media/;
    }
}
```

### 12.4 Backup Strategy

```bash
# backup.sh — Run daily via cron

#!/bin/bash
BACKUP_DIR="/backups/sece_copo"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec sece_db pg_dump -U sece_admin sece_copo | gzip > \
    "$BACKUP_DIR/db_$DATE.sql.gz"

# Media files backup
tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" /data/media/

# Keep last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

---

## 13. 10–15 DAY DEVELOPMENT SPRINT PLAN

### Phase 1: Foundation (Days 1–3)

**Day 1:**
- [ ] Set up project repository (monorepo: `/backend`, `/frontend`, `/docker`)
- [ ] Configure Docker Compose (PostgreSQL, Redis, Django, React)
- [ ] Django project scaffold + apps: `authentication`, `departments`, `subjects`, `marks`, `attainment`, `reports`
- [ ] Implement Django custom User model with roles
- [ ] JWT authentication endpoints (login, refresh, logout, me)
- [ ] React project scaffold with Vite + Tailwind + React Router
- [ ] Auth context + Protected routes + Role-based redirect

**Day 2:**
- [ ] Run all database migrations (complete schema from Section 4)
- [ ] Seed data: college, departments, NBA POs, assessment types
- [ ] Department, Programme, Batch, Section CRUD APIs
- [ ] User management APIs (Admin creates HODs/Faculty/IQAC)
- [ ] Subject management APIs (create, update, list by dept/semester)
- [ ] Admin UI: Login page, dashboard, user management screens

**Day 3:**
- [ ] Faculty profile + allocation setup
- [ ] Subject allocation APIs (assign faculty to section+subject)
- [ ] Course Outcome CRUD APIs + serializers
- [ ] CO-PO Mapping APIs (bulk update endpoint)
- [ ] Assessment configuration APIs
- [ ] Faculty UI: Login, dashboard, subject list page

### Phase 2: Core Features (Days 4–7)

**Day 4:**
- [ ] Student model + import API
- [ ] Student bulk import (Excel processing with validation)
- [ ] Student list view per section
- [ ] Marks entry API (single + bulk)
- [ ] Subject assessment config UI (enable/disable assessments, set max marks)
- [ ] CO entry UI (add/edit COs with Bloom's level picker)
- [ ] CO-PO mapping UI (interactive matrix)

**Day 5:**
- [ ] Marks entry grid UI (inline editable table)
- [ ] Excel template download endpoint
- [ ] Excel marks upload + Celery background processing
- [ ] Upload progress tracking (WebSocket or polling)
- [ ] Marks validation and error display
- [ ] Absent marking functionality

**Day 6:**
- [ ] CO Attainment calculation engine (full implementation from Section 5)
- [ ] PO Attainment calculation from CO attainment
- [ ] Attainment results save + caching
- [ ] CO Attainment display page (table + badges)
- [ ] CO-PO contribution matrix display
- [ ] Trigger recalculation on mark update

**Day 7:**
- [ ] Faculty attainment report view (complete)
- [ ] Recharts integration: CO attainment bar chart, PO radar chart
- [ ] HOD dashboard + department overview APIs
- [ ] HOD: Subject-wise CO attainment summary
- [ ] HOD: Department PO attainment matrix
- [ ] HOD: Faculty marks completion status

### Phase 3: Reports & Advanced (Days 8–11)

**Day 8:**
- [ ] Excel CO attainment export (styled with SECE branding)
- [ ] Excel PO attainment export
- [ ] Excel marks summary export
- [ ] PDF CO attainment report (ReportLab)
- [ ] PDF CO-PO mapping report
- [ ] Report download UI with format selector

**Day 9:**
- [ ] IQAC dashboard: college-wide PO attainment
- [ ] IQAC: Department comparison view
- [ ] IQAC: NBA format report data aggregation
- [ ] IQAC: Export accreditation reports
- [ ] Admin dashboard: college overview, dept comparison
- [ ] Admin: Analytics charts and trends

**Day 10:**
- [ ] NBA Course File PDF (comprehensive per-subject report)
- [ ] Department consolidated NBA report
- [ ] Historical data views (semester comparison)
- [ ] Action plan feature for low-attaining COs
- [ ] Survey/indirect attainment (basic implementation)

**Day 11:**
- [ ] Mobile responsiveness audit + fixes
- [ ] Performance: add database indexes, query optimization
- [ ] Redis caching for heavy queries (attainment calculations)
- [ ] Error handling throughout frontend + backend
- [ ] Toast notifications for all user actions

### Phase 4: Polish & Deploy (Days 12–15)

**Day 12:**
- [ ] Comprehensive testing: all calculation scenarios
- [ ] Edge cases: no marks entered, absent students, zero-weight COs
- [ ] UI polish: loading states, empty states, error states
- [ ] SECE branding finalization (logo, colors, fonts throughout)

**Day 13:**
- [ ] User acceptance testing with sample faculty (get 1-2 faculty to try it)
- [ ] Bug fixes from testing
- [ ] User guide / help tooltips on complex screens
- [ ] Admin user seeding + initial department/subject data

**Day 14:**
- [ ] Production Docker build + deploy to server
- [ ] SSL certificate setup
- [ ] DNS configuration (`copo.sece.ac.in`)
- [ ] Load testing (simulate 50+ concurrent users)
- [ ] Backup configuration

**Day 15:**
- [ ] Full production data seeding (all departments, all subjects)
- [ ] Faculty training walkthrough
- [ ] Go-live
- [ ] Monitor logs for 24 hours

---

## 14. COLLEGE ASSETS REQUIRED

### From SECE IT/Admin:

#### Essential (Must Have Before Development Starts)
1. **SECE Logo** — High resolution PNG (minimum 500×500px), transparent background, both light and dark variants
2. **College colors** — Official hex codes of SECE brand colors (if specified in brand guide)
3. **Department list confirmation** — Official abbreviations, full names, HOD names
4. **Programme list** — All B.E./M.E. programmes with official names, duration, semesters
5. **NBA PO statements** — Programme-specific PO descriptions as approved by NBA

#### Academic Data (For Seeding)
6. **Student master list** — Roll number, name, section, batch for current semester (Excel format)
7. **Faculty list** — Employee ID, name, email, department, designation
8. **Subject master list** — Subject codes, names, semester, department, credits
9. **Subject allocation** — Who teaches which subject to which section this semester
10. **CO-PO mapping templates** — If HODs already have approved CO-PO correlation matrices

#### Reference Documents
11. **NBA self-study report (previous)** — To understand exact report format expected
12. **Sample course file** — One complete course file from a previous semester (for report template reference)
13. **Attainment calculation method document** — College's current Excel-based calculation method (to ensure we exactly match existing methodology)
14. **IQAC report templates** — Formats used for previous accreditation

#### Technical
15. **Server/hosting details** — IP address, OS version, domain name for the portal
16. **SSL certificate** — Or decision to use Let's Encrypt (free)
17. **SMTP credentials** — For password reset emails (optional but recommended)
18. **IT contact person** — For deployment support

#### Media (For UI)
19. **Campus photos** — 2-3 high-quality photos of campus/buildings (for login page background)
20. **College tagline** — Official tagline if any

---

## 15. ACCREDITATION ALIGNMENT (NBA/NAAC)

### 15.1 NBA Tier 1 — Key Criterion Addressed

| Criterion | Requirement | How System Addresses |
|---|---|---|
| 2.1.3 | CO Attainment ≥ 60% | Auto-calculates and flags non-attaining COs |
| 2.1.4 | PO Attainment target | Aggregates CO levels through mapping |
| 2.1.2 | CO-PO Mapping (1/2/3) | Interactive mapping editor + stored correlation matrix |
| 3.1 | Direct assessment evidence | Marks entry with structured assessment plan |
| 3.2 | Indirect assessment | Survey module captures student feedback |
| 3.3 | Corrective action | Low-attainment CO flagging + action plan field |
| SAR Format | Self-Assessment Report | Export in NBA SAR tables format |

### 15.2 NAAC Alignment

| Criterion | Aspect | System Support |
|---|---|---|
| 1.1.2 | Syllabus, CO, PO implementation | CO entry with syllabus topic mapping |
| 1.3.2 | Project-based learning evidence | Project review assessments |
| 2.6.1 | Attainment of Learning Outcomes | Direct export of CO/PO attainment evidence |
| 2.6.2 | Programme outcomes | PO attainment across all programmes |

### 15.3 Report Naming Convention (NBA Compliant)

```
CO Attainment Table naming:
Table 2.1.3 - CO Attainment for [Subject Code] [Subject Name]
             [Semester]: [Sem] | [Academic Year]: [YYYY-YY]

PO Attainment Table naming:  
Table 2.1.4 - PO Attainment for [Programme Name]
             [Academic Year]: [YYYY-YY] | [Semester]: [Sem]
```

---

## 16. POST-LAUNCH MAINTENANCE PLAN

### Immediate Post-Launch (Week 1–2)
- Daily log monitoring
- Bug fix response within 24 hours
- Faculty helpdesk availability (walk-in or WhatsApp group)
- Daily database backup verification

### Short-term (Month 1–3)
- User feedback collection and prioritization
- Performance monitoring (slow query identification)
- Additional report formats based on HOD requests
- Indirect attainment survey module (if not done in sprint)

### Semester-End Tasks
- Archive current semester data
- New semester setup: new academic year, new allocations, new students
- Semester-end report bulk export for all departments

### Planned Future Enhancements (v2.0)
1. **Mobile App** — PWA (Progressive Web App) for faculty mark entry on mobile
2. **Question-wise CO mapping** — Map individual CIA questions to COs for granular attainment
3. **Indirect attainment** — Structured student surveys mapped to COs
4. **Alumni survey** — PO attainment through alumni feedback
5. **Employer survey** — Graduate attribute assessment
6. **Timetable integration** — Auto-populate subject allocations from timetable system
7. **AI insights** — Identify patterns in low-attaining COs, suggest interventions
8. **Comparative benchmarking** — Compare attainment across batches/sections
9. **Bloom's taxonomy analytics** — Cognitive level distribution across assessments
10. **NBA SAR auto-generation** — Complete Self-Assessment Report document generation

---

## APPENDIX A: Directory Structure

```
sece-copo/
├── backend/
│   ├── sece_copo/               # Django project
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── authentication/
│   │   ├── departments/          # Dept, Programme, Batch, Section
│   │   ├── users/                # User, FacultyProfile, HODProfile
│   │   ├── subjects/             # Subject, CO, CO-PO Mapping
│   │   ├── allocations/          # SubjectAllocation, AssessmentConfig
│   │   ├── students/             # Student, Enrollment
│   │   ├── marks/                # StudentMark, ExcelUpload
│   │   ├── attainment/           # Calculation engine, Results
│   │   ├── reports/              # PDF/Excel generators
│   │   └── analytics/            # Aggregation views
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── assets/               # SECE logos, images
│   │   ├── components/
│   │   │   ├── ui/               # Buttons, Badges, Cards, Inputs
│   │   │   ├── charts/           # Recharts wrappers
│   │   │   ├── tables/           # Marks grid, CO matrix
│   │   │   └── layout/           # Navbar, Sidebar, PageHeader
│   │   ├── pages/
│   │   │   ├── auth/             # Login
│   │   │   ├── admin/            # Admin pages
│   │   │   ├── hod/              # HOD pages
│   │   │   ├── faculty/          # Faculty pages
│   │   │   └── iqac/             # IQAC pages
│   │   ├── contexts/             # Auth, Theme
│   │   ├── hooks/                # useAuth, useSubject, useMarks
│   │   ├── services/             # API call functions
│   │   ├── utils/                # Formatters, validators
│   │   └── constants/            # PO descriptions, assessment codes
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## APPENDIX B: Environment Variables

```env
# .env (never commit this file)

# Database
DB_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://sece_admin:${DB_PASSWORD}@db:5432/sece_copo

# Django
DJANGO_SECRET_KEY=<50-char-random-string>
DEBUG=False
ALLOWED_HOSTS=copo.sece.ac.in,localhost

# Redis
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# Email (for password resets)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=no-reply@sece.ac.in
EMAIL_HOST_PASSWORD=<app-password>

# College Config
COLLEGE_NAME=Sri Eshwar College of Engineering
COLLEGE_CODE=SECE
SECE_LOGO_PATH=/app/assets/sece_logo.png

# Frontend
VITE_API_BASE_URL=https://copo.sece.ac.in/api
```

---

*Document prepared for Sri Eshwar College of Engineering, Coimbatore*  
*Version 1.0 — Ready for Development*  
*Estimated Team: 2–3 Full-Stack Developers | Timeline: 10–15 Days*

---
