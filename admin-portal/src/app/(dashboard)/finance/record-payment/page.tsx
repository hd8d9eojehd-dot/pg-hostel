'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RecordPaymentSchema, type RecordPaymentInput, PAYMENT_MODE } from '@pg-hostel/shared'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, Loader2, IndianRupee, CheckCircle2, Download, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'

type PaymentResult = {
  id: string; receiptNumber: string; amount: number; paymentMode: string
  paidDate: string; transactionRef?: string
}

function RecordPaymentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('invoiceId') ?? ''
  const { toast } = useToast()
  const [successPayment, setSuccessPayment] = useState<PaymentResult | null>(null)
  const [addLateFee, setAddLateFee] = useState(false)
  const [lateFeeAmount, setLateFeeAmount] = useState(0)

  const { data: invoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.get(`/finance/invoices/${invoiceId}`).then(r => r.data.data),
    enabled: !!invoiceId,
  })

  const balance = invoice ? Number(invoice.balance) : 0
  const totalWithLateFee = balance + (addLateFee ? lateFeeAmount : 0)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RecordPaymentInput>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: {
      invoiceId,
      studentId: invoice?.studentId ?? '',
      paymentMode: 'cash',
      paidDate: new Date().toISOString().split('T')[0],
    },
  })

  const paymentMode = watch('paymentMode')
  const amountPaid = watch('amount')
  const remaining = totalWithLateFee - (amountPaid ?? 0)

  const record = useMutation({
    mutationFn: async (data: RecordPaymentInput) => {
      // If late fee, first update invoice then record payment
      if (addLateFee && lateFeeAmount > 0) {
        await api.patch(`/finance/invoices/${invoiceId}/add-late-fee`, { lateFee: lateFeeAmount })
      }
      const res = await api.post('/finance/payments', { ...data, studentId: invoice?.studentId ?? data.studentId })
      return res.data.data
    },
    onSuccess: (payment) => setSuccessPayment(payment),
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  return (
    <div>
      <Header title="Record Payment" />
      <div className="p-4 md:p-6 max-w-xl">
        <Link href="/finance">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4"><ArrowLeft className="w-4 h-4" /> Finance</Button>
        </Link>

        {invoice && (
          <div className="mb-4 p-4 bg-blue-50 rounded-xl text-sm space-y-1">
            <p className="font-semibold text-blue-900">{invoice.student?.name} — {invoice.invoiceNumber}</p>
            <p className="text-blue-700">{invoice.description ?? invoice.type} · Due {formatDate(invoice.dueDate)}</p>
            <p className="text-blue-800 font-bold">Balance: {formatCurrency(balance)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(d => record.mutate({ ...d, studentId: invoice?.studentId ?? d.studentId }))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <input type="hidden" {...register('invoiceId')} value={invoiceId} />
              <input type="hidden" {...register('studentId')} value={invoice?.studentId ?? ''} />

              {/* Late fee option */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addLateFee} onChange={e => setAddLateFee(e.target.checked)}
                    className="w-4 h-4 accent-orange-500" />
                  <span className="text-sm font-medium text-orange-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Add Late Fee (optional)
                  </span>
                </label>
                {addLateFee && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-orange-700">₹</span>
                    <Input type="number" min={0} value={lateFeeAmount}
                      onChange={e => setLateFeeAmount(Number(e.target.value))}
                      placeholder="Late fee amount" className="h-8 text-sm" />
                  </div>
                )}
              </div>

              {addLateFee && lateFeeAmount > 0 && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  Balance: {formatCurrency(balance)} + Late fee: {formatCurrency(lateFeeAmount)} = <strong>{formatCurrency(totalWithLateFee)}</strong>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  placeholder={String(totalWithLateFee || balance)}
                  className={errors.amount ? 'border-destructive' : ''} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                {amountPaid > 0 && amountPaid < totalWithLateFee && (
                  <p className="text-xs text-yellow-600">Partial payment — {formatCurrency(remaining)} will remain due</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Payment Mode <span className="text-destructive">*</span></Label>
                <select {...register('paymentMode')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {PAYMENT_MODE.map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
                </select>
              </div>

              {(paymentMode === 'upi' || paymentMode === 'bank_transfer' || paymentMode === 'online') && (
                <div className="space-y-1.5">
                  <Label>UTR / Transaction Reference <span className="text-destructive">*</span></Label>
                  <Input {...register('transactionRef')} placeholder="UTR number or transaction ID" />
                  <p className="text-xs text-gray-400">Required for UPI/Bank/Online payments</p>
                </div>
              )}

              {paymentMode === 'cash' && (
                <div className="space-y-1.5">
                  <Label>Reference (optional)</Label>
                  <Input {...register('transactionRef')} placeholder="Cash receipt note..." />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Payment Date <span className="text-destructive">*</span></Label>
                <Input type="date" {...register('paidDate')} className={errors.paidDate ? 'border-destructive' : ''} />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input {...register('notes')} placeholder="Optional notes..." />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting || record.isPending}>
            {(isSubmitting || record.isPending)
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</>
              : <><IndianRupee className="w-4 h-4" /> Record Payment</>}
          </Button>
        </form>
      </div>

      <Dialog open={!!successPayment} onOpenChange={() => { setSuccessPayment(null); router.push('/finance') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" /> Payment Recorded
            </DialogTitle>
          </DialogHeader>
          {successPayment && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs text-gray-500">Receipt Number</p>
                <p className="text-2xl font-bold font-mono text-green-700 mt-1">{successPayment.receiptNumber}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(successPayment.paidDate)}</p>
              </div>
              <div className="border rounded-xl divide-y text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500">Mode</span>
                  <span className="capitalize">{successPayment.paymentMode?.replace('_', ' ')}</span>
                </div>
                {successPayment.transactionRef && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-500">UTR / Ref</span>
                    <span className="font-mono text-xs">{successPayment.transactionRef}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-green-50">
                  <span className="font-semibold text-green-800">Amount Paid</span>
                  <span className="font-bold text-green-700 text-lg">{formatCurrency(Number(successPayment.amount))}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5" asChild>
                  <a href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/finance/receipts/${successPayment.receiptNumber}`}
                    target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" /> Receipt
                  </a>
                </Button>
                <Button className="flex-1" onClick={() => { setSuccessPayment(null); router.push('/finance') }}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RecordPaymentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <RecordPaymentForm />
    </Suspense>
  )
}
