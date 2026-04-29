'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import api from '@/lib/api'
import Link from 'next/link'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats-header'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data?.stats),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const totalAlerts =
    (stats?.overdueInvoices ?? 0) +
    (stats?.pendingComplaints ?? 0) +
    (stats?.pendingOutpasses ?? 0)

  const alerts = [
    stats?.overdueInvoices > 0 && {
      label: `${stats.overdueInvoices} overdue invoice${stats.overdueInvoices > 1 ? 's' : ''}`,
      href: '/finance/defaulters',
      color: 'text-red-600',
    },
    stats?.pendingComplaints > 0 && {
      label: `${stats.pendingComplaints} open complaint${stats.pendingComplaints > 1 ? 's' : ''}`,
      href: '/complaints',
      color: 'text-orange-600',
    },
    stats?.pendingOutpasses > 0 && {
      label: `${stats.pendingOutpasses} pending outpass${stats.pendingOutpasses > 1 ? 'es' : ''}`,
      href: '/outpass',
      color: 'text-purple-600',
    },
    stats?.expiringStays > 0 && {
      label: `${stats.expiringStays} stay${stats.expiringStays > 1 ? 's' : ''} expiring soon`,
      href: '/reports',
      color: 'text-yellow-600',
    },
  ].filter(Boolean) as Array<{ label: string; href: string; color: string }>

  return (
    <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center gap-3 border-b bg-white/95 backdrop-blur-sm px-3 md:px-6">
      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-9 h-9 flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[min(16rem,80vw)]" hideClose>
          <Sidebar onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <h1 className="text-base md:text-lg font-semibold text-gray-900 flex-1 truncate min-w-0">
        {title}
      </h1>

      {/* Notification bell */}
      <div className="relative flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="relative w-9 h-9"
          onClick={() => setNotifOpen(!notifOpen)}
          aria-label="Notifications"
          aria-expanded={notifOpen}
        >
          <Bell className="h-5 w-5" />
          {totalAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </span>
          )}
        </Button>

        {/* Dropdown — constrained width, won't clip on mobile */}
        {notifOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setNotifOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-1 z-50 w-[min(18rem,calc(100vw-1.5rem))] bg-white rounded-xl shadow-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                {totalAlerts === 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">All clear!</p>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  ✅ No pending actions
                </div>
              ) : (
                <div>
                  {alerts.map(({ label, href, color }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-0 transition-colors min-h-[2.75rem]"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.replace('text-', 'bg-')}`} />
                      <p className={`text-sm ${color}`}>{label}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
