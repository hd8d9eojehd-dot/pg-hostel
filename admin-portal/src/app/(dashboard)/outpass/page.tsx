'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { statusColor, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react'
import Link from 'next/link'
export default function OutpassPage() {
  const [status, setStatus] = useState('pending')
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['outpasses', status],
    queryFn: () => api.get('/outpass', { params: { status } }).then(r => r.data),
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/outpass/${id}/approve`, { note: 'Approved' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outpasses'] }); toast({ title: 'Outpass approved' }) },
  })

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/outpass/${id}/reject`, { note: 'Rejected by admin' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outpasses'] }); toast({ title: 'Outpass rejected' }) },
  })

  const confirmReturn = useMutation({
    mutationFn: (id: string) => api.post(`/outpass/${id}/return`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outpasses'] }); toast({ title: 'Return confirmed' }) },
  })

  const outpasses = data?.data ?? []

  return (
    <div>
      <Header title="Outpass Management" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {['pending', 'approved', 'rejected', 'returned', ''].map(s => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" className="flex-shrink-0" onClick={() => setStatus(s)}>
              {s || 'All'}
            </Button>
          ))}
          <Link href="/outpass/semesters" className="ml-auto flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">📅 Semester Periods</Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="h-20 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : outpasses.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-gray-400">No outpasses found</CardContent></Card>
          ) : (
            outpasses.map((o: {
              id: string; outpassNumber: string; type: string; reason: string
              fromDate: string; toDate: string; destination: string; status: string; createdAt: string
              student: { name: string; studentId: string; mobile: string }
            }) => (
              <Card key={o.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-gray-500">{o.outpassNumber}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(o.status)}`}>{o.status}</span>
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full capitalize">{o.type}</span>
                      </div>
                      <p className="font-medium text-gray-900">{o.student.name}</p>
                      <p className="text-xs text-gray-500 mb-1">{o.student.studentId} · {o.student.mobile}</p>
                      <p className="text-sm text-gray-600">{o.reason}</p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>📅 {formatDate(o.fromDate)} → {formatDate(o.toDate)}</span>
                        {o.destination && <span>📍 {o.destination}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {o.status === 'pending' && (
                        <>
                          <Button size="sm" className="gap-1" onClick={() => approve.mutate(o.id)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => reject.mutate(o.id)}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      {o.status === 'approved' && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => confirmReturn.mutate(o.id)}>
                          <RotateCcw className="w-3.5 h-3.5" /> Returned
                        </Button>
                      )}
                      <Link href={`/outpass/${o.id}`}>
                        <Button size="sm" variant="ghost" className="gap-1 w-full">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
