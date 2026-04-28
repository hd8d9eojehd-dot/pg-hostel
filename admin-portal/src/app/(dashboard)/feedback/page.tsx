'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { Star, TrendingUp, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function RatingBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className="bg-gradient-to-r from-primary to-primary/70 h-2.5 rounded-full transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-500 ml-1">{value.toFixed(1)}</span>
    </div>
  )
}

export default function FeedbackPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [tab, setTab] = useState<'summary' | 'responses'>('summary')
  const [page, setPage] = useState(1)

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['feedback-summary', month, year],
    queryFn: () => api.get('/feedback/summary', { params: { month, year } }).then(r => r.data.data),
  })

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['feedback-all', month, year, page],
    queryFn: () => api.get('/feedback/all', { params: { month, year, page, limit: 20 } }).then(r => r.data),
    enabled: tab === 'responses',
  })

  return (
    <div>
      <Header title="Feedback" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <Button variant={tab === 'summary' ? 'default' : 'outline'} size="sm" onClick={() => setTab('summary')}>Summary</Button>
            <Button variant={tab === 'responses' ? 'default' : 'outline'} size="sm" onClick={() => setTab('responses')}>
              <Users className="w-3.5 h-3.5 mr-1.5" /> Responses
            </Button>
          </div>
        </div>

        {/* Summary tab */}
        {tab === 'summary' && (
          summaryLoading ? (
            <Card><CardContent className="p-8"><div className="h-48 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
          ) : !summary?.count ? (
            <Card>
              <CardContent className="p-16 text-center text-gray-400">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No feedback for {MONTHS[month - 1]} {year}</p>
                <p className="text-sm mt-1">Students haven't submitted feedback yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Ratings — {MONTHS[month - 1]} {year}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{summary.count} response{summary.count !== 1 ? 's' : ''}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RatingBar label="Food Quality" value={summary.averages.food} />
                  <RatingBar label="Cleanliness" value={summary.averages.cleanliness} />
                  <RatingBar label="WiFi" value={summary.averages.wifi} />
                  <RatingBar label="Staff" value={summary.averages.staff} />
                  <div className="pt-2 border-t">
                    <RatingBar label="Overall" value={summary.averages.overall} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Overall Score</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-48">
                  <div className="text-7xl font-bold text-primary mb-2">
                    {(summary.averages.overall ?? 0).toFixed(1)}
                  </div>
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-6 h-6 ${i < Math.round(summary.averages.overall ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-gray-500 text-sm">out of 5.0 · {summary.count} responses</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Food', value: summary.averages.food, emoji: '🍽️' },
                      { label: 'Cleanliness', value: summary.averages.cleanliness, emoji: '🧹' },
                      { label: 'WiFi', value: summary.averages.wifi, emoji: '📶' },
                      { label: 'Staff', value: summary.averages.staff, emoji: '👥' },
                    ].map(({ label, value, emoji }) => (
                      <div key={label} className="text-center p-4 bg-gray-50 rounded-xl">
                        <div className="text-2xl mb-1">{emoji}</div>
                        <p className="text-2xl font-bold text-gray-900">{value?.toFixed(1) ?? '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        )}

        {/* Responses tab */}
        {tab === 'responses' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-600">Food</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-600">Clean</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-600">WiFi</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-600">Staff</th>
                      <th className="text-center px-3 py-3 font-medium text-gray-600">Overall</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Comment</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responsesLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                          ))}
                        </tr>
                      ))
                    ) : (responses?.data ?? []).length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No responses for this period</td></tr>
                    ) : (
                      (responses?.data ?? []).map((f: {
                        id: string; foodRating?: number; cleanlinessRating?: number
                        wifiRating?: number; staffRating?: number; overallRating?: number
                        comment?: string; submittedAt: string
                        student: { name: string; studentId: string }
                      }) => (
                        <tr key={f.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{f.student.name}</p>
                            <p className="text-xs text-gray-400">{f.student.studentId}</p>
                          </td>
                          <td className="px-3 py-3 text-center"><StarDisplay value={f.foodRating ?? null} /></td>
                          <td className="px-3 py-3 text-center"><StarDisplay value={f.cleanlinessRating ?? null} /></td>
                          <td className="px-3 py-3 text-center"><StarDisplay value={f.wifiRating ?? null} /></td>
                          <td className="px-3 py-3 text-center"><StarDisplay value={f.staffRating ?? null} /></td>
                          <td className="px-3 py-3 text-center"><StarDisplay value={f.overallRating ?? null} /></td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 max-w-[200px] truncate">{f.comment ?? '—'}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">{formatDate(f.submittedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {responses?.pagination && responses.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">Page {page} of {responses.pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!responses.pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={!responses.pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
