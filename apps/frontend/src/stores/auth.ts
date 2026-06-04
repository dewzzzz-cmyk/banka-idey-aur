import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@portal/types'

interface AuthStore {
  user: User | null
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        set({ user: null })
      },
    }),
    { name: 'auth-store' }
  )
)
