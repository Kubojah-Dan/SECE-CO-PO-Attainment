export type Role = 'super_admin' | 'hod' | 'faculty' | 'iqac'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string, role: Role) => Promise<void>
  logout: () => void
}

export const ROLE_ROUTES: Record<Role, string> = {
  super_admin: '/admin/dashboard',
  hod:         '/hod/dashboard',
  faculty:     '/faculty/dashboard',
  iqac:        '/iqac/dashboard',
}
