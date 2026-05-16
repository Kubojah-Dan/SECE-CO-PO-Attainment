/**
 * SECE CO-PO Platform — Sidebar Layout Component
 * Refactored for mobile-first design and premium collapsible logic
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, Building2, Settings,
  BarChart3, FileText, GraduationCap, LogOut, ChevronRight,
  ClipboardList, Calculator, Upload, Database, Bell, Menu, X,
  Award, Layers, BookMarked, School, PanelLeftClose, PanelLeftOpen,
  ChevronLeft, FileSpreadsheet, User, Calendar
} from 'lucide-react';
import logo from '../../assets/logo_web.webp';

// ── Navigation config per role ─────────────────────────────────
const NAV_CONFIG = {
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/departments', icon: Building2, label: 'Depts' },
    { to: '/admin/academic-years', icon: Calendar, label: 'Academic Years' },
    { to: '/admin/regulations', icon: Layers, label: 'Regulations' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/subjects', icon: BookMarked, label: 'Subjects' },
    { to: '/admin/excel-tools', icon: FileSpreadsheet, label: 'Excel Tools' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
  hod: [
    { to: '/hod/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hod/faculty', icon: Users, label: 'Faculty' },
    { to: '/hod/subjects', icon: BookMarked, label: 'Subjects' },
    { to: '/hod/co-attainment', icon: Calculator, label: 'CO' },
    { to: '/hod/atr-review', icon: ClipboardList, label: 'ATR Review' },
    { to: '/hod/reports', icon: FileText, label: 'Reports' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
  faculty: [
    { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/faculty/subjects', icon: BookMarked, label: 'My Subjects' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
  iqac: [
    { to: '/iqac/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/iqac/po-attainment', icon: BarChart3, label: 'Attainment' },
    { to: '/iqac/nba-report', icon: Award, label: 'NBA' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
};

const ROLE_LABELS = {
  admin: 'Super Admin',
  hod: 'HOD',
  faculty: 'Faculty',
  iqac: 'IQAC',
};

const ROLE_COLORS = {
  admin: 'linear-gradient(135deg, #ef4444, #b91c1c)',
  hod: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  faculty: 'linear-gradient(135deg, #10b981, #059669)',
  iqac: 'linear-gradient(135deg, #f59e0b, #d97706)',
};

export default function Sidebar({ isCollapsed, onToggleCollapse }) {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const links = NAV_CONFIG[role] || NAV_CONFIG.faculty;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ── Sidebar Content Component ──────────────────────────────────────────
  const SidebarContent = ({ mini }) => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={`flex items-center border-b border-white/10 ${mini ? 'justify-center px-3 py-6' : 'px-5 py-6 gap-3'}`}>
        {!mini ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white p-1.5 shadow-lg">
              <img src={logo} alt="logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight tracking-wide font-display">SECE CO-PO</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter font-semibold">Attainment Portal</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white p-1.5 shadow-lg">
            <img src={logo} alt="logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* Desktop Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          title={mini ? 'Expand' : 'Collapse'}
        >
          {mini ? <ChevronRight size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* User Profile Section */}
      {!mini ? (
        <div className="px-5 py-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden"
              style={{ background: !user?.profile_photo ? (ROLE_COLORS[role] || 'var(--primary-500)') : 'transparent' }}
            >
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#60A5FA' }}>
                {ROLE_LABELS[role]}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-5 border-b border-white/10 bg-white/5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden"
            style={{ background: !user?.profile_photo ? (ROLE_COLORS[role] || 'var(--primary-500)') : 'transparent' }}
          >
            {user?.profile_photo ? (
              <img src={user.profile_photo} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>
            )}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className={`flex-1 py-6 space-y-1 overflow-y-auto ${mini ? 'px-2' : 'px-4'}`}>
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={mini ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${mini ? 'justify-center px-2 py-3' : 'px-4 py-3'} ${
                isActive
                ? 'sidebar-active-glow text-white shadow-lg bg-blue-600/10'
                : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              }`
            }
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!mini && <span className="flex-1 truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className={`py-4 border-t border-white/10 ${mini ? 'px-2' : 'px-4'}`}>
        <button
          onClick={handleLogout}
          title={mini ? 'Sign Out' : undefined}
          className={`flex items-center gap-3 w-full rounded-xl text-sm font-bold text-white/50 hover:bg-red-500/15 hover:text-red-400 transition-all duration-200 ${mini ? 'justify-center px-2 py-3' : 'px-4 py-3'}`}
        >
          <LogOut size={18} />
          {!mini && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="mobile-bottom-nav md:hidden">
        {links.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? 'mobile-bottom-nav-item--active' : ''}`
            }
          >
            <div className="mobile-bottom-nav-icon-wrap">
              <item.icon size={22} />
            </div>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
        
        {/* Logout on Mobile */}
        <button onClick={handleLogout} className="mobile-bottom-nav-item">
          <div className="mobile-bottom-nav-icon-wrap text-red-500">
            <LogOut size={22} />
          </div>
          <span className="mobile-bottom-nav-label text-red-500">Logout</span>
        </button>
      </nav>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-300 sidebar-glass ${isCollapsed ? 'w-20' : 'w-72'}`}
      >
        <SidebarContent mini={isCollapsed} />
      </aside>
    </>
  );
}
