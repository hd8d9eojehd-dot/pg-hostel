'use client'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { PAYMENT_MODE } from '@pg-hostel/shared'
import api from '@/lib/api'
import { ArrowLeft, IndianRupee, Download, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [payOpen, setPayOpen] = useState(false)
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [payForm, setPayForm] = useState({ amount: 0, paymentMode: 'cash', paidDate: new Date().toISOString().split('T')[0], transactionRef: '', notes: '' })
  const [waiveForm, setWaiveForm] = useState({ reason: '' })

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/finance/invoices/${id}`).then(r => r.data.data),
  })

  const recordPayment = useMutation({
    mutationFn: () => api.post('/finance/payments', {
      invoiceId: id,
      studentId: invoice?.studentId,
      ...payForm,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      toast({ title: `Payment recorded — ${res.data.data.receiptNumber}` })
      setPayOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const waive = useMutation({
    mutationFn: () => api.post(`/finance/invoices/${id}/waive`, waiveForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      toast({ title: 'Invoice waived' })
      setWaiveOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  if (isLoading) return (
    <div><Header title="Invoice" />
      <div className="p-6"><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /></div>
    </div>
  )
  if (!invoice) return null

  return (
    <div>
      <Header title={`Invoice ${invoice.invoiceNumber}`} />
      <div className="p-4 md:p-6 space-y-4 max-w-2xl">
        <Link href="/finance">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Finance
          </Button>
        </Link>

        {/* Invoice summary */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-mono text-sm text-gray-500">{invoice.invoiceNumber}</p>
                <h2 className="text-xl font-bold mt-0.5">{invoice.description ?? invoice.type}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {invoice.student?.name} · {invoice.student?.studentId}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
              {[
                { label: 'Amount', value: formatCurrency(Number(invoice.amount)) },
                { label: 'Late Fee', value: formatCurrency(Number(invoice.lateFee)) },
                { label: 'Discount', value: formatCurrency(Number(invoice.discount)) },
                { label: 'Total', value: formatCurrency(Number(invoice.totalAmount)), bold: true },
                { label: 'Paid', value: formatCurrency(Number(invoice.paidAmount)), color: 'text-green-600' },
                { label: 'Balance', value: formatCurrency(Number(invoice.balance)), color: Number(invoice.balance) > 0 ? 'text-red-600' : 'text-green-600', bold: true },
                { label: 'Due Date', value: formatDate(invoice.dueDate) },
                { label: 'Generated', value: formatDate(invoice.generatedDate) },
              ].map(({ label, value, bold, color }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-sm font-medium mt-0.5 ${bold ? 'font-bold text-base' : ''} ${color ?? ''}`}>{value}</p>
                </div>
              ))}
            </div>

            {invoice.notes && (
              <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{invoice.notes}</p>
            )}

            {invoice.status !== 'paid' && invoice.status !== 'waived' && (
              <div className="flex gap-3 mt-4 pt-4 border-t">
                <Button className="gap-1.5" onClick={() => { setPayForm(f => ({ ...f, amount: Number(invoice.balance) })); setPayOpen(true) }}>
                  <IndianRupee className="w-4 h-4" /> Record Payment
                </Button>
                <Button variant="outline" className="gap-1.5 text-orange-600 border-orange-200" onClick={() => setWaiveOpen(true)}>
                  <XCircle className="w-4 h-4" /> Waive Invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment history */}
        {invoice.payments?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Receipt</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Mode</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Date</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p: { id: string; receiptNumber: string; paymentMode: string; paidDate: string; amount: number }) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{p.receiptNumber}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell capitalize">{p.paymentMode.replace('_', ' ')}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">{formatDate(p.paidDate)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">{formatCurrency(Number(p.amount))}</td>
                      <td className="px-4 py-2.5">
                        <a href={`${process.env['NEXT_PUBLIC_API_URL']}/finance/receipts/${p.receiptNumber}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /></Button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
              Balance: <strong>{formatCurrency(Number(invoice.balance))}</strong>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <select value={payForm.paymentMode} onChange={e => setPayForm(f => ({ ...f, paymentMode: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                {PAYMENT_MODE.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Transaction Reference</Label>
              <Input value={payForm.transactionRef} onChange={e => setPayForm(f => ({ ...f, transactionRef: e.target.value }))} placeholder="UPI ID, cheque no., etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending || !payForm.amount}>
              {recordPayment.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waive Dialog */}
      <Dialog open={waiveOpen} onOpenChange={setWaiveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Waive Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">This will mark the invoice as waived and clear the balance of <strong>{formatCurrency(Number(invoice.balance))}</strong>.</p>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Input value={waiveForm.reason} onChange={e => setWaiveForm({ reason: e.target.value })} placeholder="Reason for waiving..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => waive.mutate()} disabled={waive.isPending || !waiveForm.reason}>
              {waive.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiving...</> : 'Waive Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
