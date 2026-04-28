'use client'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import api from '@/lib/api'
import { ArrowLeft, Plus, Download } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export default function StudentInvoicesPage() {
  const { id } = useParams<{ id: string }>()

  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}`).then(r => r.data.data),
  })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['student-invoices', id],
    queryFn: () => api.get(`/finance/student/${id}`).then(r => r.data.data),
  })

  const totalDue = (invoices ?? [])
    .filter((i: { status: string }) => ['due', 'overdue', 'partial'].includes(i.status))
    .reduce((s: number, i: { balance: number }) => s + Number(i.balance), 0)

  return (
    <div>
      <Header title="Student Invoices" />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href={`/students/${id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> {student?.name ?? 'Student'}
            </Button>
          </Link>
          <Link href={`/finance/new-invoice?studentId=${id}`}>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </Button>
          </Link>
        </div>

        {student && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
              {student.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold">{student.name}</p>
              <p className="text-sm text-gray-500">{student.studentId}</p>
            </div>
            {totalDue > 0 && (
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Total Due</p>
                <p className="font-bold text-red-600">{formatCurrency(totalDue)}</p>
              </div>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Due Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
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
                  ) : (invoices ?? []).length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No invoices yet</td></tr>
                  ) : (
                    (invoices ?? []).map((inv: {
                      id: string; invoiceNumber: string; type: string; description?: string
                      totalAmount: number; balance: number; dueDate: string; status: string
                      payments: Array<{ receiptNumber: string }>
                    }) => (
                      <tr key={inv.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{inv.description ?? inv.type}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{formatDate(inv.dueDate)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Number(inv.totalAmount))}</td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">{formatCurrency(Number(inv.balance))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Link href={`/finance/invoices/${inv.id}`}>
                              <Button variant="ghost" size="sm" className="text-xs">View</Button>
                            </Link>
                            {inv.status !== 'paid' && inv.status !== 'waived' && (
                              <Link href={`/finance/record-payment?invoiceId=${inv.id}`}>
                                <Button variant="ghost" size="sm" className="text-xs text-green-600">Pay</Button>
                              </Link>
                            )}
                            {inv.payments?.[0] && (
                              <a href={`${API_URL}/finance/receipts/${inv.payments[0].receiptNumber}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /></Button>
                              </a>
                            )}
                          </div>
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
