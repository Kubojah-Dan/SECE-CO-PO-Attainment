# OBE Attainment Management System

A production-grade CO-PO/PSO Attainment Management System for engineering institutions implementing Outcome Based Education (OBE). Used by faculty, HoDs, and IQAC officials to track academic outcome attainment across departments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/obe-dashboard run dev` — run the React frontend (port 21381, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed initial data (departments, users, subjects, COs, POs, PSOs, mappings, students)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, Zustand auth, Recharts, shadcn/ui, react-hook-form + zod
- API: Express 5, JWT auth (15min access / 7d refresh), multer file uploads
- DB: PostgreSQL + Drizzle ORM (12 tables)
- Queue: BullMQ + Redis (graceful fallback to synchronous processing when Redis unavailable)
- Validation: Zod (`zod/v4`), `drizzle-zod`, Orval-generated hooks + schemas
- Build: esbuild (CJS bundle for server), Vite (frontend)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for ~50 endpoints)
- `lib/api-client-react/src/generated/api.ts` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — Orval-generated Zod schemas for server validation
- `lib/db/src/schema/` — 12 Drizzle schema files (users, departments, regulations, subjects, outcomes, mappings, students, marks, attainment, reports, auditLogs, uploadJobs)
- `artifacts/api-server/src/routes/` — route handlers (auth, users, departments, subjects, outcomes, mappings, marks, uploads, attainment, reports, dashboard)
- `artifacts/api-server/src/services/` — attainmentEngine, auditService, excelProcessorSync
- `artifacts/api-server/src/workers/` — excelProcessor (BullMQ), redisConnection
- `artifacts/obe-dashboard/src/pages/` — 13 pages (Login, Dashboard, Users, Departments, Subjects, etc.)
- `artifacts/obe-dashboard/src/store/authStore.ts` — Zustand auth store (persisted to localStorage)
- `artifacts/obe-dashboard/src/components/layout/` — Sidebar, Layout, ProtectedRoute

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed hooks (frontend) + Zod schemas (backend). Never hand-write fetch calls or validation schemas.
- **JWT dual-token**: 15-minute access tokens + 7-day refresh tokens. Refresh token stored in DB for revocation. `accessToken` also written to `localStorage["accessToken"]` for the Orval custom fetch interceptor.
- **Attainment formula**: Direct CO Attainment = % students scoring ≥60% on CO questions. Final = (Direct × 0.8) + (Indirect × 0.2). PO Attainment = weighted average of CO attainments by correlation level (0-3).
- **BullMQ with Redis fallback**: Excel upload queues via BullMQ when Redis is available; falls back to inline synchronous processing via `excelProcessorSync.ts` — no silent failures.
- **Role-based access**: SUPER_ADMIN (all), HOD (department scope), FACULTY (subject scope), IQAC (analytics/reports only). Enforced at both route middleware and frontend nav.

## Product

- **Login** (`/login`): JWT-authenticated login with role-based redirect
- **Dashboard** (`/dashboard`): Institution KPIs, CO trends chart, weak CO detection, department comparison, faculty progress
- **Departments** (`/departments`, `/departments/:id`): Dept stats, HOD, faculty count, PO/PSO attainment breakdown
- **Users** (`/users`): User management with role badges, create/edit modals
- **Regulations** (`/regulations`): Academic regulation management per department
- **Subjects** (`/subjects`, `/subjects/:id`): Subject detail with CO list, CO-PO mapping matrix, marks upload, attainment calculation
- **Students** (`/students`): Paginated student roster with filters
- **Attainment Hub** (`/attainment`): CO/PO/PSO attainment charts with threshold indicators
- **Reports** (`/reports`): Generate and download CO/PO/NBA/NAAC reports
- **Audit Logs** (`/audit-logs`): Paginated audit trail with user, action, entity, timestamp

## Seed Accounts (password: Admin@123)

| Email | Role |
|-------|------|
| admin@obe.edu | SUPER_ADMIN |
| hod.cse@obe.edu | HOD |
| priya@obe.edu | FACULTY |
| arjun@obe.edu | FACULTY |
| iqac@obe.edu | IQAC |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking artifacts (rebuilds composite lib declarations).
- After schema changes, also run `pnpm --filter @workspace/db run push` to sync the DB.
- The API server imports Zod schemas from `@workspace/api-zod` — always regenerate after spec changes.
- BullMQ worker (`excelProcessor.ts`) is not auto-started; it's imported dynamically in the upload route. Without Redis, the sync fallback runs automatically.
- `localStorage["accessToken"]` is the key used by the Orval `customFetch` interceptor — the `authStore.setAuth` method writes it there automatically.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
