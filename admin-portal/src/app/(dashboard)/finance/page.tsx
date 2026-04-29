'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { IndianRupee, AlertTriangle, TrendingUp, Plus, CheckCircle, XCircle, Clock, RefreshCw, Download } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export default function FinancePage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'invoices' | 'utr'>('invoices')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get('/finance/summary').then(r => r.data.data),
    refetchInterval: 30_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status, page],
    queryFn: () => api.get('/finance/invoices', { params: { status, page, limit: 20 } }).then(r => r.data),
  })

  // Pending UTR payments
  const { data: pendingUtr, isLoading: utrLoading, refetch: refetchUtr } = useQuery({
    queryKey: ['pending-utr'],
    queryFn: () => api.get('/finance/payments/pending-utr').then(r => r.data.data),
    refetchInterval: 15_000, // live updates every 15s
  })

  const verifyUtr = useMutation({
    mutationFn: (id: string) => api.post(`/finance/payments/${id}/verify-utr`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pending-utr'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
      toast({ title: `✓ Payment verified — ${res.data.data?.receiptNumber}` })
    },
    onError: (e: unknown) => toast({ title: 'Verification failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const rejectUtr = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/finance/payments/${id}/reject-utr`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-utr'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast({ title: 'Payment rejected — student notified' })
      setRejectId(null)
      setRejectReason('')
    },
    onError: (e: unknown) => toast({ title: 'Rejection failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const invoices = data?.invoices ?? []
  const pendingCount = (pendingUtr ?? []).length

  return (
    <div>
      <Header title="Finance" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Collected', value: summary?.totalCollected ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', isCurrency: true, href: undefined },
            { label: 'This Month', value: summary?.thisMonthCollected ?? 0, icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50', isCurrency: true, href: undefined },
            { label: 'Pending', value: summary?.totalPending ?? 0, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', isCurrency: true, href: undefined },
            { label: 'Overdue Count', value: summary?.overdueCount ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', isCurrency: false, href: '/finance/defaulters' },
          ].map(({ label, value, icon: Icon, color, bg, isCurrency, href }) => (
            <Card key={label} className={href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
              <CardContent className="p-3 md:p-4" onClick={() => href && (window.location.href = href)}>
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-2 md:mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-lg md:text-xl font-bold">{isCurrency ? formatCurrency(value) : value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          <Button variant={activeTab === 'invoices' ? 'default' : 'outline'} size="sm"
            className="flex-shrink-0"
            onClick={() => setActiveTab('invoices')}>
            <IndianRupee className="w-3.5 h-3.5 mr-1.5" /> Invoices
          </Button>
          <Button variant={activeTab === 'utr' ? 'default' : 'outline'} size="sm"
            className="relative flex-shrink-0"
            onClick={() => setActiveTab('utr')}>
            <Clock className="w-3.5 h-3.5 mr-1.5" /> UTR Verification
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto flex-shrink-0 gap-1.5"
            onClick={() => { refetchSummary(); refetchUtr() }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* ── UTR VERIFICATION TAB ── */}
        {activeTab === 'utr' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Pending UTR Verifications
                {pendingCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                    {pendingCount} pending
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {utrLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : (pendingUtr ?? []).length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-300" />
                  <p className="font-medium text-green-600">All UTR payments verified!</p>
                  <p className="text-sm mt-1">No pending verifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(pendingUtr ?? []).map((p: {
                    id: string; receiptNumber: string; amount: number; transactionRef: string
                    paymentMode: string; paidDate: string; createdAt: string
                    student: { name: string; studentId: string; mobile: string; avatarUrl?: string }
                    invoice: { invoiceNumber: string; type: string; description?: string; totalAmount: number }
                  }) => (
                    <div key={p.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Student avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.student.avatarUrl
                            ? <img src={p.student.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-sm font-bold text-primary">{p.student.name.charAt(0)}</span>
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{p.student.name}</p>
                            <span className="text-xs text-gray-400 font-mono">{p.student.studentId}</span>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                              ⏳ Pending
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Invoice:</span> {p.invoice.invoiceNumber} — {p.invoice.description ?? p.invoice.type}
                            </p>
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Amount:</span> {formatCurrency(Number(p.amount))} via {p.paymentMode.replace('_', ' ').toUpperCase()}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">UTR:</span>
                              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-gray-800 select-all">
                                {p.transactionRef}
                              </code>
                            </div>
                            <p className="text-xs text-gray-400">{formatDate(p.paidDate)} · {p.student.mobile}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 h-8 text-xs"
                            disabled={verifyUtr.isPending}
                            onClick={() => verifyUtr.mutate(p.id)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Verify
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 h-8 text-xs"
                            onClick={() => { setRejectId(p.id); setRejectReason('') }}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Invoices</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Link href="/finance/extra-charges">
                    <Button size="sm" variant="outline" className="h-8 text-xs">Extra Charges</Button>
                  </Link>
                  <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                    <option value="">All</option>
                    <option value="due">Due</option>
                    <option value="overdue">Overdue</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>
                  <Link href="/finance/new-invoice">
                    <Button size="sm" className="gap-1 h-8 text-xs"><Plus className="w-3.5 h-3.5" /> Invoice</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Due Date</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
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
                    ) : invoices.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No invoices found</td></tr>
                    ) : (
                      invoices.map((inv: {
                        id: string; invoiceNumber: string; type: string
                        totalAmount: number; balance: number; dueDate: string; status: string
                        student: { name: string; studentId: string }
                        payments?: Array<{ receiptNumber: string; utrVerified?: boolean; utrRejected?: boolean; transactionRef?: string }>
                      }) => (
                        <tr key={inv.id} className="border-b hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-3 font-mono text-xs" onClick={() => window.location.href = `/finance/invoices/${inv.id}`}>{inv.invoiceNumber}</td>
                          <td className="px-4 py-3" onClick={() => window.location.href = `/finance/invoices/${inv.id}`}>
                            <p className="font-medium">{inv.student.name}</p>
                            <p className="text-xs text-gray-500">{inv.student.studentId}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell capitalize text-gray-600" onClick={() => window.location.href = `/finance/invoices/${inv.id}`}>{inv.type}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-gray-600" onClick={() => window.location.href = `/finance/invoices/${inv.id}`}>{formatDate(inv.dueDate)}</td>
                          <td className="px-4 py-3 text-right font-medium" onClick={() => window.location.href = `/finance/invoices/${inv.id}`}>{formatCurrency(Number(inv.totalAmount))}</td>
                          <td className="px-4 py-3 text-right font-medium text-orange-600" onClick={() => window.location.href = `/finance/invoices/${inv.id}`}>{formatCurrency(Number(inv.balance))}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                                {inv.status}
                              </span>
                              {inv.status !== 'paid' && inv.status !== 'waived' && (
                                <Link href={`/finance/record-payment?invoiceId=${inv.id}`} onClick={e => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="text-xs text-green-600 h-6 px-2">Pay</Button>
                                </Link>
                              )}
                              {inv.status === 'paid' && inv.payments?.[0] && (
                                <a href={`${API_URL}/finance/receipts/${inv.payments[0].receiptNumber}`}
                                  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                  className="text-xs text-primary hover:underline flex items-center gap-0.5">
                                  <Download className="w-3 h-3" /> Receipt
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
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">Page {page} of {data.pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!data.pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={!data.pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject UTR Dialog */}
      <Dialog open={!!rejectId} onOpenChange={o => { if (!o) setRejectId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" /> Reject Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              This will reject the UTR payment, reverse the invoice balance, and notify the student via WhatsApp.
            </p>
            <div className="space-y-1.5">
              <Label>Rejection Reason <span className="text-destructive">*</span></Label>
              <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. UTR not found, wrong amount, duplicate..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectUtr.isPending}
              onClick={() => rejectId && rejectUtr.mutate({ id: rejectId, reason: rejectReason })}>
              {rejectUtr.isPending ? 'Rejecting...' : 'Reject & Notify Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
