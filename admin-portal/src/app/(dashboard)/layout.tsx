'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

  // Show spinner while rehydrating from localStorage
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <aside className="hidden md:block w-64 flex-shrink-0 border-r bg-white h-[100dvh] overflow-hidden fixed left-0 top-0 bottom-0 z-30">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-y-auto min-w-0 md:ml-64">
        {children}
      </main>
    </div>
  )
}
