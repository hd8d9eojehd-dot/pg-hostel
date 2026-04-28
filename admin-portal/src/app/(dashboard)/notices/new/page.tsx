'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateNoticeSchema, type CreateNoticeInput, NOTICE_CATEGORY, NOTICE_PRIORITY } from '@pg-hostel/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, Loader2, Bell, Send } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const CATEGORY_ICON: Record<string, string> = {
  general: '📢', rent: '💰', food: '🍽️', maintenance: '🔧',
  rules: '📋', emergency: '🚨', event: '🎉',
}

export default function NewNoticePage() {
  const router = useRouter()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [publishAfter, setPublishAfter] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateNoticeInput>({
    resolver: zodResolver(CreateNoticeSchema),
    defaultValues: { category: 'general', priority: 'medium' },
  })

  const selectedCategory = watch('category')
  const selectedPriority = watch('priority')

  const create = useMutation({
    mutationFn: async (data: CreateNoticeInput) => {
      const res = await api.post('/notices', data)
      const noticeId = res.data.data.id
      if (publishAfter) {
        await api.post(`/notices/${noticeId}/publish`)
      }
      return res.data.data
    },
    onSuccess: (notice) => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      toast({ title: publishAfter ? '✓ Notice created and published' : '✓ Notice saved as draft' })
      router.push('/notices')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  return (
    <div>
      <Header title="New Notice" />
      <div className="p-4 md:p-6 max-w-xl">
        <Link href="/notices">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" /> Notices
          </Button>
        </Link>

        <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Notice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input
                  {...register('title')}
                  placeholder="Notice title..."
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea
                  {...register('description')}
                  rows={5}
                  placeholder="Notice content..."
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-4 gap-2">
                  {NOTICE_CATEGORY.map(c => (
                    <label key={c} className="cursor-pointer">
                      <input type="radio" {...register('category')} value={c} className="sr-only" />
                      <div className={`p-2 rounded-xl border-2 text-center text-xs transition-colors capitalize ${
                        selectedCategory === c ? 'border-primary bg-primary/5 font-medium' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="text-base mb-0.5">{CATEGORY_ICON[c] ?? '📌'}</div>
                        {c}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <div className="grid grid-cols-4 gap-2">
                  {NOTICE_PRIORITY.map(p => (
                    <label key={p} className="cursor-pointer">
                      <input type="radio" {...register('priority')} value={p} className="sr-only" />
                      <div className={`py-2 rounded-xl border-2 text-center text-xs font-medium capitalize transition-colors ${
                        selectedPriority === p
                          ? p === 'urgent' ? 'border-red-400 bg-red-50 text-red-700'
                          : p === 'high' ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : p === 'medium' ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                          : 'border-gray-400 bg-gray-50 text-gray-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                        {p}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input type="date" {...register('expiryDate')} />
              </div>

              {/* Publish option */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="publishNow"
                  checked={publishAfter}
                  onChange={e => setPublishAfter(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <div>
                  <Label htmlFor="publishNow" className="cursor-pointer">Publish immediately</Label>
                  <p className="text-xs text-gray-400 mt-0.5">Students will see this notice right away</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" size="lg" className="flex-1 gap-2" disabled={isSubmitting || create.isPending}>
              {(isSubmitting || create.isPending)
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                : publishAfter
                  ? <><Send className="w-4 h-4" /> Create & Publish</>
                  : <><Bell className="w-4 h-4" /> Save as Draft</>
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
