import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface StudentUser {
  id: string
  studentId: string
  name: string
  isFirstLogin: boolean
}

interface AuthState {
  user: StudentUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: StudentUser, token: string, refreshToken?: string) => void
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
        if (typeof window !== 'undefined') localStorage.setItem('student_token', token)
        set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true })
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('student_token')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'student-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
