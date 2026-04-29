'use client'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Bell } from 'lucide-react'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuthStore()

  const { data: branch } = useQuery({
    queryKey: ['portal-branch'],
    queryFn: () => api.get('/portal/home').then(r => r.data.data?.branch),
    staleTime: 60_000,
    retry: false,
  })

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/portal/profile').then(r => r.data.data),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const pgName = branch?.name ?? 'My PG'
  const avatarUrl = profile?.avatarUrl
  const initials = user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b px-4 flex items-center justify-between"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
        paddingBottom: '0.75rem',
      }}
    >
      <div className="min-w-0 flex-1 mr-3">
        {title ? (
          <h1 className="font-semibold text-gray-900 text-base truncate">{title}</h1>
        ) : (
          <>
            <p className="text-xs text-gray-500 truncate">{pgName}</p>
            <h1 className="font-semibold text-gray-900 text-base truncate">{user?.name}</h1>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name ?? 'Profile'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `<span class="text-sm font-bold text-primary">${initials}</span>`
                }
              }}
            />
          ) : (
            <span className="text-sm font-bold text-primary">{initials}</span>
          )}
        </div>
      </div>
    </header>
  )
}
