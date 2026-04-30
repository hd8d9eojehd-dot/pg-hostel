'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import {
  Download, CreditCard, CheckCircle2, Loader2,
  BookOpen, Clock, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

type SemRow = {
  sem: number
  feeAmount: number
  status: 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming' | 'current'
  paidAmount: number
  balance: number
  canPayWithoutInvoice?: boolean
  invoice: {
    id: string; invoiceNumber: string; totalAmount: number
    paidAmount: number; balance: number; dueDate: string; lateFee: number
    payments: Array<{ id: string; receiptNumber: string; amount: number; paidDate: string; paymentMode: string; transactionRef?: string }>
  } | null
}

type OtherInvoice = {
  id: string; invoiceNumber: string; type: string; description?: string
  totalAmount: number; paidAmount: number; balance: number; status: string; dueDate: string; lateFee: number
  payments: Array<{ id: string; receiptNumber: string; amount: number; paidDate: string; paymentMode: string; transactionRef?: string }>
}

type FeeData = {
  student: {
    name: string; studentId: string; course?: string; branch?: string
    currentSem: number; totalSems: number; rentPackage: string
    feePerSem: number; depositAmount: number; joiningDate: string; stayEndDate: string
  }
  room: { roomNumber: string; roomType: string; pgName: string } | null
  semesters: SemRow[]
  otherInvoices: OtherInvoice[]
  summary: { totalCourseFee: number; totalPaid: number; totalDue: number; depositAmount: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  paid:     { label: 'Paid',     color: 'text-green-700',  bg: 'bg-green-100',  icon: 'OK' },
  partial:  { label: 'Partial',  color: 'text-orange-700', bg: 'bg-orange-100', icon: '~' },
  due:      { label: 'Due',      color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '...' },
  overdue:  { label: 'Overdue',  color: 'text-red-700',    bg: 'bg-red-100',    icon: '!' },
  current:  { label: 'Current',  color: 'text-blue-700',   bg: 'bg-blue-100',   icon: '->' },
  upcoming: { label: 'Upcoming', color: 'text-gray-500',   bg: 'bg-gray-100',   icon: 'o' },
}

function periodLabel(rentPackage: string, sem: number): string {
  if (rentPackage === 'monthly') return `Month ${sem}`
  if (rentPackage === 'annual') return `Year ${sem}`
  return `Semester ${sem}`
}

function feeUnitLabel(rentPackage: string): string {
  if (rentPackage === 'monthly') return 'month'
  if (rentPackage === 'annual') return 'year'
  return 'sem'
}

export default function FinancePage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'structure' | 'pay' | 'history'>('structure')
  const [payingRow, setPayingRow] = useState<{ invoiceId: string; balance: number; label: string; semNumber?: number } | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [amountError, setAmountError] = useState('')
  const [payMode, setPayMode] = useState<'upi' | 'online'>('online')
  const [utrRef, setUtrRef] = useState('')
  const [submittingUpi, setSubmittingUpi] = useState(false)
  const [expandedSem, setExpandedSem] = useState<number | null>(null)
  const [requestSubmitted, setRequestSubmitted] = useState(false)

  const { data: feeData, isLoading } = useQuery<FeeData>({
    queryKey: ['fee-structure'],
    queryFn: () => api.get('/portal/fee-structure').then(r => r.data.data),
  })

  const { data: paymentDetails } = useQuery<Record<string, string> | null>({
    queryKey: ['payment-details'],
    queryFn: () => api.get('/portal/payment-details').then(r => r.data.data),
    staleTime: 5 * 60_000,
  })

  const { data: myPayments } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => api.get('/portal/my-payments').then(r => r.data.data),
    refetchInterval: 10_000,
  })

  const pendingUtrs = (myPayments ?? []).filter((p: { utrVerified: boolean; utrRejected: boolean; notes?: string }) =>
    !p.utrVerified && !p.utrRejected && p.notes?.includes('PENDING_VERIFICATION')
  )
  const rejectedUtrs = (myPayments ?? []).filter((p: { utrRejected: boolean }) => p.utrRejected)

  const initiateOnline = useMutation({
    mutationFn: async () => {
      if (!payingRow) throw new Error('No invoice selected')
      const returnUrl = `${window.location.origin}/finance/payment-status`
      if (!payingRow.invoiceId && payingRow.semNumber) {
        const createRes = await api.post('/portal/create-sem-invoice', {
          semNumber: payingRow.semNumber,
          amount: parseFloat(customAmount) || payingRow.balance,
        })
        const newInvoiceId = createRes.data.data?.invoiceId
        if (!newInvoiceId) throw new Error('Failed to create invoice')
        const res = await api.post('/payment/initiate', { invoiceId: newInvoiceId, returnUrl })
        return res.data.data
      }
      const res = await api.post('/payment/initiate', { invoiceId: payingRow.invoiceId, returnUrl })
      return res.data.data
    },
    onSuccess: (data) => {
      if (!data.paymentSessionId) { toast({ title: 'Payment session unavailable', variant: 'destructive' }); return }
      const script = document.createElement('script')
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
      script.async = true
      script.onload = () => {
        try {
          const cf = (window as unknown as {
            Cashfree: (o: { mode: string }) => { checkout: (o: { paymentSessionId: string; redirectTarget: string }) => void }
          }).Cashfree({ mode: process.env['NEXT_PUBLIC_CASHFREE_ENV'] === 'PROD' ? 'production' : 'sandbox' })
          cf.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' })
        } catch { toast({ title: 'Payment gateway error', variant: 'destructive' }) }
      }
      script.onerror = () => toast({ title: 'Failed to load payment gateway', variant: 'destructive' })
      document.head.appendChild(script)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Payment failed'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const submitUpi = async () => {
    if (!payingRow) return
    const amt = parseFloat(customAmount) || payingRow.balance
    if (!utrRef.trim()) { toast({ title: 'Enter UTR / Transaction ID', variant: 'destructive' }); return }
    if (amt <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return }
    if (amountError) { toast({ title: amountError, variant: 'destructive' }); return }
    setSubmittingUpi(true)
    try {
      const payload: Record<string, unknown> = { amount: amt, transactionRef: utrRef.trim(), paymentMode: 'upi' }
      if (payingRow.invoiceId) payload['invoiceId'] = payingRow.invoiceId
      else if (payingRow.semNumber) payload['semNumber'] = payingRow.semNumber
      await api.post('/portal/payment-request', payload)
      toast({ title: 'UTR submitted', description: 'Admin will verify within 24 hours' })
      qc.invalidateQueries({ queryKey: ['fee-structure'] })
      qc.invalidateQueries({ queryKey: ['my-payments'] })
      setRequestSubmitted(true)
    } catch (e: unknown) {
      toast({ title: (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed', variant: 'destructive' })
    } finally { setSubmittingUpi(false) }
  }

  const closePayModal = () => { setPayingRow(null); setCustomAmount(''); setRequestSubmitted(false); setUtrRef(''); setAmountError(''); setPayMode('online') }

  const openPay = (invoiceId: string | null, balance: number, label: string, semNum?: number) => {
    setPayingRow({ invoiceId: invoiceId ?? '', balance, label, semNumber: semNum })
    setCustomAmount(String(balance))
    setTab('pay')
  }

  if (isLoading) return (
    <div>
      <TopBar title="Finance" />
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )

  const d = feeData
  if (!d) return (
    <div>
      <TopBar title="Finance" />
      <div className="p-8 text-center text-gray-400">No fee data available</div>
    </div>
  )

  const { summary, semesters, otherInvoices, student, room } = d
  const pendingOther = otherInvoices.filter(i => ['due', 'overdue', 'partial'].includes(i.status))
  const paidOther = otherInvoices.filter(i => i.status === 'paid')
  const payableSems = semesters.filter(s =>
    ['due', 'overdue', 'partial', 'current'].includes(s.status) && (s.invoice || s.canPayWithoutInvoice) && s.balance > 0
  )

  return (
    <div>
      <TopBar title="Finance" />
      <div className="max-w-lg mx-auto">

        {/* Summary banner */}
        <div className={`mx-4 mt-4 rounded-2xl p-4 ${summary.totalDue > 0 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}>
          <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Total Outstanding</p>
          <p className="text-white text-2xl sm:text-3xl font-bold mt-0.5">{formatCurrency(summary.totalDue)}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
            <div>
              <p className="text-white/70 text-xs">Total Course Fee</p>
              <p className="text-white font-semibold text-sm">{formatCurrency(summary.totalCourseFee)}</p>
            </div>
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <div>
              <p className="text-white/70 text-xs">Paid So Far</p>
              <p className="text-white font-semibold text-sm">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <div>
              <p className="text-white/70 text-xs">Deposit</p>
              <p className="text-white font-semibold text-sm">{formatCurrency(summary.depositAmount)}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {summary.totalCourseFee > 0 && (
          <div className="mx-4 mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Payment progress</span>
              <span>{Math.round((summary.totalPaid / summary.totalCourseFee) * 100)}% paid</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (summary.totalPaid / summary.totalCourseFee) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mx-4 mt-4 bg-gray-100 rounded-xl p-1 gap-1">
          {(['structure', 'pay', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors capitalize ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {t === 'structure' ? 'Fee Plan' : t === 'pay' ? 'Pay Now' : 'History'}
            </button>
          ))}
        </div>

        {/* UTR Status Banners */}
        {rejectedUtrs.length > 0 && (
          <div className="mx-4 mt-3 space-y-2">
            {rejectedUtrs.map((p: { id: string; transactionRef: string; amount: number; utrRejectedReason?: string }) => (
              <div key={p.id} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                <span className="text-red-500 text-lg flex-shrink-0">X</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Payment Rejected</p>
                  <p className="text-xs text-red-600 mt-0.5">UTR: <code className="font-mono">{p.transactionRef}</code> - Rs.{Number(p.amount).toLocaleString('en-IN')}</p>
                  {p.utrRejectedReason && <p className="text-xs text-red-500 mt-0.5">Reason: {p.utrRejectedReason}</p>}
                  <p className="text-xs text-red-400 mt-1">Please contact admin or resubmit with correct UTR.</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {pendingUtrs.length > 0 && (
          <div className="mx-4 mt-3">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-orange-500 text-lg flex-shrink-0">...</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">{pendingUtrs.length} Payment{pendingUtrs.length > 1 ? 's' : ''} Pending Verification</p>
                <p className="text-xs text-orange-600 mt-0.5">Admin will verify within 24 hours. This page updates automatically.</p>
              </div>
            </div>
          </div>
        )}

        {/* FEE STRUCTURE TAB */}
        {tab === 'structure' && (
          <div className="p-4 space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{student.course ?? 'Course'} - {student.branch ?? ''}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {student.rentPackage === 'semester' ? `Sem ${student.currentSem} of ${student.totalSems}` : student.rentPackage} - {formatCurrency(student.feePerSem)}/{feeUnitLabel(student.rentPackage)}
                    </p>
                    {room && <p className="text-xs text-gray-400 mt-0.5">Room {room.roomNumber} - {room.pgName}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {semesters.map(row => {
                const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG['upcoming']
                const isExpanded = expandedSem === row.sem
                const canPay = ['due', 'overdue', 'partial', 'current'].includes(row.status) && (row.invoice || row.canPayWithoutInvoice)
                const hasPayments = (row.invoice?.payments?.length ?? 0) > 0

                return (
                  <Card key={row.sem} className={`overflow-hidden ${row.status === 'overdue' ? 'border-red-200' : row.status === 'current' || row.status === 'due' ? 'border-yellow-200' : ''}`}>
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {row.sem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{periodLabel(student.rentPackage, row.sem)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500">
                              Fee: {formatCurrency(row.sem === 1 ? row.feeAmount - d.summary.depositAmount : row.feeAmount)}
                              {row.sem === 1 && d.summary.depositAmount > 0 && (
                                <span className="text-gray-400"> + Rs.{d.summary.depositAmount.toLocaleString('en-IN')} deposit</span>
                              )}
                            </span>
                            {row.paidAmount > 0 && <span className="text-xs text-green-600">Paid: {formatCurrency(row.paidAmount)}</span>}
                            {row.balance > 0 && <span className="text-xs text-red-600 font-medium">Due: {formatCurrency(row.balance)}</span>}
                          </div>
                          {row.invoice?.dueDate && row.balance > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">Due by {formatDate(row.invoice.dueDate)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(canPay || row.canPayWithoutInvoice) && (
                            <Button size="sm" className="h-7 px-3 text-xs gap-1"
                              onClick={() => openPay(row.invoice?.id ?? null, row.balance, periodLabel(student.rentPackage, row.sem) + ' Fee', row.sem)}>
                              <CreditCard className="w-3 h-3" /> Pay
                            </Button>
                          )}
                          {(hasPayments || row.invoice) && (
                            <button onClick={() => setExpandedSem(isExpanded ? null : row.sem)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && row.invoice && (
                        <div className="border-t bg-gray-50 px-3 py-2 space-y-1.5">
                          {row.invoice.lateFee > 0 && (
                            <div className="flex items-center gap-2 text-xs text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              Late fee: {formatCurrency(row.invoice.lateFee)}
                            </div>
                          )}
                          {row.invoice.payments.length === 0 ? (
                            <p className="text-xs text-gray-400 py-1">No payments recorded yet</p>
                          ) : (
                            row.invoice.payments.map(p => (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  <span className="text-gray-600">{formatDate(p.paidDate)} - {p.paymentMode.replace('_', ' ')}</span>
                                  {p.transactionRef && <span className="text-gray-400 font-mono">UTR: {p.transactionRef}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-green-700">{formatCurrency(p.amount)}</span>
                                  <a href={`${API_URL}/finance/receipts/${p.receiptNumber}?inline=1`} target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-0.5">
                                    <Download className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {otherInvoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Other Charges</p>
                {otherInvoices.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG['upcoming']
                  const canPay = ['due', 'overdue', 'partial'].includes(inv.status)
                  return (
                    <Card key={inv.id} className={inv.status === 'overdue' ? 'border-red-200' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium capitalize">{inv.description ?? inv.type}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{inv.invoiceNumber} - Due {formatDate(inv.dueDate)}</p>
                            {inv.balance > 0 && <p className="text-xs text-red-600 font-medium mt-0.5">Balance: {formatCurrency(inv.balance)}</p>}
                          </div>
                          {canPay && (
                            <Button size="sm" className="h-7 px-3 text-xs gap-1 flex-shrink-0"
                              onClick={() => openPay(inv.id, inv.balance, inv.description ?? inv.type)}>
                              <CreditCard className="w-3 h-3" /> Pay
                            </Button>
                          )}
                          {inv.status === 'paid' && inv.payments[0] && (
                            <a href={`${API_URL}/finance/receipts/${inv.payments[0].receiptNumber}?inline=1`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline flex-shrink-0">
                              <Download className="w-3 h-3" /> Receipt
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* PAY NOW TAB */}
        {tab === 'pay' && (
          <div className="p-4 space-y-3">
            {payableSems.length === 0 && pendingOther.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-green-700">All fees paid!</p>
                  <p className="text-sm text-gray-400 mt-1">No pending payments</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide px-1">Select invoice to pay</p>
                {[...payableSems.map(s => ({
                  invoiceId: s.invoice?.id ?? null,
                  semNumber: s.sem,
                  label: periodLabel(student.rentPackage, s.sem) + ' Fee',
                  balance: s.balance,
                  status: s.status,
                  dueDate: s.invoice?.dueDate ?? new Date().toISOString(),
                  invoiceNumber: s.invoice?.invoiceNumber ?? `${student.rentPackage.toUpperCase()}-${s.sem}`,
                })), ...pendingOther.map(i => ({
                  invoiceId: i.id,
                  semNumber: undefined,
                  label: i.description ?? i.type,
                  balance: i.balance,
                  status: i.status,
                  dueDate: i.dueDate,
                  invoiceNumber: i.invoiceNumber,
                }))].map(item => (
                  <Card key={item.invoiceId ?? `sem-${item.semNumber}`}
                    className={`cursor-pointer transition-all ${payingRow?.invoiceId === (item.invoiceId ?? '') && payingRow?.semNumber === item.semNumber ? 'border-primary ring-2 ring-primary/20' : 'hover:border-gray-300'} ${item.status === 'overdue' ? 'border-red-200' : ''}`}
                    onClick={() => {
                      setPayingRow({ invoiceId: item.invoiceId ?? '', balance: item.balance, label: item.label, semNumber: item.semNumber })
                      setCustomAmount(String(item.balance))
                    }}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.invoiceNumber} - Due {formatDate(item.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">{formatCurrency(item.balance)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[item.status]?.bg} ${STATUS_CONFIG[item.status]?.color}`}>
                            {STATUS_CONFIG[item.status]?.label}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {payingRow && (
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Pay: {payingRow.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {requestSubmitted ? (
                        <div className="text-center py-4 space-y-3">
                          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                          <div>
                            <p className="font-semibold text-green-700">Payment Submitted!</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {payMode === 'upi'
                                ? 'UTR submitted. Admin will verify within 24 hours.'
                                : 'Payment request sent. Admin will approve and notify you via WhatsApp.'}
                            </p>
                          </div>
                          <Button variant="outline" className="w-full" onClick={closePayModal}>Close</Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Amount to Pay (Rs.) <span className="text-destructive">*</span></Label>
                            <Input type="number" value={customAmount}
                              onChange={e => {
                                const val = e.target.value
                                setCustomAmount(val)
                                const amt = parseFloat(val)
                                const isLastSem = payingRow.semNumber !== undefined
                                  && d.student.totalSems > 0
                                  && payingRow.semNumber >= d.student.totalSems
                                if (amt > payingRow.balance + 0.01 && isLastSem) {
                                  setAmountError(`Last period - please pay exact amount Rs.${payingRow.balance.toLocaleString('en-IN')}`)
                                } else if (amt <= 0) {
                                  setAmountError('Amount must be greater than 0')
                                } else {
                                  setAmountError('')
                                }
                              }}
                              min={1}
                              placeholder={String(payingRow.balance)} />
                            {amountError && <p className="text-xs text-red-500">{amountError}</p>}
                            {!amountError && parseFloat(customAmount) > 0 && parseFloat(customAmount) < payingRow.balance - 0.01 && (
                              <p className="text-xs text-yellow-600">
                                Partial payment - Rs.{(payingRow.balance - parseFloat(customAmount)).toLocaleString('en-IN')} will remain due.
                              </p>
                            )}
                            {!amountError && parseFloat(customAmount) > payingRow.balance + 0.01 && (() => {
                              const isLastSem = payingRow.semNumber !== undefined && d.student.totalSems > 0 && payingRow.semNumber >= d.student.totalSems
                              const excess = parseFloat(customAmount) - payingRow.balance
                              return !isLastSem ? (
                                <p className="text-xs text-blue-600">
                                  Excess Rs.{excess.toLocaleString('en-IN')} will be credited to next period.
                                </p>
                              ) : null
                            })()}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setPayMode('upi')}
                              className={`p-3 rounded-xl border-2 text-center transition-colors ${payMode === 'upi' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                              <p className="text-xs font-semibold">UPI / Bank Transfer</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Submit UTR for verification</p>
                            </button>
                            <button onClick={() => setPayMode('online')}
                              className={`p-3 rounded-xl border-2 text-center transition-colors ${payMode === 'online' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                              <p className="text-xs font-semibold">Online (Cashfree)</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Card / UPI / Net Banking</p>
                            </button>
                          </div>

                          {payMode === 'upi' && (
                            <div className="space-y-3">
                              {paymentDetails && (paymentDetails.upiId || paymentDetails.upiQrUrl || paymentDetails.bankAccountNumber) ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                                  <p className="text-xs font-semibold text-blue-800">Transfer to:</p>
                                  {paymentDetails.upiQrUrl && (
                                    <div className="flex justify-center">
                                      <img src={paymentDetails.upiQrUrl} alt="UPI QR" className="w-32 h-32 rounded-lg border" />
                                    </div>
                                  )}
                                  {paymentDetails.upiId && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-blue-700">UPI ID:</span>
                                      <span className="text-xs font-mono font-bold text-blue-900">{paymentDetails.upiId}</span>
                                    </div>
                                  )}
                                  {paymentDetails.bankAccountNumber && (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-blue-700">Account:</span>
                                        <span className="text-xs font-mono font-bold text-blue-900">{paymentDetails.bankAccountNumber}</span>
                                      </div>
                                      {paymentDetails.bankIfsc && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-blue-700">IFSC:</span>
                                          <span className="text-xs font-mono font-bold text-blue-900">{paymentDetails.bankIfsc}</span>
                                        </div>
                                      )}
                                      {paymentDetails.bankName && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-blue-700">Bank:</span>
                                          <span className="text-xs font-bold text-blue-900">{paymentDetails.bankName}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <p className="text-[10px] text-blue-600">Transfer {formatCurrency(parseFloat(customAmount) || payingRow.balance)} and enter UTR below</p>
                                </div>
                              ) : (
                                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
                                  Contact admin for UPI/Bank details
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <Label className="text-xs">UTR / Transaction Reference <span className="text-destructive">*</span></Label>
                                <Input value={utrRef} onChange={e => setUtrRef(e.target.value)}
                                  placeholder="e.g. 123456789012 or UPI ref" />
                              </div>
                              <Button className="w-full gap-2" disabled={submittingUpi || !utrRef.trim() || !!amountError}
                                onClick={submitUpi}>
                                {submittingUpi
                                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                  : 'Submit UTR for Verification'}
                              </Button>
                            </div>
                          )}

                          {payMode === 'online' && (
                            <Button className="w-full gap-2" disabled={initiateOnline.isPending || !!amountError}
                              onClick={() => initiateOnline.mutate()}>
                              {initiateOnline.isPending
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to gateway...</>
                                : <><CreditCard className="w-4 h-4" /> Pay {formatCurrency(parseFloat(customAmount) || payingRow.balance)} Online</>}
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="p-4 space-y-3">
            {semesters.every(s => s.invoice?.payments.length === 0 || !s.invoice) && paidOther.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No payment history yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {semesters.filter(s => (s.invoice?.payments.length ?? 0) > 0).map(row => (
                  <div key={row.sem}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1.5">{periodLabel(student.rentPackage, row.sem)}</p>
                    {row.invoice!.payments.map(p => (
                      <Card key={p.id} className="mb-2">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{formatDate(p.paidDate)}</p>
                                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                                  {p.paymentMode.replace('_', ' ')}
                                  {p.transactionRef ? ` - UTR: ${p.transactionRef}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-green-700">{formatCurrency(p.amount)}</p>
                              <a href={`${API_URL}/finance/receipts/${p.receiptNumber}?inline=1`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary flex items-center gap-1 justify-end mt-0.5 hover:underline">
                                <Download className="w-3 h-3" /> Receipt
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
                {paidOther.map(inv => (
                  <div key={inv.id}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1.5 capitalize">{inv.description ?? inv.type}</p>
                    {inv.payments.map(p => (
                      <Card key={p.id} className="mb-2">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{formatDate(p.paidDate)}</p>
                                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                                  {p.paymentMode.replace('_', ' ')}
                                  {p.transactionRef ? ` - UTR: ${p.transactionRef}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-green-700">{formatCurrency(p.amount)}</p>
                              <a href={`${API_URL}/finance/receipts/${p.receiptNumber}?inline=1`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary flex items-center gap-1 justify-end mt-0.5 hover:underline">
                                <Download className="w-3 h-3" /> Receipt
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
