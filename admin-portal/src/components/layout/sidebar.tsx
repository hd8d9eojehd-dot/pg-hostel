'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  LayoutDashboard, Users, BedDouble, IndianRupee, UtensilsCrossed,
  MessageSquare, Bell, DoorOpen, FileText,
  BarChart3, Settings, LogOut, Building2, Star, Wifi, KeyRound,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/finance', label: 'Finance', icon: IndianRupee },
  { href: '/food', label: 'Food Menu', icon: UtensilsCrossed },
  { href: '/complaints', label: 'Complaints', icon: MessageSquare },
  { href: '/notices', label: 'Notices', icon: Bell },
  { href: '/outpass', label: 'Outpass', icon: DoorOpen },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/whatsapp', label: 'WhatsApp', icon: Wifi },
  { href: '/feedback', label: 'Feedback', icon: Star },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()

  const { data: branch } = useQuery({
    queryKey: ['branch-name', user?.branchId],
    queryFn: () => api.get(`/settings/branch/${user?.branchId}`).then(r => r.data.data),
    enabled: !!user?.branchId,
    staleTime: 60_000,
  })

  const pgName = branch?.name ?? 'PG Hostel'

  return (
    <div className="flex flex-col h-full bg-white border-r overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{pgName}</p>
          <p className="text-xs text-gray-500 truncate">Admin Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 mb-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <Link
          href="/change-password"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors mb-1"
        >
          <KeyRound className="w-4 h-4" />
          Change Password
        </Link>
        <button
          onClick={clearAuth}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
