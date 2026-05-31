/**
 * SECE CO-PO Platform — Sidebar Layout Component
 * Refactored for mobile-first design and premium collapsible logic
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, LogOut, ChevronRight, PanelLeftClose, X,
  Network, CalendarDays, Scale, Layers, Users2, BookOpenCheck,
  DatabaseZap, TrendingUp, CircleUser, Settings2,
  Calculator, ClipboardList, FileText, Award, BarChart3,
  BookMarked
} from 'lucide-react';

// ── Navigation config per role ─────────────────────────────────
const NAV_CONFIG = {
  admin: [
    { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/admin/departments',   icon: Network,         label: 'Depts'         },
    { to: '/admin/academic-years',icon: CalendarDays,    label: 'Academic Years'},
    { to: '/admin/regulations',   icon: Scale,           label: 'Regulations'   },
    { to: '/admin/sections',      icon: Layers,          label: 'Sections'      },
    { to: '/admin/users',         icon: Users2,          label: 'Users'         },
    { to: '/admin/subjects',      icon: BookOpenCheck,   label: 'Subjects'      },
    { to: '/admin/excel-tools',   icon: DatabaseZap,     label: 'Excel Tools'   },
    { to: '/admin/analytics',     icon: TrendingUp,      label: 'Analytics'     },
    { to: '/profile',             icon: CircleUser,      label: 'Profile'       },
    { to: '/admin/settings',      icon: Settings2,       label: 'Settings'      },
  ],
  hod: [
    { to: '/hod/dashboard',       icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/hod/faculty',         icon: Users2,          label: 'Faculty'       },
    { to: '/hod/subjects',        icon: BookOpenCheck,   label: 'Subjects'      },
    { to: '/hod/co-attainment',   icon: Calculator,      label: 'CO'            },
    { to: '/hod/atr-review',      icon: ClipboardList,   label: 'ATR Review'    },
    { to: '/hod/reports',         icon: FileText,        label: 'Reports'       },
    { to: '/profile',             icon: CircleUser,      label: 'Profile'       },
  ],
  faculty: [
    { to: '/faculty/dashboard',   icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/faculty/subjects',    icon: BookOpenCheck,   label: 'My Subjects'   },
    { to: '/profile',             icon: CircleUser,      label: 'Profile'       },
  ],
  iqac: [
    { to: '/iqac/dashboard',      icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/iqac/po-attainment',  icon: TrendingUp,      label: 'Attainment'    },
    { to: '/iqac/nba-report',     icon: Award,           label: 'NBA'           },
    { to: '/profile',             icon: CircleUser,      label: 'Profile'       },
  ],
  staff: [
    { to: '/staff/subjects',      icon: BookMarked,      label: 'Mark Entry'    },
    { to: '/profile',             icon: CircleUser,      label: 'Profile'       },
  ],
};

const ROLE_LABELS = {
  admin: 'Super Admin',
  hod: 'HOD',
  faculty: 'Faculty',
  iqac: 'IQAC',
  staff: 'HR Staff',
};

const ROLE_COLORS = {
  admin: 'linear-gradient(135deg, #ef4444, #b91c1c)',
  hod: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  faculty: 'linear-gradient(135deg, #10b981, #059669)',
  iqac: 'linear-gradient(135deg, #f59e0b, #d97706)',
  staff: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
};

export default function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
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
      <div className={`flex items-center border-b border-white/5 ${mini ? 'justify-center px-3 py-6' : 'px-5 py-6 gap-3'}`}>
        {!mini ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white p-1 shadow-sm">
              <img src="https://ik.imagekit.io/syustaging/SYU_PREPROD/LOGO_J2QP76yKfA.webp?tr=w-3840" alt="logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm leading-tight tracking-wide">SECE CO-PO</p>
              <p className="text-[11px] text-white/50 font-normal tracking-tight">Attainment Portal</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white p-1 shadow-sm">
            <img src="https://ik.imagekit.io/syustaging/SYU_PREPROD/LOGO_J2QP76yKfA.webp?tr=w-3840" alt="logo" className="w-full h-full object-contain" />
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
        <div className="px-5 py-5 border-b border-white/5 bg-white/[0.03]">
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
              <p className="text-sm font-semibold text-white truncate">{user?.first_name} {user?.last_name}</p>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/60">
                {ROLE_LABELS[role]}
              </span>
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
              `flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out ${mini ? 'justify-center px-2 py-3' : 'px-4 py-2.5'} ${
                isActive
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
            {!mini && <span className="flex-1 truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className={`py-4 border-t border-white/5 ${mini ? 'px-2' : 'px-4'}`}>
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
      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] md:hidden"
            />
            
            {/* Drawer Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-slate-900 z-[101] shadow-2xl md:hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={onCloseMobile}
                  className="p-2 rounded-xl bg-white/10 text-white/70 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent mini={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="mobile-bottom-nav md:hidden overflow-x-auto justify-start px-4 gap-2 scrollbar-hide">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-bottom-nav-item min-w-[72px] ${isActive ? 'mobile-bottom-nav-item--active' : ''}`
            }
          >
            <div className="mobile-bottom-nav-icon-wrap">
              <item.icon size={20} />
            </div>
            <span className="mobile-bottom-nav-label whitespace-nowrap">{item.label}</span>
          </NavLink>
        ))}
        
        {/* Logout on Mobile */}
        <button onClick={handleLogout} className="mobile-bottom-nav-item min-w-[72px]">
          <div className="mobile-bottom-nav-icon-wrap text-red-500">
            <LogOut size={20} />
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
