# OBE Attain — CO-PO/PSO Attainment System

This is the comprehensive Monorepo for the **OBE Attain** platform, designed to manage Outcome-Based Education (OBE) metrics, including CO-PO/PSO attainment for NBA and NAAC accreditation.

The repository is structured into two main parts:
- **Frontend**: A React application located at the root of the repository.
- **Backend**: A Node.js API located in the `obe-attain-api` directory.

## System Architecture & Tech Stack

### Frontend (Root Directory)
- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS v3 (custom flat design system)
- **State Management**: Zustand (Auth and report job queuing)
- **Routing**: React Router v6
- **Visualization**: Recharts for analytics
- **Icons**: Lucide React

### Backend (`obe-attain-api/`)
- **Framework**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (managed via Prisma ORM)
- **Caching & Queues**: Redis & BullMQ
- **Security**: JWT Authentication, bcryptjs, Helmet, Express Rate Limit
- **Reporting**: PDFKit (PDFs) and ExcelJS (Excel sheets)

---

## Setup & Running Locally

To run the full application, you need to start both the backend API and the frontend client simultaneously. Ensure you have **PostgreSQL** and **Redis** running locally or remotely.

### 1. Backend Setup (`obe-attain-api/`)

1. **Navigate to the Backend Directory:**
   ```bash
   cd obe-attain-api
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:**
   Create a `.env` file inside `obe-attain-api/` with the required configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/obe_attain?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_ACCESS_SECRET="your_access_secret_here"
   JWT_REFRESH_SECRET="your_refresh_secret_here"
   PORT=4000
   ```
4. **Database Migration & Seeding:**
   Run migrations and optionally seed initial data:
   ```bash
   npm run migrate
   npm run seed
   ```
5. **Start the Backend Server:**
   ```bash
   npm run dev
   ```
   *The API will run on `http://localhost:4000` with hot-reloading.*

### 2. Frontend Setup (Root Directory)

1. **Open a new terminal** in the root folder.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:4000
   ```
4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`.*

---

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
- **Reports**: Direct download of subject-level reports in PDF/Excel.

### 3. HOD Portal
- **Dashboard**: Department overview, faculty progress, and pending subject approvals.
- **Approvals**: Review and approve/reject submitted subject attainments.
- **PO Attainment**: View aggregated PO/PSO attainment for the department, heat maps, and multi-year trend charts.
- **Reports**: Queue and generate department-level attainment and faculty submission reports.

### 4. IQAC / Accreditation Portal
- **Dashboard**: Institution-wide quick stats and readiness status.
- **Analytics**: Institution-wide PO/PSO averages, department comparisons, and YoY attainment trends.
- **Accreditation**: NBA/NAAC readiness checklist, blocking items identification.
- **Reports**: Generate full NBA and NAAC compliance reports.

### 5. Super Admin Control Panel
- **Departments & Users**: CRUD operations for academic departments, HOD assignments, and faculty/staff accounts.
- **Subjects & Students**: Create subjects, assign faculty, and import student lists via Excel or manual entry.
- **Regulations & Settings**: Define academic regulations, configure direct/indirect weightages (e.g., 80/20) and target thresholds. 
- **System Maintenance**: Backup and restore system data, and track actions via paginated Audit Logs.

## Available Backend Endpoints (Partial List)

- **Auth**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/refresh`
- **Analytics**: `/api/analytics/admin/overview`, `/api/analytics/hod/department`, `/api/analytics/faculty/subjects`, `/api/analytics/iqac/institution`
- **Admin**: CRUD for `/api/departments`, `/api/subjects`, `/api/students`, `/api/users`, `/api/regulations`
- **Faculty**: `/api/subjects/:id/cos`, `/api/subjects/:id/marks/upload`, `/api/subjects/:id/submit`
- **Attainment**: `/api/subjects/:id/attainment/calculate`, `/api/departments/:deptId/po-attainment`
- **Reports**: `/api/reports/jobs`, `/api/reports/subjects/:subjectId/*`
- **Config & Logs**: `/api/attainment/settings`, `/api/audit-logs`, `/api/config/backup`
