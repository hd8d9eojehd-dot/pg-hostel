'use client'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateComplaintSchema, type CreateComplaintInput, COMPLAINT_CATEGORY, COMPLAINT_PRIORITY } from '@pg-hostel/shared'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { statusColor, formatDate } from '@/lib/utils'
import { useMyComplaints, useSubmitComplaint } from '@/hooks/use-portal'
import { useToast } from '@/hooks/use-toast'
import { Plus, X, MessageSquare, Loader2, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import api from '@/lib/api'
import Link from 'next/link'

export default function ComplaintsPage() {
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const { data: complaints, isLoading } = useMyComplaints()
  const submitComplaint = useSubmitComplaint()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateComplaintInput>({
    resolver: zodResolver(CreateComplaintSchema),
    defaultValues: { priority: 'medium' },
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Photo must be under 5MB', variant: 'destructive' }); return }
    setUploading(true)
    try {
      // Convert to base64 and upload directly
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const { data } = await api.post('/complaints/photo-upload-url', {
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      })
      setPhotoUrl(data.data.publicUrl)
      setValue('photoUrl', data.data.publicUrl)
    } catch {
      toast({ title: 'Photo upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: CreateComplaintInput) => {
    await submitComplaint.mutateAsync({ ...data, photoUrl: photoUrl || undefined } as Record<string, unknown>)
    reset()
    setPhotoUrl('')
    setShowForm(false)
  }

  const priorityColor = (p: string) => ({
    urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600',
  }[p] ?? 'bg-gray-100 text-gray-600')

  return (
    <div>
      <TopBar title="Complaints" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">

        <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2" variant={showForm ? 'outline' : 'default'}>
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Complaint</>}
        </Button>

        {/* New complaint form */}
        {showForm && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Submit a Complaint</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <select {...register('category')}
                    className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize">
                    <option value="">Select category...</option>
                    {COMPLAINT_CATEGORY.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COMPLAINT_PRIORITY.map(p => (
                      <label key={p} className="cursor-pointer">
                        <input type="radio" {...register('priority')} value={p} className="sr-only" />
                        <div className={`text-center py-2.5 rounded-xl text-xs font-semibold border-2 transition-all capitalize cursor-pointer
                          ${p === 'urgent' ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' :
                            p === 'high' ? 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100' :
                            p === 'medium' ? 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100' :
                            'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100'}`}>
                          {p}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <textarea {...register('description')} rows={4}
                    placeholder="Describe the issue in detail..."
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>

                {/* Photo upload */}
                <div className="space-y-1.5">
                  <Label>Photo (optional)</Label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  {photoUrl ? (
                    <div className="relative">
                      <img src={photoUrl} alt="Complaint photo" className="w-full h-32 object-cover rounded-xl" />
                      <button type="button" onClick={() => { setPhotoUrl(''); setValue('photoUrl', undefined) }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-primary/30 hover:text-primary transition-colors">
                      {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Camera className="w-4 h-4" /> Add Photo</>}
                    </button>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || submitComplaint.isPending}>
                  {(isSubmitting || submitComplaint.isPending)
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : 'Submit Complaint'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Complaints list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))}
          </div>
        ) : (complaints ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No complaints yet</p>
              <p className="text-sm mt-1">Tap the button above to raise an issue</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(complaints ?? []).map((c: {
              id: string; complaintNumber: string; category: string; description: string
              priority: string; status: string; createdAt: string; resolutionNote?: string
              comments: Array<{ id: string; comment: string; authorType: string; createdAt: string }>
            }) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{c.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(c.priority)}`}>{c.priority}</span>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                      {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-2">{c.description}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">{c.complaintNumber} · {formatDate(c.createdAt)}</p>
                    <Link href={`/complaints/${c.id}`} className="text-xs text-primary hover:underline">
                      View details →
                    </Link>
                  </div>

                  {expandedId === c.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {c.resolutionNote && (
                        <div className="p-2.5 bg-green-50 rounded-xl">
                          <p className="text-xs text-green-700">✅ {c.resolutionNote}</p>
                        </div>
                      )}
                      {c.comments.length > 0 && (
                        <div className="space-y-1.5">
                          {c.comments.slice(-2).map(comment => (
                            <div key={comment.id} className={`text-xs p-2.5 rounded-xl ${comment.authorType === 'admin' ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
                              <span className="font-semibold">{comment.authorType === 'admin' ? '👤 Admin' : '🎓 You'}: </span>
                              {comment.comment}
                            </div>
                          ))}
                        </div>
                      )}
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
