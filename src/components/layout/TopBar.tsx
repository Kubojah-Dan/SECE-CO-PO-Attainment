import { Bell, Menu } from 'lucide-react'
import { useAuthStore } from '@/features/auth/useAuthStore'
import type { Role } from '@/features/auth/authTypes'
import { clsx } from 'clsx'

interface TopBarProps {
  title: string
  onMenuClick: () => void
}

const ROLE_AVATAR_BG: Record<Role, string> = {
  super_admin: 'bg-brand-900',
  hod:         'bg-teal-600',
  faculty:     'bg-brand-500',
  iqac:        'bg-amber-700',
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { user } = useAuthStore()
  const role = (user?.role ?? 'faculty') as Role

  return (
    <header className="flex items-center justify-between px-7 h-14 border-b border-brand-100 bg-white shrink-0">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden text-brand-300 hover:text-brand-700 transition-colors"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-brand-950 text-[15px] font-medium">{title}</h1>
      </div>

      {/* Right: notifications + user chip */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
        >
          <Bell size={16} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
              ROLE_AVATAR_BG[role]
            )}
            aria-hidden="true"
          >
            {initials(user?.name ?? 'U')}
          </div>
          <span className="hidden sm:block text-brand-950 text-[12px] font-medium max-w-[120px] truncate">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  )
}
