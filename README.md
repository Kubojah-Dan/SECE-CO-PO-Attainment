# OBE Attain — CO-PO/PSO Attainment System (Frontend)

This is the comprehensive frontend application for the OBE Attain platform, designed to manage Outcome-Based Education (OBE) metrics, including CO-PO/PSO attainment for NBA and NAAC accreditation. Built with React 18, Vite, TypeScript, Tailwind CSS v3, and Zustand.

## Features by Module

### 1. Authentication & App Shell
- Secure login and JWT token management via `useAuthStore`.
- Role-based navigation guards (Super Admin, HOD, Faculty, IQAC).
- Global responsive sidebar and routing.

### 2. Faculty Portal
- **Dashboard**: Overview of assigned subjects and pending tasks.
- **Subjects List**: View assigned subjects and status.
- **Subject Details**: Define Course Outcomes (COs) and CO-PO mapping weights (0-3).
- **Marks Entry**: Direct (Internal/Model/ESE) and indirect (surveys) mark upload via templates.
- **Attainment View**: Real-time calculation and visualization of CO attainment percentages.
- **Reports**: Direct download of subject-level reports (CO Attainment, Student Performance, Marks, Mapping) in PDF/Excel.

### 3. HOD Portal
- **Dashboard**: Department overview, faculty progress, and pending subject approvals.
- **Approvals**: Review and approve/reject submitted subject attainments.
- **PO Attainment**: View aggregated PO/PSO attainment for the department, heat maps, and multi-year trend charts.
- **Reports**: Queue and generate department-level attainment and faculty submission reports.

### 4. IQAC / Accreditation Portal
- **Dashboard**: Institution-wide quick stats and readiness status.
- **Analytics**: Institution-wide PO/PSO averages, department comparisons, and YoY attainment trends.
- **Accreditation**: NBA/NAAC readiness checklist, blocking items identification, and drill-down into department readiness.
- **Reports**: Generate full NBA and NAAC compliance reports.

### 5. Super Admin Control Panel
- **Departments**: CRUD operations for academic departments and assigning HODs.
- **Users**: Manage faculty/staff accounts, roles, temp passwords, and active status.
- **Subjects**: Create subjects and assign faculty.
- **Students**: Import student lists via Excel or manual entry.
- **Regulations**: Define academic regulations and set active academic years.
- **PO/PSO Definitions**: Update standard PO/PSO descriptions.
- **Settings**: Configure direct/indirect weightages (e.g., 80/20) and target thresholds. Backup and restore system data.
- **Audit Logs**: Filterable and paginated tracking of all user actions in the system.

## Available Endpoints (Configured in `src/lib/endpoints.ts`)

The frontend expects the backend API at the URL defined by `VITE_API_URL` (default: `http://localhost:4000`).

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

### Analytics (Dashboards)
- `GET /api/analytics/admin/overview`
- `GET /api/analytics/hod/department`
- `GET /api/analytics/faculty/subjects`
- `GET /api/analytics/iqac/institution`

### Admin / Core Entities
- **Departments**: `GET/POST /api/departments`, `PUT/DELETE /api/departments/:id`
- **Subjects**: `GET/POST /api/subjects`, `PUT/DELETE /api/subjects/:id`, `PUT /api/subjects/:id/assign`
- **Students**: `GET/POST /api/students`, `PUT/DELETE /api/students/:id`, `POST /api/students/import`
- **Users**: `GET/POST /api/users`, `PUT/DELETE /api/users/:id`
- **Regulations**: `GET/POST /api/regulations`, `PUT /api/regulations/:id`, `GET /api/academic-years`

### Faculty / Subject Operations
- **Course Outcomes**: `GET/POST /api/subjects/:id/cos`, `PUT/DELETE /api/subjects/:id/cos/:coId`
- **CO-PO Mapping**: `GET /api/subjects/:id/co-po-mapping`
- **Marks**: `POST /api/subjects/:id/marks/upload`, `GET /api/subjects/:id/marks/template`
- **Subject Lifecycle**: `POST /api/subjects/:id/submit`, `POST /api/subjects/:id/approve`, `POST /api/subjects/:id/reject`

### Attainment
- `POST /api/subjects/:id/attainment/calculate`
- `GET /api/subjects/:id/attainment/co`
- `GET /api/subjects/:id/attainment/po`
- `GET /api/departments/:deptId/po-attainment`
- `GET /api/departments/:deptId/pso-attainment`
- `GET /api/departments/:deptId/po-attainment/trends`
- `GET /api/attainment/institution`

### Reports & Jobs
- `POST /api/reports/jobs` (Queue report)
- `GET /api/reports/jobs/:jobId` (Poll status)
- `GET /api/reports/jobs/:jobId/download`
- Direct subject reports via `/api/reports/subjects/:subjectId/*`

### Configuration & Logs
- `GET/PUT /api/attainment/settings`
- `GET /api/audit-logs`, `GET /api/audit-logs/export`
- `POST /api/config/backup`

## Setup & Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:4000
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

4. **Production Build**
   ```bash
   npm run build
   ```
   This generates the optimized static files in the `dist/` directory.

## Technology Stack
- React 18, Vite, TypeScript
- Tailwind CSS v3 for styling (custom flat design system)
- Zustand for state management (auth and report job queuing)
- React Router v6 for navigation
- Recharts for analytics and data visualization
- Lucide React for iconography
