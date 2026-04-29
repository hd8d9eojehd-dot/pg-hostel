'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { statusColor, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { CheckCircle, Eye, Trash2, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600',
}

export default function ComplaintsPage() {
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['complaints', status, category, page],
    queryFn: () => api.get('/complaints', { params: { status: status || undefined, category: category || undefined, page, limit: 20 } }).then(r => r.data),
    refetchInterval: 15_000, // auto-refresh every 15s for real-time
  })

  const resolve = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.patch(`/complaints/${id}`, { status: 'resolved', resolutionNote: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] })
      toast({ title: '✓ Complaint resolved' })
      setResolveId(null)
      setResolveNote('')
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const deleteSingle = useMutation({
    mutationFn: (id: string) => api.delete(`/complaints/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); toast({ title: 'Complaint deleted' }) },
    onError: (e: unknown) => toast({ title: 'Delete failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const deleteBulk = useMutation({
    mutationFn: () => api.delete('/complaints/bulk', { data: { ids: Array.from(selected) } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['complaints'] })
      toast({ title: res.data.message })
      setSelected(new Set())
    },
    onError: (e: unknown) => toast({ title: 'Bulk delete failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const complaints = data?.data ?? []
  const pagination = data?.pagination
  const resolvedSelected = complaints.filter((c: { id: string; status: string }) =>
    selected.has(c.id) && ['resolved', 'closed'].includes(c.status)
  ).length

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      <Header title="Complaints" />
      <div className="p-4 md:p-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm flex-shrink-0">
            <option value="">All Status</option>
            {['new', 'assigned', 'in_progress', 'resolved', 'closed'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm flex-shrink-0">
            <option value="">All Categories</option>
            {['wifi', 'fan', 'light', 'water', 'cleaning', 'food', 'furniture', 'plumbing', 'pest', 'noise', 'other'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <span className="text-sm text-gray-500">{selected.size} selected ({resolvedSelected} deletable)</span>
              <Button size="sm" variant="destructive" className="gap-1.5"
                disabled={resolvedSelected === 0 || deleteBulk.isPending}
                onClick={() => deleteBulk.mutate()}>
                {deleteBulk.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="grid gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : complaints.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-gray-400">No complaints found</CardContent></Card>
          ) : (
            complaints.map((c: {
              id: string; complaintNumber: string; category: string; description: string
              priority: string; status: string; createdAt: string; photoUrl?: string
              student: { name: string; studentId: string; avatarUrl?: string }
              room: { roomNumber: string }
              _count: { comments: number }
            }) => (
              <Card key={c.id} className={`hover:shadow-md transition-shadow ${selected.has(c.id) ? 'ring-2 ring-primary/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                      className="mt-1 w-4 h-4 rounded accent-primary flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-gray-400">{c.complaintNumber}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[c.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.priority}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">{c.category}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{c.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {c.student.avatarUrl
                            ? <img src={c.student.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                            : <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">{c.student.name.charAt(0)}</div>
                          }
                          <span>{c.student.name} ({c.student.studentId})</span>
                        </div>
                        <span>Room {c.room.roomNumber}</span>
                        <span>{formatDate(c.createdAt)}</span>
                        {c._count.comments > 0 && <span>💬 {c._count.comments}</span>}
                        {c.photoUrl && <span className="text-blue-500">📷 Photo</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {!['resolved', 'closed'].includes(c.status) && (
                        <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 h-7 px-2 text-xs"
                          onClick={() => { setResolveId(c.id); setResolveNote('') }}>
                          <CheckCircle className="w-3 h-3" /> Resolve
                        </Button>
                      )}
                      <Link href={`/complaints/${c.id}`}>
                        <Button size="sm" variant="ghost" className="gap-1 h-7 px-2 text-xs w-full">
                          <Eye className="w-3 h-3" /> View
                        </Button>
                      </Link>
                      {['resolved', 'closed'].includes(c.status) && (
                        <Button size="sm" variant="ghost" className="gap-1 h-7 px-2 text-xs text-red-500 hover:bg-red-50"
                          onClick={() => { if (confirm('Delete this complaint?')) deleteSingle.mutate(c.id) }}>
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages} · {pagination.total} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveId} onOpenChange={o => { if (!o) setResolveId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Resolution Note</Label>
              <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                rows={3} placeholder="Describe how the issue was resolved..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button className="gap-1.5" disabled={resolve.isPending || !resolveNote.trim()}
              onClick={() => resolveId && resolve.mutate({ id: resolveId, note: resolveNote })}>
              {resolve.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving...</> : <><CheckCircle className="w-4 h-4" /> Mark Resolved</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
