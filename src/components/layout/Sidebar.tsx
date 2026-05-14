import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Target,
  Settings2,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Download,
  ClipboardEdit,
  GitBranch,
  TrendingUp,
  Award,
  FileDown,
  LogOut,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/useAuthStore'
import type { Role } from '@/features/auth/authTypes'
import logoUrl from '@/assets/logo.svg'
import { clsx } from 'clsx'

/* ─── Types ─── */
interface NavItem {
  label: string
  path: string
  Icon: LucideIcon
}

/* ─── Nav config per role ─── */
const NAV_CONFIG: Record<Role, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard',   path: '/admin/dashboard',   Icon: LayoutDashboard },
    { label: 'Departments', path: '/admin/departments',  Icon: Building2       },
    { label: 'Users',       path: '/admin/users',        Icon: Users           },
    { label: 'Subjects',    path: '/admin/subjects',     Icon: BookOpen        },
    { label: 'Students',    path: '/admin/students',     Icon: GraduationCap   },
    { label: 'Regulations', path: '/admin/regulations',  Icon: FileText        },
    { label: 'PO / PSO',    path: '/admin/po-pso',       Icon: Target          },
    { label: 'Settings',    path: '/admin/settings',     Icon: Settings2       },
    { label: 'Audit Logs',  path: '/admin/audit',        Icon: ClipboardList   },
  ],
  hod: [
    { label: 'Dashboard',     path: '/hod/dashboard',      Icon: LayoutDashboard },
    { label: 'Subjects',      path: '/hod/subjects',        Icon: BookOpen        },
    { label: 'Faculty',       path: '/hod/faculty',         Icon: Users           },
    { label: 'Approvals',     path: '/hod/approvals',       Icon: CheckSquare     },
    { label: 'PO Attainment', path: '/hod/po-attainment',   Icon: BarChart3       },
    { label: 'Reports',       path: '/hod/reports',         Icon: Download        },
  ],
  faculty: [
    { label: 'Dashboard',   path: '/faculty/dashboard',  Icon: LayoutDashboard },
    { label: 'My Subjects', path: '/faculty/subjects',   Icon: BookOpen        },
    { label: 'Mark Entry',  path: '/faculty/marks',      Icon: ClipboardEdit   },
    { label: 'CO Mapping',  path: '/faculty/co-mapping', Icon: GitBranch       },
    { label: 'Attainment',  path: '/faculty/attainment', Icon: TrendingUp      },
    { label: 'Reports',     path: '/faculty/reports',    Icon: Download        },
  ],
  iqac: [
    { label: 'Dashboard',  path: '/iqac/dashboard',      Icon: LayoutDashboard },
    { label: 'Analytics',  path: '/iqac/analytics',      Icon: BarChart3       },
    { label: 'Reports',    path: '/iqac/reports',        Icon: FileDown        },
    { label: 'NBA / NAAC', path: '/iqac/accreditation',  Icon: Award           },
  ],
}

/* ─── Role accent classes ─── */
const ROLE_ACTIVE: Record<Role, { bg: string; text: string; border: string; avatarBg: string }> = {
  super_admin: {
    bg: 'bg-brand-50',
    text: 'text-brand-900',
    border: 'border-l-2 border-brand-900',
    avatarBg: 'bg-brand-900',
  },
  hod: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-l-2 border-teal-600',
    avatarBg: 'bg-teal-600',
  },
  faculty: {
    bg: 'bg-brand-50',
    text: 'text-brand-500',
    border: 'border-l-2 border-brand-500',
    avatarBg: 'bg-brand-500',
  },
  iqac: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-l-2 border-amber-700',
    avatarBg: 'bg-amber-700',
  },
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  hod: 'Head of Department',
  faculty: 'Faculty',
  iqac: 'IQAC Coordinator',
}

/* ─── Initials helper ─── */
function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/* ─── Sidebar component ─── */
interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const role = (user?.role ?? 'faculty') as Role
  const navItems = NAV_CONFIG[role]
  const accent = ROLE_ACTIVE[role]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-brand-100">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-brand-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-900 flex items-center justify-center shrink-0">
            <img src={logoUrl} alt="" className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-brand-950 text-[13px] font-medium tracking-tight">
            OBE Attain
          </span>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          className="md:hidden text-brand-300 hover:text-brand-700 transition-colors"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2.5 px-3 rounded-lg h-9 text-[12px] transition-colors duration-100',
                    isActive
                      ? clsx(accent.bg, accent.text, accent.border, 'font-medium')
                      : 'text-brand-300 hover:bg-brand-50 hover:text-brand-950 font-normal'
                  )
                }
              >
                <item.Icon size={15} aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User chip + logout */}
      <div className="px-3 py-4 border-t border-brand-100">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0',
              accent.avatarBg
            )}
            aria-hidden="true"
          >
            {initials(user?.name ?? 'User')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-brand-950 text-[12px] font-medium truncate leading-tight">
              {user?.name ?? 'User'}
            </p>
            <p className="text-brand-300 text-[11px] truncate leading-tight">
              {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 h-9 rounded-lg text-[12px] text-brand-300 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={14} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-brand-950/40"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="relative z-50 w-[220px] flex flex-col h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
