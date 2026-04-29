'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateInvoiceSchema, type CreateInvoiceInput, INVOICE_TYPE } from '@pg-hostel/shared'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, Loader2, FilePlus } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function NewInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledStudentId = searchParams.get('studentId') ?? ''
  const { toast } = useToast()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      type: 'rent',
      discount: 0,
      lateFee: 0,
      studentId: prefilledStudentId,
    },
  })

  const studentId = watch('studentId')

  const { data: student } = useQuery({
    queryKey: ['student-lookup', studentId],
    queryFn: () => api.get(`/students/${studentId}`).then(r => r.data.data),
    enabled: studentId?.length === 36,
    retry: false,
  })

  const create = useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post('/finance/invoices', data),
    onSuccess: (res) => {
      toast({ title: `Invoice ${res.data.data.invoiceNumber} created` })
      if (prefilledStudentId) {
        router.push(`/students/${prefilledStudentId}`)
      } else {
        router.push('/finance')
      }
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create invoice'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  return (
    <div>
      <Header title="New Invoice" />
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <Link href={prefilledStudentId ? `/students/${prefilledStudentId}` : '/finance'}>
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>

        <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <Label>Student ID (UUID) <span className="text-destructive">*</span></Label>
                <Input {...register('studentId')} placeholder="Paste student UUID..." className={errors.studentId ? 'border-destructive' : ''} />
                {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
                {student && (
                  <p className="text-xs text-green-600 font-medium">&#10003; {student.name} ({student.studentId})</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Invoice Type <span className="text-destructive">*</span></Label>
                <select {...register('type')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {INVOICE_TYPE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Input {...register('description')} placeholder="e.g. Monthly rent - June 2025" className={errors.description ? 'border-destructive' : ''} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (Rs.) <span className="text-destructive">*</span></Label>
                  <Input type="number" {...register('amount', { valueAsNumber: true })} placeholder="8000" className={errors.amount ? 'border-destructive' : ''} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Discount (Rs.)</Label>
                  <Input type="number" {...register('discount', { valueAsNumber: true })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Late Fee (Rs.)</Label>
                  <Input type="number" {...register('lateFee', { valueAsNumber: true })} placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Due Date <span className="text-destructive">*</span></Label>
                <Input type="date" {...register('dueDate')} className={errors.dueDate ? 'border-destructive' : ''} />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register('notes')} placeholder="Optional notes..." />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting || create.isPending}>
            {(isSubmitting || create.isPending)
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><FilePlus className="w-4 h-4" /> Create Invoice</>
            }
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <NewInvoiceForm />
    </Suspense>
  )
}
