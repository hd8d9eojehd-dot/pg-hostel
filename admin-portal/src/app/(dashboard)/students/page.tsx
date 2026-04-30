'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, statusColor } from '@/lib/utils'
import api from '@/lib/api'
import { Plus, Search, Eye, Users, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = ['', 'active', 'reserved', 'pending', 'vacated', 'suspended'] as const
const FEE_STATUS_OPTIONS = ['', 'clear', 'due', 'overdue'] as const

function feeStatusBadge(feeStatus: string) {
  if (feeStatus === 'overdue') return 'bg-red-100 text-red-800'
  if (feeStatus === 'due') return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

function stayStatusBadge(daysLeft: number) {
  if (daysLeft < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-800' }
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, cls: 'bg-orange-100 text-orange-800' }
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, cls: 'bg-yellow-100 text-yellow-800' }
  return { label: 'Active', cls: 'bg-green-100 text-green-800' }
}

export default function StudentsPage() {
  const [searchInput, setSearchInput] = useState('')
  // PERF FIX: Debounce search — wait 350ms after typing stops before firing API
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [feeFilter, setFeeFilter] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // PERF FIX: Debounce search input — prevents API call on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, status, feeFilter, page],
    queryFn: () => api.get('/students', {
      params: { search: search || undefined, status: status || undefined, feeStatus: feeFilter || undefined, page, limit: LIMIT }
    }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const students = data?.students ?? []
  const pagination = data?.pagination

  return (
    <div>
      <Header title="Students" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search name, ID, mobile..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm flex-1 min-w-[120px]">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>
              ))}
            </select>
            <select value={feeFilter} onChange={e => { setFeeFilter(e.target.value); setPage(1) }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm flex-1 min-w-[130px]">
              {FEE_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s ? `Fee: ${s.charAt(0).toUpperCase() + s.slice(1)}` : 'All Fee Status'}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Link href="/students/new" className="flex-1 sm:flex-none">
              <Button className="gap-2 w-full sm:w-auto h-10"><Plus className="w-4 h-4" /> Admit Student</Button>
            </Link>
            <Link href="/students/renewals" className="flex-1 sm:flex-none">
              <Button variant="outline" className="gap-2 w-full sm:w-auto h-10">Renewals</Button>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        {pagination && (
          <p className="text-sm text-gray-500">
            {pagination.total} student{pagination.total !== 1 ? 's' : ''} found
            {search && ` for "${search}"`}
            {status && ` · ${status}`}
            {feeFilter && ` · fee: ${feeFilter}`}
          </p>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Room / Bed</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">College</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Stay Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fee Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                        <p className="text-gray-400 font-medium">No students found</p>
                        {search && <p className="text-gray-400 text-xs mt-1">Try a different search term</p>}
                      </td>
                    </tr>
                  ) : (
                    students.map((s: {
                      id: string; name: string; studentId: string; mobile: string
                      joiningDate: string; stayEndDate: string; status: string; college?: string
                      room?: { roomNumber: string }; bed?: { bedLabel: string }
                      feeStatus?: string; totalDue?: number; avatarUrl?: string
                    }) => {
                      const daysLeft = Math.floor((new Date(s.stayEndDate).getTime() - Date.now()) / 86400000)
                      const stay = stayStatusBadge(daysLeft)
                      const feeStatus = s.feeStatus ?? 'clear'
                      return (
                        <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {s.avatarUrl
                                  ? <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                                  : <span className="text-xs font-bold text-primary">{s.name.charAt(0).toUpperCase()}</span>
                                }
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{s.name}</p>
                                <p className="text-xs text-gray-500">{s.mobile}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{s.studentId}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                            {s.room ? `${s.room.roomNumber} / ${s.bed?.bedLabel ?? '—'}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell text-gray-600 text-xs max-w-[160px] truncate">
                            {s.college ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stay.cls}`}>
                              {daysLeft <= 30 && daysLeft >= 0 && <Clock className="w-3 h-3" />}
                              {daysLeft < 0 && <AlertTriangle className="w-3 h-3" />}
                              {stay.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${feeStatusBadge(feeStatus)}`}>
                                {feeStatus === 'overdue' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {feeStatus}
                              </span>
                              {s.totalDue && s.totalDue > 0 ? (
                                <p className="text-xs text-red-500 mt-0.5">₹{Number(s.totalDue).toLocaleString('en-IN')}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/students/${s.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="text-sm text-gray-500 px-2">{page} / {pagination.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
