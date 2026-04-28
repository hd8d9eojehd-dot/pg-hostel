'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { BarChart3, Users, IndianRupee, AlertTriangle, Clock, MessageSquare, Download, RefreshCw, TrendingUp } from 'lucide-react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

type ReportType = 'occupancy' | 'revenue' | 'defaulters' | 'stay-expiry' | 'complaints' | 'students'

const REPORT_TABS = [
  { id: 'occupancy' as const, label: 'Occupancy', icon: BarChart3, color: 'text-blue-600' },
  { id: 'revenue' as const, label: 'Revenue', icon: IndianRupee, color: 'text-green-600' },
  { id: 'defaulters' as const, label: 'Defaulters', icon: AlertTriangle, color: 'text-red-600' },
  { id: 'stay-expiry' as const, label: 'Stay Expiry', icon: Clock, color: 'text-orange-600' },
  { id: 'complaints' as const, label: 'Complaints', icon: MessageSquare, color: 'text-purple-600' },
  { id: 'students' as const, label: 'Students', icon: Users, color: 'text-gray-600' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ReportsPage() {
  const { token } = useAuthStore()
  const [activeReport, setActiveReport] = useState<ReportType>('occupancy')
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', activeReport, month, year],
    queryFn: () => {
      const params = activeReport === 'revenue' ? { month, year } : {}
      return api.get(`/reports/${activeReport}`, { params }).then(r => r.data.data)
    },
    staleTime: 30_000,
  })

  // Export with auth token
  const handleExport = (path: string, filename: string) => {
    const url = `${API_URL}${path}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
      })
      .catch(() => alert('Export failed'))
  }

  const exportConfig: Partial<Record<ReportType, { path: string; filename: string }>> = {
    occupancy: { path: '/reports/occupancy/export', filename: 'occupancy-report.csv' },
    revenue: { path: `/reports/revenue/export?month=${month}&year=${year}`, filename: `revenue-${year}-${month}.csv` },
    defaulters: { path: '/reports/defaulters/export', filename: 'defaulters-report.csv' },
    students: { path: '/reports/students/export', filename: 'students-report.csv' },
  }

  const exportCfg = exportConfig[activeReport]

  return (
    <div>
      <Header title="Reports" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Report tabs */}
        <div className="flex flex-wrap gap-2">
          {REPORT_TABS.map(({ id, label, icon: Icon, color }) => (
            <Button key={id} variant={activeReport === id ? 'default' : 'outline'} size="sm"
              className="gap-1.5" onClick={() => setActiveReport(id)}>
              <Icon className={`w-3.5 h-3.5 ${activeReport === id ? 'text-white' : color}`} /> {label}
            </Button>
          ))}
        </div>

        {/* Revenue month/year picker */}
        {activeReport === 'revenue' && (
          <div className="flex gap-3 items-center flex-wrap">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Report card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="capitalize flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {activeReport.replace('-', ' ')} Report
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => refetch()}>
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
                {exportCfg && (
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => handleExport(exportCfg.path, exportCfg.filename)}>
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* OCCUPANCY */}
                {activeReport === 'occupancy' && Array.isArray(data) && (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b">
                      {['available', 'occupied', 'partial', 'maintenance'].map(s => {
                        const count = data.filter((r: { status: string }) => r.status === s).length
                        return (
                          <div key={s} className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-gray-500 capitalize mt-0.5">{s}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Room</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Floor</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Beds</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        </tr></thead>
                        <tbody>
                          {data.map((r: { id: string; roomNumber: string; roomType: string; status: string; bedCount: number; floor: { floorName?: string; floorNumber: number }; beds: Array<{ isOccupied: boolean }> }) => (
                            <tr key={r.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{r.roomNumber}</td>
                              <td className="px-4 py-3 hidden md:table-cell text-gray-600">{r.floor.floorName ?? `Floor ${r.floor.floorNumber}`}</td>
                              <td className="px-4 py-3 hidden md:table-cell capitalize text-gray-600">{r.roomType}</td>
                              <td className="px-4 py-3 text-gray-600">{r.beds?.filter((b: { isOccupied: boolean }) => b.isOccupied).length ?? 0}/{r.bedCount}</td>
                              <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status}</span></td>
                            </tr>
                          ))}
                          {!data.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No rooms found</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* REVENUE */}
                {activeReport === 'revenue' && data && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 p-4 border-b">
                      <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-xs text-gray-500">Total Collected</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalCollected ?? 0)}</p>
                        <p className="text-xs text-gray-400 mt-1">{(data.payments ?? []).length} payments</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-xl">
                        <p className="text-xs text-gray-500">Total Due</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totalDue ?? 0)}</p>
                        <p className="text-xs text-gray-400 mt-1">{(data.invoices ?? []).length} invoices</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Receipt</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Mode</th>
                        </tr></thead>
                        <tbody>
                          {(data.payments ?? []).map((p: { id: string; receiptNumber: string; amount: number; paymentMode: string; student: { name: string; studentId: string }; invoice: { type: string } }) => (
                            <tr key={p.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber}</td>
                              <td className="px-4 py-3"><p className="font-medium">{p.student.name}</p><p className="text-xs text-gray-400">{p.student.studentId}</p></td>
                              <td className="px-4 py-3 hidden md:table-cell capitalize text-gray-600">{p.invoice.type}</td>
                              <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(Number(p.amount))}</td>
                              <td className="px-4 py-3 hidden lg:table-cell capitalize text-gray-600">{p.paymentMode.replace('_', ' ')}</td>
                            </tr>
                          ))}
                          {!(data.payments ?? []).length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No payments this period</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DEFAULTERS */}
                {activeReport === 'defaulters' && Array.isArray(data) && (
                  <>
                    {data.length > 0 && (
                      <div className="p-4 border-b bg-red-50">
                        <p className="text-sm font-medium text-red-800">
                          Total Outstanding: {formatCurrency(data.reduce((s: number, i: { balance: number }) => s + Number(i.balance), 0))}
                          <span className="text-red-600 ml-2">({data.length} invoice{data.length !== 1 ? 's' : ''})</span>
                        </p>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Invoice</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Due Date</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        </tr></thead>
                        <tbody>
                          {data.map((inv: { id: string; invoiceNumber: string; balance: number; dueDate: string; status: string; student: { name: string; studentId: string; mobile: string } }) => (
                            <tr key={inv.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3"><p className="font-medium">{inv.student.name}</p><p className="text-xs text-gray-400">{inv.student.studentId} · {inv.student.mobile}</p></td>
                              <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">{inv.invoiceNumber}</td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(Number(inv.balance))}</td>
                              <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{formatDate(inv.dueDate)}</td>
                              <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>{inv.status}</span></td>
                            </tr>
                          ))}
                          {!data.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-green-600 font-medium">🎉 No defaulters!</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* STAY EXPIRY */}
                {activeReport === 'stay-expiry' && Array.isArray(data) && (
                  <>
                    {data.length > 0 && (
                      <div className="p-4 border-b bg-orange-50">
                        <p className="text-sm font-medium text-orange-800">{data.length} student{data.length !== 1 ? 's' : ''} with stay expiring in 30 days</p>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Room</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Stay Ends</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Days Left</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Package</th>
                        </tr></thead>
                        <tbody>
                          {data.map((s: { id: string; name: string; studentId: string; mobile: string; stayEndDate: string; rentPackage: string; room?: { roomNumber: string }; bed?: { bedLabel: string } }) => {
                            const daysLeft = Math.floor((new Date(s.stayEndDate).getTime() - Date.now()) / 86400000)
                            return (
                              <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3"><p className="font-medium">{s.name}</p><p className="text-xs text-gray-400">{s.studentId} · {s.mobile}</p></td>
                                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{s.room?.roomNumber ?? '—'} / {s.bed?.bedLabel ?? '—'}</td>
                                <td className="px-4 py-3 font-medium text-orange-600">{formatDate(s.stayEndDate)}</td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                  <span className={`text-xs font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-orange-600'}`}>{daysLeft}d</span>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell capitalize text-gray-600">{s.rentPackage}</td>
                              </tr>
                            )
                          })}
                          {!data.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No stays expiring in 30 days</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* COMPLAINTS */}
                {activeReport === 'complaints' && data && (
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">By Status</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(data.byStatus ?? []).map((s: { status: string; _count: number }) => (
                          <div key={s.status} className="p-3 bg-gray-50 rounded-xl text-center">
                            <p className="text-2xl font-bold">{s._count}</p>
                            <p className="text-xs text-gray-500 capitalize mt-0.5">{s.status.replace('_', ' ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">By Category</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(data.byCategory ?? []).map((c: { category: string; _count: number }) => (
                          <div key={c.category} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                            <span className="capitalize text-gray-600">{c.category}</span>
                            <span className="font-bold">{c._count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-sm">
                      <span className="text-blue-700">Avg resolution time: </span>
                      <span className="font-bold text-blue-900">{data.avgResolutionHours ?? 0} hours</span>
                    </div>
                  </div>
                )}

                {/* STUDENTS */}
                {activeReport === 'students' && Array.isArray(data) && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b">
                      {['active', 'reserved', 'pending', 'vacated'].map(s => {
                        const count = data.filter((st: { status: string }) => st.status === s).length
                        return (
                          <div key={s} className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-gray-500 capitalize mt-0.5">{s}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Room</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">College</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Joining</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Dues</th>
                        </tr></thead>
                        <tbody>
                          {data.map((s: { id: string; name: string; studentId: string; mobile: string; college?: string; joiningDate: string; status: string; room?: { roomNumber: string }; bed?: { bedLabel: string }; invoices?: Array<{ balance: number }> }) => {
                            const totalDue = (s.invoices ?? []).reduce((sum, i) => sum + Number(i.balance), 0)
                            return (
                              <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3"><p className="font-medium">{s.name}</p><p className="text-xs text-gray-400">{s.studentId} · {s.mobile}</p></td>
                                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{s.room?.roomNumber ?? '—'} / {s.bed?.bedLabel ?? '—'}</td>
                                <td className="px-4 py-3 hidden lg:table-cell text-gray-600 max-w-[160px] truncate">{s.college ?? '—'}</td>
                                <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{formatDate(s.joiningDate)}</td>
                                <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span></td>
                                <td className="px-4 py-3 text-right hidden md:table-cell">
                                  {totalDue > 0 ? <span className="text-xs font-bold text-red-600">{formatCurrency(totalDue)}</span> : <span className="text-xs text-green-600">Clear</span>}
                                </td>
                              </tr>
                            )
                          })}
                          {!data.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
