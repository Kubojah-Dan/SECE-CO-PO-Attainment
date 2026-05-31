/**
 * SECE CO-PO Platform — Role Guard Component
 * Protects routes by user role, redirects unauthorized users
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_DASHBOARDS = {
  admin: '/admin/dashboard',
  hod: '/hod/dashboard',
  faculty: '/faculty/dashboard',
  iqac: '/iqac/dashboard',
  staff: '/staff/subjects',
};

export default function RoleGuard({ roles = [] }) {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(role)) {
    // Redirect to their own dashboard
    const home = ROLE_DASHBOARDS[role] || '/login';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
