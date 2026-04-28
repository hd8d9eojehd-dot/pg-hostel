import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'staff'
  branchId?: string
}

interface AuthState {
  user: AdminUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: AdminUser, token: string, refreshToken?: string) => void
  clearAuth: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, token, refreshToken) => {
        if (typeof window !== 'undefined') localStorage.setItem('admin_token', token)
        set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true })
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'admin-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
