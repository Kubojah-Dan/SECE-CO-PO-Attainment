import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ToastContainer } from '@/components/ui/Toast'

/* ─── Page title map (path segment → label) ─── */
const PAGE_TITLES: Record<string, string> = {
  dashboard:    'Dashboard',
  departments:  'Departments',
  users:        'Users',
  subjects:     'Subjects',
  students:     'Students',
  regulations:  'Regulations',
  'po-pso':     'PO / PSO',
  settings:     'Settings',
  audit:        'Audit Logs',
  faculty:      'Faculty',
  approvals:    'Approvals',
  'po-attainment': 'PO Attainment',
  reports:      'Reports',
  marks:        'Mark Entry',
  'co-mapping': 'CO Mapping',
  attainment:   'Attainment',
  analytics:    'Analytics',
  accreditation:'NBA / NAAC',
}

function getPageTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).pop() ?? ''
  return PAGE_TITLES[segment] ?? 'OBE Attain'
}

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden">
      {/* Sidebar (handles both desktop + mobile internally) */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content column */}
      <div className="flex flex-1 flex-col min-w-0 h-screen">
        <TopBar
          title={pageTitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-7">
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
