'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RenewalsPage() {
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['renewals', type, status],
    queryFn: () => api.get('/renewals', { params: { type: type || undefined, status: status || undefined } }).then(r => r.data),
  })

  const process = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/renewals/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['renewals'] }); toast({ title: '✓ Updated' }) },
  })

  const records = data?.data ?? []

  return (
    <div>
      <Header title="Renewals & Exits" />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Students
          </Button>
        </Link>

        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'All' },
            { value: 'renewal', label: 'Renewals' },
            { value: 'exit', label: 'Exits' },
          ].map(({ value, label }) => (
            <Button key={value} variant={type === value ? 'default' : 'outline'} size="sm" onClick={() => setType(value)}>
              {label}
            </Button>
          ))}
          <select value={status} onChange={e => setStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm ml-auto">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Effective Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Deposit Refund</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Damage</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : records.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No records found</td></tr>
                  ) : (
                    records.map((r: {
                      id: string; type: string; effectiveDate: string; status: string
                      depositRefundAmount: number; damageAmount: number; inspectionNotes?: string
                      student: { name: string; studentId: string }
                    }) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.student.name}</p>
                          <p className="text-xs text-gray-400">{r.student.studentId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.type === 'exit' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600">{formatDate(r.effectiveDate)}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell text-green-600">{formatCurrency(Number(r.depositRefundAmount))}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell text-red-600">{formatCurrency(Number(r.damageAmount))}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === 'pending' && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => process.mutate({ id: r.id, status: 'completed' })}>
                              Complete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
