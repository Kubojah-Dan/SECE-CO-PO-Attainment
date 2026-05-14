import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { LoginPage } from '@/features/auth/LoginPage'
import { ROLE_ROUTES } from '@/features/auth/authTypes'
import type { Role } from '@/features/auth/authTypes'
import { AppShell } from '@/components/layout/AppShell'
import { NotFoundPage } from '@/pages/NotFoundPage'

/* ─── Dashboards ─── */
import { AdminDashboard }   from '@/features/admin/AdminDashboard'
import { HodDashboard }     from '@/features/hod/HodDashboard'
import { FacultyDashboard } from '@/features/faculty/FacultyDashboard'
import { IqacDashboard }    from '@/features/iqac/IqacDashboard'

/* ─── Faculty ─── */
import { SubjectList }        from '@/features/faculty/SubjectList'
import { SubjectDetail }      from '@/features/faculty/SubjectDetail'
import { AttainmentView }     from '@/features/faculty/AttainmentView'
import { FacultyReportsPage } from '@/features/faculty/ReportsPage'

/* ─── HOD ─── */
import { ApprovalsPage }  from '@/features/hod/ApprovalsPage'
import { HodReportsPage } from '@/features/hod/ReportsPage'

/* ─── IQAC ─── */
import { AnalyticsPage }     from '@/features/iqac/AnalyticsPage'
import { AccreditationPage } from '@/features/iqac/AccreditationPage'
import { IqacReportsPage }   from '@/features/iqac/ReportsPage'

/* ─── Admin ─── */
import { DepartmentsPage } from '@/features/admin/DepartmentsPage'
import { UsersPage }       from '@/features/admin/UsersPage'
import { SubjectsPage }    from '@/features/admin/SubjectsPage'
import { StudentsPage }    from '@/features/admin/StudentsPage'
import { RegulationsPage } from '@/features/admin/RegulationsPage'
import { POPSOPage }       from '@/features/admin/POPSOPage'
import { SettingsPage }    from '@/features/admin/SettingsPage'
import { AuditLogPage }    from '@/features/admin/AuditLogPage'

/* ─── Shared ─── */
import { POAttainmentPage } from '@/features/shared/POAttainmentPage'

/* ─── Stub ─── */
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-brand-950 text-[17px] font-medium">{title}</h1>
        <p className="text-brand-300 text-[13px] mt-1.5">Coming soon</p>
      </div>
    </div>
  )
}

/* ─── Protected Route ─── */
interface ProtectedRouteProps { children: ReactNode; allowedRoles: Role[] }

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={ROLE_ROUTES[user.role]} replace />
  return <>{children}</>
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_ROUTES[user.role]} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* ─── SUPER ADMIN ─── */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"    element={<AdminDashboard />} />
              <Route path="departments"  element={<DepartmentsPage />} />
              <Route path="users"        element={<UsersPage />} />
              <Route path="subjects"     element={<SubjectsPage />} />
              <Route path="students"     element={<StudentsPage />} />
              <Route path="regulations"  element={<RegulationsPage />} />
              <Route path="po-pso"       element={<POPSOPage />} />
              <Route path="po-attainment" element={<POAttainmentPage scope="admin" />} />
              <Route path="settings"     element={<SettingsPage />} />
              <Route path="audit"        element={<AuditLogPage />} />
              <Route path="*"            element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ─── HOD ─── */}
      <Route path="/hod/*" element={
        <ProtectedRoute allowedRoles={['hod']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"      element={<HodDashboard />} />
              <Route path="subjects"       element={<ComingSoon title="Subjects" />} />
              <Route path="faculty"        element={<ComingSoon title="Faculty" />} />
              <Route path="approvals"      element={<ApprovalsPage />} />
              <Route path="po-attainment"  element={<POAttainmentPage scope="hod" />} />
              <Route path="reports"        element={<HodReportsPage />} />
              <Route path="*"              element={<Navigate to="/hod/dashboard" replace />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ─── FACULTY ─── */}
      <Route path="/faculty/*" element={
        <ProtectedRoute allowedRoles={['faculty']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"      element={<FacultyDashboard />} />
              <Route path="subjects"       element={<SubjectList />} />
              <Route path="subjects/:id"   element={<SubjectDetail />} />
              <Route path="marks"          element={<ComingSoon title="Mark Entry" />} />
              <Route path="co-mapping"     element={<ComingSoon title="CO Mapping" />} />
              <Route path="attainment"     element={<AttainmentView />} />
              <Route path="reports"        element={<FacultyReportsPage />} />
              <Route path="*"              element={<Navigate to="/faculty/dashboard" replace />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      {/* ─── IQAC ─── */}
      <Route path="/iqac/*" element={
        <ProtectedRoute allowedRoles={['iqac']}>
          <AppShell>
            <Routes>
              <Route path="dashboard"      element={<IqacDashboard />} />
              <Route path="analytics"      element={<AnalyticsPage />} />
              <Route path="reports"        element={<IqacReportsPage />} />
              <Route path="accreditation"  element={<AccreditationPage />} />
              <Route path="*"              element={<Navigate to="/iqac/dashboard" replace />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      } />

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
