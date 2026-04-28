'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { Plus, Send, Eye, Trash2, Bell } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = ['', 'general', 'rent', 'food', 'maintenance', 'rules', 'emergency', 'event'] as const
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}
const CATEGORY_ICON: Record<string, string> = {
  general: '📢', rent: '💰', food: '🍽️', maintenance: '🔧',
  rules: '📋', emergency: '🚨', event: '🎉',
}

export default function NoticesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [published, setPublished] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['notices', category, published, page],
    queryFn: () => api.get('/notices', {
      params: {
        category: category || undefined,
        isPublished: published !== '' ? published : undefined,
        page,
        limit: 15,
      },
    }).then(r => r.data),
  })

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/notices/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); toast({ title: '✓ Notice published' }) },
  })

  const sendWA = useMutation({
    mutationFn: (id: string) => api.post(`/notices/${id}/whatsapp`),
    onSuccess: (res) => toast({ title: `✓ Sent to ${res.data.data?.sent ?? 0} students` }),
    onError: () => toast({ title: 'WhatsApp send failed', variant: 'destructive' }),
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/notices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); toast({ title: 'Notice deleted' }) },
  })

  const notices = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div>
      <Header title="Notices" />
      <div className="p-4 md:p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1) }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c ? `${CATEGORY_ICON[c] ?? ''} ${c}` : 'All Categories'}</option>
              ))}
            </select>
            <select
              value={published}
              onChange={e => { setPublished(e.target.value); setPage(1) }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Drafts</option>
            </select>
          </div>
          <Link href="/notices/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Notice</Button>
          </Link>
        </div>

        {/* Notices grid */}
        <div className="grid gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="h-20 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : notices.length === 0 ? (
            <Card>
              <CardContent className="p-16 text-center text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No notices found</p>
                <p className="text-sm mt-1">Create your first notice using the button above</p>
              </CardContent>
            </Card>
          ) : (
            notices.map((n: {
              id: string; title: string; description: string; category: string
              priority: string; isPublished: boolean; whatsappSent: boolean
              createdAt: string; expiryDate?: string
            }) => (
              <Card key={n.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[n.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                          {n.priority}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                          {CATEGORY_ICON[n.category] ?? ''} {n.category}
                        </span>
                        {n.isPublished
                          ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">✓ Published</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>
                        }
                        {n.whatsappSent && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">📱 WhatsApp sent</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-tight">{n.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{formatDate(n.createdAt)}</span>
                        {n.expiryDate && <span>Expires: {formatDate(n.expiryDate)}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {!n.isPublished && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => publish.mutate(n.id)} disabled={publish.isPending}>
                          <Eye className="w-3 h-3" /> Publish
                        </Button>
                      )}
                      {n.isPublished && !n.whatsappSent && (
                        <Button size="sm" className="gap-1 text-xs" onClick={() => sendWA.mutate(n.id)} disabled={sendWA.isPending}>
                          <Send className="w-3 h-3" /> WhatsApp
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Delete this notice?')) del.mutate(n.id)
                        }}
                        disabled={del.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages} · {pagination.total} notices</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
