'use client'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import api from '@/lib/api'
import Link from 'next/link'
import { Users, BedDouble, AlertTriangle, MessageSquare, DoorOpen, Clock, TrendingUp, IndianRupee, Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
// PERF FIX: Lazy-load the entire charts section — recharts is 200KB+ and below the fold
import dynamic from 'next/dynamic'

const DashboardCharts = dynamic(() => import('@/components/dashboard/charts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 h-64 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  ),
})

export default function DashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const { data: occupancy, refetch: refetchOcc } = useQuery({
    queryKey: ['occupancy'],
    queryFn: () => api.get('/dashboard/occupancy').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const handleRefresh = () => { refetch(); refetchOcc() }

  if (isLoading) return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-4"><div className="h-20 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
      </div>
    </div>
  )

  const stats = data?.stats ?? {}
  const statCards = [
    { label: 'Total Students', value: stats.totalStudents ?? 0, sub: `${stats.activeStudents ?? 0} active`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/students' },
    { label: 'Available Rooms', value: stats.availableRooms ?? 0, sub: `of ${stats.totalRooms ?? 0} total`, icon: BedDouble, color: 'text-green-600', bg: 'bg-green-50', href: '/rooms' },
    { label: 'Overdue Invoices', value: stats.overdueInvoices ?? 0, sub: `Rs.${Number(stats.totalPending ?? 0).toLocaleString('en-IN')} pending`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', href: '/finance/defaulters' },
    { label: 'Open Complaints', value: stats.pendingComplaints ?? 0, sub: 'Pending resolution', icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50', href: '/complaints' },
    { label: 'Pending Outpasses', value: stats.pendingOutpasses ?? 0, sub: 'Awaiting approval', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50', href: '/outpass' },
    { label: 'Expiring Stays', value: stats.expiringStays ?? 0, sub: 'Within 7 days', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/reports' },
  ]

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p className="text-xs text-gray-400 flex-shrink-0">Updated: {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : '—'}</p>
            {data?.stats && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-green-600 font-medium">Rs.{Number(data.stats.thisMonthCollected ?? 0).toLocaleString('en-IN')} this month</span>
                <span className="text-red-500 font-medium">Rs.{Number(data.stats.totalPending ?? 0).toLocaleString('en-IN')} pending</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 flex-shrink-0" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          {statCards.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href} prefetch={true}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-3 md:p-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 ${bg} rounded-xl flex items-center justify-center mb-2 md:mb-3`}>
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color}`} />
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5 leading-tight">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{sub}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* PERF FIX: Charts lazy-loaded in separate component */}
        <DashboardCharts
          monthlyRevenue={data?.monthlyRevenue ?? []}
          occupancy={occupancy ?? []}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><IndianRupee className="w-4 h-4 text-primary" /> Recent Payments</CardTitle>
                <Link href="/finance" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(data?.recentPayments ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No recent payments</p>
              ) : (
                (data?.recentPayments ?? []).map((p: { id: string; receiptNumber: string; amount: number; paymentMode: string; paidDate: string; student: { name: string; studentId: string } }) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b last:border-0 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium">{p.student.name}</p>
                      <p className="text-xs text-gray-400">{p.student.studentId} - {p.receiptNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.paidDate)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-primary" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(data?.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
              ) : (
                (data?.recentActivity ?? []).map((a: { id: string; action: string; entityType: string; createdAt: string; admin: { name: string } }) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3 border-b last:border-0 hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${a.action === 'CREATED' ? 'bg-green-100 text-green-700' : a.action === 'UPDATED' ? 'bg-blue-100 text-blue-700' : a.action === 'DELETED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {a.action.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm"><span className="font-medium">{a.admin.name}</span> <span className="text-gray-500">{a.action.toLowerCase()}</span> <span className="capitalize text-gray-700">{a.entityType.toLowerCase()}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
