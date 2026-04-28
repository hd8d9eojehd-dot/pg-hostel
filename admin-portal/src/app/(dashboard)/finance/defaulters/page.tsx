'use client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, Send, AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export default function DefaultersPage() {
  const { toast } = useToast()

  const { data: defaulters, isLoading } = useQuery({
    queryKey: ['defaulters'],
    queryFn: () => api.get('/finance/defaulters').then(r => r.data.data),
  })

  const sendReminders = useMutation({
    mutationFn: () => api.post('/whatsapp/send-bulk', {
      messages: (defaulters ?? []).map((inv: {
        student: { mobile: string; name: string; studentId: string }
        balance: number; dueDate: string
      }) => ({
        mobile: inv.student.mobile,
        message: `🔴 *Payment Overdue*\n\nDear ${inv.student.name} (${inv.student.studentId}),\n\nYour payment of *₹${Number(inv.balance).toLocaleString('en-IN')}* was due on ${formatDate(inv.dueDate)} and is now *overdue*.\n\nPlease pay immediately or contact admin.`,
      })),
    }),
    onSuccess: (res) => {
      toast({ title: `Reminders sent to ${res.data.data?.sent ?? 0} students` })
    },
    onError: () => toast({ title: 'Failed to send reminders', variant: 'destructive' }),
  })

  const totalDue = (defaulters ?? []).reduce(
    (sum: number, inv: { balance: number }) => sum + Number(inv.balance), 0
  )

  return (
    <div>
      <Header title="Defaulters" />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/finance">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Finance
            </Button>
          </Link>
          <div className="flex gap-2">
            <a href={`${API_URL}/reports/defaulters/export`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">Export CSV</Button>
            </a>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => sendReminders.mutate()}
              disabled={sendReminders.isPending || !defaulters?.length}
            >
              {sendReminders.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                : <><Send className="w-3.5 h-3.5" /> Send WhatsApp Reminders</>
              }
            </Button>
          </div>
        </div>

        {/* Summary */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">
                {defaulters?.length ?? 0} overdue invoice{(defaulters?.length ?? 0) !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600">Total outstanding: {formatCurrency(totalDue)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Room</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Due Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (defaulters ?? []).length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-green-600 font-medium">🎉 No defaulters! All payments are up to date.</td></tr>
                  ) : (
                    (defaulters ?? []).map((inv: {
                      id: string; invoiceNumber: string; balance: number; dueDate: string; status: string
                      student: { id: string; name: string; studentId: string; mobile: string; room?: { roomNumber: string } }
                    }) => (
                      <tr key={inv.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/students/${inv.student.id}`} className="hover:text-primary">
                            <p className="font-medium">{inv.student.name}</p>
                            <p className="text-xs text-gray-500">{inv.student.studentId} · {inv.student.mobile}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                          {inv.student.room?.roomNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{formatDate(inv.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(Number(inv.balance))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/finance/invoices/${inv.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
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
