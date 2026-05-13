import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProfile } from '@workspace/api-client-react'

type AuthState = {
  accessToken: string | null
  user: UserProfile | null
  setAuth: (token: string, user: UserProfile) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => {
        localStorage.setItem('accessToken', accessToken)
        set({ accessToken, user })
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken')
        set({ accessToken: null, user: null })
      }
    }),
    { name: 'obe-auth' }
  )
)
