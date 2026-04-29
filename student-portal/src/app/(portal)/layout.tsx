'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  // Track if we already redirected to avoid loops
  const redirectedRef = useRef(false)

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
