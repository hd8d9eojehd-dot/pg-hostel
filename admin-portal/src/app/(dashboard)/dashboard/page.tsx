'use client'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, formatDateTime, statusColor } from '@/lib/utils'
import api from '@/lib/api'
import Link from 'next/link'
import { Users, BedDouble, AlertTriangle, MessageSquare, DoorOpen, Clock, TrendingUp, IndianRupee, Activity, RefreshCw } from 'lucide-react'
// PERF FIX: Lazy-load recharts — it's 200KB+ and only needed for the charts section
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'

// PERF FIX: Lazy load chart components — they're heavy and below the fold
const BarChart = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => ({ default: m.Bar })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => ({ default: m.Legend })), { ssr: false })

const PIE_COLORS: Record<string, string> = { available: '#22c55e', occupied: '#ef4444', partial: '#f59e0b', maintenance: '#f97316', blocked: '#6b7280' }

export default function DashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data),
    refetchInterval: 60_000,
    // PERF FIX: Use global staleTime (5min) — removed local 30s override
  })

  const { data: occupancy, refetch: refetchOcc } = useQuery({
    queryKey: ['occupancy'],
    queryFn: () => api.get('/dashboard/occupancy').then(r => r.data.data),
    refetchInterval: 60_000,
    // PERF FIX: Use global staleTime (5min)
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
    { label: 'Overdue Invoices', value: stats.overdueInvoices ?? 0, sub: `₹${Number(stats.totalPending ?? 0).toLocaleString('en-IN')} pending`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', href: '/finance/defaulters' },
    { label: 'Open Complaints', value: stats.pendingComplaints ?? 0, sub: 'Pending resolution', icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50', href: '/complaints' },
    { label: 'Pending Outpasses', value: stats.pendingOutpasses ?? 0, sub: 'Awaiting approval', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50', href: '/outpass' },
    { label: 'Expiring Stays', value: stats.expiringStays ?? 0, sub: 'Within 7 days', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/reports' },
  ]

  const pieData = (occupancy ?? []).map((o: { status: string; _count: number }) => ({ name: o.status, value: o._count }))

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Last updated */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p className="text-xs text-gray-400 flex-shrink-0">Updated: {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : '—'}</p>
            {data?.stats && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-green-600 font-medium">₹{Number(data.stats.thisMonthCollected ?? 0).toLocaleString('en-IN')} this month</span>
                <span className="text-red-500 font-medium">₹{Number(data.stats.totalPending ?? 0).toLocaleString('en-IN')} pending</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Revenue chart — lazy loaded */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" /> Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.monthlyRevenue ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Occupancy — lazy loaded */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BedDouble className="w-4 h-4 text-primary" /> Room Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {pieData.map((entry: { name: string }, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[entry.name] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent payments */}
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
                      <p className="text-xs text-gray-400">{p.student.studentId} · {p.receiptNumber}</p>
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

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-primary" /> Recent Activity</CardTitle>
              </div>
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

export default function DashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data),
    refetchInterval: 60_000, // auto-refresh every 60s (was 30s)
    staleTime: 30_000,
  })

  const { data: occupancy, refetch: refetchOcc } = useQuery({
    queryKey: ['occupancy'],
    queryFn: () => api.get('/dashboard/occupancy').then(r => r.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
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
    { label: 'Overdue Invoices', value: stats.overdueInvoices ?? 0, sub: `₹${Number(stats.totalPending ?? 0).toLocaleString('en-IN')} pending`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', href: '/finance/defaulters' },
    { label: 'Open Complaints', value: stats.pendingComplaints ?? 0, sub: 'Pending resolution', icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50', href: '/complaints' },
    { label: 'Pending Outpasses', value: stats.pendingOutpasses ?? 0, sub: 'Awaiting approval', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50', href: '/outpass' },
    { label: 'Expiring Stays', value: stats.expiringStays ?? 0, sub: 'Within 7 days', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/reports' },
  ]

  const pieData = (occupancy ?? []).map((o: { status: string; _count: number }) => ({ name: o.status, value: o._count }))

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Last updated */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p className="text-xs text-gray-400 flex-shrink-0">Updated: {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : '—'}</p>
            {data?.stats && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-green-600 font-medium">₹{Number(data.stats.thisMonthCollected ?? 0).toLocaleString('en-IN')} this month</span>
                <span className="text-red-500 font-medium">₹{Number(data.stats.totalPending ?? 0).toLocaleString('en-IN')} pending</span>
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
            <Link key={label} href={href}>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Revenue chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" /> Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.monthlyRevenue ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Occupancy */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BedDouble className="w-4 h-4 text-primary" /> Room Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {pieData.map((entry: { name: string }, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent payments */}
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
                      <p className="text-xs text-gray-400">{p.student.studentId} · {p.receiptNumber}</p>
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

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-primary" /> Recent Activity</CardTitle>
              </div>
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
