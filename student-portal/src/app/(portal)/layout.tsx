'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated, clearAuth } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  // Track if we already redirected to avoid loops
  const redirectedRef = useRef(false)

  // Check if student account is still active (vacated/deleted check)
  const { data: profileData, isError: profileError } = useQuery({
    queryKey: ['my-profile-status'],
    queryFn: () => api.get('/portal/profile').then(r => r.data.data),
    enabled: isAuthenticated && _hasHydrated,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!_hasHydrated) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    // Only redirect to change-password if isFirstLogin is STILL true in the persisted store
    // Use a ref to prevent repeated redirects in the same session
    if (user?.isFirstLogin && !redirectedRef.current) {
      redirectedRef.current = true
      router.replace('/change-password')
    }
  }, [_hasHydrated, isAuthenticated, user?.isFirstLogin, router])

  // Reset redirect ref when isFirstLogin becomes false
  useEffect(() => {
    if (user && !user.isFirstLogin) {
      redirectedRef.current = false
    }
  }, [user?.isFirstLogin])

  // Wait for localStorage rehydration
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  // If still first login, show spinner while redirecting (don't render portal content)
  if (user?.isFirstLogin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If profile fetch failed (404 = deleted) or student is vacated — show deactivated screen
  const isVacated = profileData?.status === 'vacated'
  const isDeleted = profileError

  if (isVacated || isDeleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isDeleted ? 'Account Not Found' : 'Account Deactivated'}
        </h1>
        <p className="text-gray-500 text-sm max-w-xs mb-6">
          {isDeleted
            ? 'Your student ID has been removed from the system. Please contact the PG admin for assistance.'
            : 'Your student account has been deactivated. Please contact the PG admin for assistance.'}
        </p>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 w-full max-w-xs space-y-2 text-sm">
          <p className="font-semibold text-gray-700">Contact PG Admin</p>
          <p className="text-gray-500">Visit the PG office or call the admin directly.</p>
        </div>
        <button
          onClick={() => { clearAuth(); router.replace('/login') }}
          className="mt-6 text-sm text-primary underline"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 overflow-hidden">
      {/* Main scrollable content area — sits above fixed bottom nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
