/**
 * SECE CO-PO Platform — Main Application Entry Point
 * React Router v6, TanStack Query, Auth Provider
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';

// Faculty pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import SubjectsList from './pages/faculty/SubjectsList';
import SubjectDetail from './pages/faculty/SubjectDetail';
import CODefinitionPage from './pages/faculty/CODefinitionPage';
import COPOMappingPage from './pages/faculty/COPOMappingPage';
import AssessmentConfigPage from './pages/faculty/AssessmentConfigPage';
import MarksEntryPage from './pages/faculty/MarksEntryPage';
import COAttainmentPage from './pages/faculty/COAttainmentPage';
import FacultyReportsPage from './pages/faculty/FacultyReportsPage';

// HOD pages
import HODDashboard from './pages/hod/HODDashboard';
import HODCOAttainment from './pages/hod/HODCOAttainment';
import HODPOAttainment from './pages/hod/HODPOAttainment';
import HODReports from './pages/hod/HODReports';
import HODFacultyList from './pages/hod/HODFacultyList';
import HODSubjectsList from './pages/hod/HODSubjectsList';
import HODATRReview from './pages/hod/HODATRReview';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import UserManagement from './pages/admin/UserManagement';
import AcademicYears from './pages/admin/AcademicYears';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSubjects from './pages/admin/AdminSubjects';
import ExcelTools from './pages/admin/ExcelTools';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import RegulationManagement from './pages/admin/RegulationManagement';
import SectionManagement from './pages/admin/SectionManagement';

// Faculty ATR
// Faculty ATR & Mapping
import ActionTakenReport from './pages/faculty/ActionTakenReport';
import QuestionMappingPage from './pages/faculty/QuestionMappingPage';

// IQAC pages
import IQACDashboard from './pages/iqac/IQACDashboard';
import IQACPOAttainment from './pages/iqac/IQACPOAttainment';
import NBAReport from './pages/iqac/NBAReport';
import Profile from './pages/Profile';

// HR Staff page (sub-tier of faculty role)
import StaffSubjectsPage from './pages/staff/StaffSubjectsPage';

// Role guard component
import RoleGuard from './components/layout/RoleGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 15 * 60 * 1000,           // 15 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { SelectionProvider } from './contexts/SelectionContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SelectionProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Protected app routes */}
              <Route element={<AppLayout />}>

                {/* ── Faculty Routes ─────────────────────────────── */}
                {/* NOTE: HR Staff users also have role='faculty' and use these routes */}
                <Route element={<RoleGuard roles={['faculty', 'admin']} />}>
                  <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                  <Route path="/faculty/subjects" element={<SubjectsList />} />
                  <Route path="/faculty/subjects/:allocId" element={<SubjectDetail />} />
                  <Route path="/faculty/subjects/:allocId/cos" element={<CODefinitionPage />} />
                  <Route path="/faculty/subjects/:allocId/co-po-mapping" element={<COPOMappingPage />} />
                  <Route path="/faculty/subjects/:allocId/assessments" element={<AssessmentConfigPage />} />
                  <Route path="/faculty/subjects/:allocId/marks" element={<MarksEntryPage />} />
                  <Route path="/faculty/subjects/:allocId/marks/:assessmentType" element={<MarksEntryPage />} />
                  <Route path="/faculty/subjects/:allocId/co-attainment" element={<COAttainmentPage />} />
                  <Route path="/faculty/subjects/:allocId/reports" element={<FacultyReportsPage />} />
                  <Route path="/faculty/subjects/:allocId/atr" element={<ActionTakenReport />} />
                  <Route path="/faculty/subjects/:allocId/question-mapping/:assessmentType" element={<QuestionMappingPage />} />
                  {/* HR Staff mark entry page */}
                  <Route path="/staff/subjects" element={<StaffSubjectsPage />} />
                </Route>

                {/* ── HOD Routes ─────────────────────────────────── */}
                <Route element={<RoleGuard roles={['hod', 'admin']} />}>
                  <Route path="/hod/dashboard" element={<HODDashboard />} />
                  <Route path="/hod/faculty" element={<HODFacultyList />} />
                  <Route path="/hod/subjects" element={<HODSubjectsList />} />
                  <Route path="/hod/co-attainment" element={<HODCOAttainment />} />
                  <Route path="/hod/po-attainment" element={<HODPOAttainment />} />
                  <Route path="/hod/reports" element={<HODReports />} />
                  <Route path="/hod/atr-review" element={<HODATRReview />} />
                </Route>

                {/* ── Admin Routes ────────────────────────────────── */}
                <Route element={<RoleGuard roles={['admin']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/departments" element={<DepartmentManagement />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/academic-years" element={<AcademicYears />} />
                  <Route path="/admin/subjects" element={<AdminSubjects />} />
                  <Route path="/admin/regulations" element={<RegulationManagement />} />
                  <Route path="/admin/sections" element={<SectionManagement />} />
                  <Route path="/admin/excel-tools" element={<ExcelTools />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                </Route>

                {/* ── Global Authenticated Routes ────────────────────── */}
                <Route path="/profile" element={<Profile />} />

                {/* ── IQAC Routes ────────────────────────────────────────────── */}
                <Route element={<RoleGuard roles={['iqac', 'admin']} />}>
                  <Route path="/iqac/dashboard" element={<IQACDashboard />} />
                  <Route path="/iqac/po-attainment" element={<IQACPOAttainment />} />
                  <Route path="/iqac/nba-report" element={<NBAReport />} />
                </Route>

              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            {/* Global Toast Notifications */}
            <ToastContainer
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  borderRadius: '0.75rem',
                  boxShadow: 'var(--shadow-lg)',
                },
                success: { style: { background: 'var(--success-light)', color: '#065F46' } },
                error: { style: { background: 'var(--danger-light)', color: '#991B1B' } },
              }}
            />
          </SelectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
