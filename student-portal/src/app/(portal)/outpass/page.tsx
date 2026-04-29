'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateOutpassSchema, type CreateOutpassInput } from '@pg-hostel/shared'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { statusColor, formatDate } from '@/lib/utils'
import { useMyOutpasses, useSubmitOutpass } from '@/hooks/use-portal'
import { Plus, X, DoorOpen, Loader2 } from 'lucide-react'

export default function OutpassPage() {
  const [showForm, setShowForm] = useState(false)

  const { data: outpasses, isLoading } = useMyOutpasses()
  const submitOutpass = useSubmitOutpass()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CreateOutpassInput>({
    resolver: zodResolver(CreateOutpassSchema),
    defaultValues: { type: 'outpass' },
  })

  const outpassType = watch('type')

  const onSubmit = async (data: CreateOutpassInput) => {
    await submitOutpass.mutateAsync(data as Record<string, unknown>)
    reset()
    setShowForm(false)
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-gray-100 text-gray-500',
    }
    return colors[status] ?? 'bg-gray-100 text-gray-600'
  }

  return (
    <div>
      <TopBar title="Outpass" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">

        <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2" variant={showForm ? 'outline' : 'default'}>
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Request Outpass</>}
        </Button>

        {/* Form */}
        {showForm && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Outpass Request</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Type selector */}
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'outpass', label: '🚶 Outpass', desc: 'Same day' },
                      { value: 'leave', label: '🏠 Leave', desc: 'Overnight' },
                      { value: 'sem_holiday', label: '🎓 Sem Holiday', desc: 'Semester break' },
                    ].map(({ value, label, desc }) => (
                      <label key={value} className="cursor-pointer">
                        <input type="radio" {...register('type')} value={value} className="sr-only" />
                        <div className={`p-2.5 rounded-xl border-2 text-center transition-colors ${
                          outpassType === value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <p className="text-xs font-medium">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>From Date <span className="text-destructive">*</span></Label>
                    <Input type="date" {...register('fromDate')} className={errors.fromDate ? 'border-destructive' : ''} />
                    {errors.fromDate && <p className="text-xs text-destructive">{errors.fromDate.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>To Date <span className="text-destructive">*</span></Label>
                    <Input type="date" {...register('toDate')} className={errors.toDate ? 'border-destructive' : ''} />
                    {errors.toDate && <p className="text-xs text-destructive">{errors.toDate.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Destination <span className="text-destructive">*</span></Label>
                  <Input placeholder="Where are you going?" {...register('destination')} className={errors.destination ? 'border-destructive' : ''} />
                  {errors.destination && <p className="text-xs text-destructive">{errors.destination.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Reason <span className="text-destructive">*</span></Label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    placeholder="Reason for going out..."
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Contact at Destination</Label>
                  <Input placeholder="Mobile number (optional)" {...register('contactAtDestination')} />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || submitOutpass.isPending}>
                  {(isSubmitting || submitOutpass.isPending)
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : 'Submit Request'
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Outpass list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))}
          </div>
        ) : (outpasses ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-400">
              <DoorOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No outpass requests yet</p>
              <p className="text-sm mt-1">Tap the button above to request</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(outpasses ?? []).map((o: {
              id: string; outpassNumber: string; type: string; reason: string
              fromDate: string; toDate: string; destination?: string
              status: string; approvalNote?: string; createdAt: string
            }) => (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(o.status)}`}>
                        {o.status}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{o.type}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono flex-shrink-0">{o.outpassNumber}</span>
                  </div>

                  <p className="text-sm text-gray-700">{o.reason}</p>

                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span>📅 {formatDate(o.fromDate)} → {formatDate(o.toDate)}</span>
                    {o.destination && <span>📍 {o.destination}</span>}
                  </div>

                  {o.approvalNote && (
                    <div className={`mt-2 p-2.5 rounded-xl text-xs ${
                      o.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className="font-medium">Admin note: </span>{o.approvalNote}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
