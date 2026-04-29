'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  LayoutDashboard, Users, BedDouble, IndianRupee, UtensilsCrossed,
  MessageSquare, Bell, DoorOpen,
  BarChart3, Settings, LogOut, Building2, Star, Wifi, KeyRound,
  GraduationCap, ChevronDown, ChevronUp,
} from 'lucide-react'
import { SemesterAdvancePanel } from './semester-advance-panel'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/finance', label: 'Finance', icon: IndianRupee },
  { href: '/food', label: 'Food Menu', icon: UtensilsCrossed },
  { href: '/complaints', label: 'Complaints', icon: MessageSquare },
  { href: '/notices', label: 'Notices', icon: Bell },
  { href: '/outpass', label: 'Outpass', icon: DoorOpen },
  { href: '/whatsapp', label: 'WhatsApp', icon: Wifi },
  { href: '/feedback', label: 'Feedback', icon: Star },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const [semPanelOpen, setSemPanelOpen] = useState(false)

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
      <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate text-sm">{pgName}</p>
          <p className="text-xs text-gray-500 truncate">Admin Portal</p>
        </div>
      </div>

      {/* Nav — scrollable */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[2.75rem]',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}

        {/* ── Semester Advance Section ── */}
        <div className="pt-2 mt-1 border-t border-gray-100">
          <button
            onClick={() => setSemPanelOpen(v => !v)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors min-h-[2.75rem]"
          >
            <GraduationCap className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1 text-left">Advance Semester</span>
            {semPanelOpen
              ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            }
          </button>

          {semPanelOpen && (
            <div className="mt-1 ml-2 border-l-2 border-indigo-100 pl-1">
              <SemesterAdvancePanel onClose={onClose} />
            </div>
          )}
        </div>
      </nav>

      {/* User section */}
      <div className="px-2 py-3 border-t flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 mb-1">
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
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors mb-0.5 min-h-[2.75rem]"
        >
          <KeyRound className="w-4 h-4 flex-shrink-0" />
          Change Password
        </Link>
        <button
          onClick={clearAuth}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[2.75rem]"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}
