'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatDateTime, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [comment, setComment] = useState('')

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaint-detail', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data.data),
  })

  const addComment = useMutation({
    mutationFn: () => api.post(`/complaints/${id}/comments`, { comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint-detail', id] })
      qc.invalidateQueries({ queryKey: ['my-complaints'] })
      setComment('')
    },
    onError: () => toast({ title: 'Failed to send', variant: 'destructive' }),
  })

  const priorityColor = (p: string) => ({
    urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600',
  }[p] ?? 'bg-gray-100 text-gray-600')

  if (isLoading) return (
    <div><TopBar title="Complaint" />
      <div className="p-4"><div className="h-48 bg-gray-100 rounded-2xl animate-pulse" /></div>
    </div>
  )
  if (!complaint) return null

  return (
    <div>
      <TopBar title="Complaint Details" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Link href="/complaints">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Complaints
          </Button>
        </Link>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(complaint.status)}`}>
                  {complaint.status.replace('_', ' ')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(complaint.priority)}`}>{complaint.priority}</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">{complaint.category}</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">{complaint.complaintNumber}</span>
            </div>

            <p className="text-gray-800">{complaint.description}</p>

            {complaint.photoUrl && (
              <img src={complaint.photoUrl} alt="Complaint" className="w-full max-h-48 object-cover rounded-xl" />
            )}

            <p className="text-xs text-gray-400">Submitted {formatDate(complaint.createdAt)}</p>

            {complaint.resolutionNote && (
              <div className="p-3 bg-green-50 rounded-xl">
                <p className="text-xs font-medium text-green-700 mb-0.5">✅ Resolution</p>
                <p className="text-sm text-green-800">{complaint.resolutionNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Comments ({complaint.comments?.length ?? 0})</p>

            {(complaint.comments ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
            ) : (
              <div className="space-y-2">
                {(complaint.comments ?? []).map((c: {
                  id: string; comment: string; authorType: string; createdAt: string
                }) => (
                  <div key={c.id} className={`p-3 rounded-xl text-sm ${c.authorType === 'admin' ? 'bg-blue-50 text-blue-800 ml-4' : 'bg-gray-50 text-gray-700 mr-4'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{c.authorType === 'admin' ? '👤 Admin' : '🎓 You'}</span>
                      <span className="text-xs opacity-60">{formatDateTime(c.createdAt)}</span>
                    </div>
                    {c.comment}
                  </div>
                ))}
              </div>
            )}

            {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  onKeyDown={e => { if (e.key === 'Enter' && comment) addComment.mutate() }}
                />
                <Button size="icon" onClick={() => addComment.mutate()} disabled={addComment.isPending || !comment}>
                  {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
