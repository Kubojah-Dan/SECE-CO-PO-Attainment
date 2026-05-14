import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, Role, User } from './authTypes'

/* ─────────────────────────────────────────────────────
   MOCK CREDENTIALS  (replace with real API when backend is ready)
   ───────────────────────────────────────────────────── */
interface MockAccount {
  email: string
  password: string
  user: User
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email:    'admin@obe.edu',
    password: 'admin123',
    user: {
      id:    'usr_001',
      name:  'Admin User',
      email: 'admin@obe.edu',
      role:  'super_admin',
    },
  },
  {
    email:    'hod@obe.edu',
    password: 'hod123',
    user: {
      id:    'usr_002',
      name:  'Dr. R. Krishnamurthy',
      email: 'hod@obe.edu',
      role:  'hod',
    },
  },
  {
    email:    'faculty@obe.edu',
    password: 'faculty123',
    user: {
      id:    'usr_003',
      name:  'Prof. S. Meenakshi',
      email: 'faculty@obe.edu',
      role:  'faculty',
    },
  },
  {
    email:    'iqac@obe.edu',
    password: 'iqac123',
    user: {
      id:    'usr_004',
      name:  'IQAC Coordinator',
      email: 'iqac@obe.edu',
      role:  'iqac',
    },
  },
]

/* ─── Mock login — simulates a 400ms network delay ─── */
async function mockLogin(
  email: string,
  password: string,
  role: Role
): Promise<{ token: string; user: User }> {
  await new Promise((res) => setTimeout(res, 400))   // fake latency

  const account = MOCK_ACCOUNTS.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() &&
      a.password === password &&
      a.user.role === role
  )

  if (!account) {
    throw new Error('Invalid credentials. Check your email, password and selected role.')
  }

  return { token: `mock-token-${account.user.id}`, user: account.user }
}

/* ─── Zustand store ─── */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string, role: Role) => {
        const { token, user } = await mockLogin(email, password, role)
        set({ token, user, isAuthenticated: true })
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'obe_auth' }
  )
)
