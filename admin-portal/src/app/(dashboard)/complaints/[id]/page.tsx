'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data.data),
  })

  const addComment = useMutation({
    mutationFn: () => api.post(`/complaints/${id}/comments`, { comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] })
      setComment('')
    },
    onError: () => toast({ title: 'Failed to add comment', variant: 'destructive' }),
  })

  const resolve = useMutation({
    mutationFn: () => api.patch(`/complaints/${id}`, { status: 'resolved', resolutionNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] })
      toast({ title: 'Complaint resolved' })
      setResolutionNote('')
    },
    onError: () => toast({ title: 'Failed to resolve', variant: 'destructive' }),
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/complaints/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['complaint', id] }),
  })

  if (isLoading) return (
    <div><Header title="Complaint" />
      <div className="p-6"><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /></div>
    </div>
  )
  if (!complaint) return null

  const priorityColor = (p: string) => ({
    urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600',
  }[p] ?? 'bg-gray-100 text-gray-600')

  return (
    <div>
      <Header title={`Complaint ${complaint.complaintNumber}`} />
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <Link href="/complaints">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Complaints
          </Button>
        </Link>

        {/* Complaint details */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(complaint.status)}`}>
                  {complaint.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColor(complaint.priority)}`}>
                  {complaint.priority}
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full capitalize">{complaint.category}</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">{complaint.complaintNumber}</span>
            </div>

            <p className="text-gray-800 mb-4">{complaint.description}</p>

            {complaint.photoUrl && (
              <img src={complaint.photoUrl} alt="Complaint photo" className="w-full max-h-48 object-cover rounded-xl mb-4" />
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Student</p>
                <p className="font-medium">{complaint.student?.name}</p>
                <p className="text-xs text-gray-400">{complaint.student?.studentId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Room</p>
                <p className="font-medium">Room {complaint.room?.roomNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="font-medium">{formatDate(complaint.createdAt)}</p>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <p className="text-xs text-gray-500">Resolved</p>
                  <p className="font-medium">{formatDate(complaint.resolvedAt)}</p>
                </div>
              )}
            </div>

            {complaint.resolutionNote && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl">
                <p className="text-xs text-green-600 font-medium mb-1">Resolution Note</p>
                <p className="text-sm text-green-800">{complaint.resolutionNote}</p>
              </div>
            )}

            {/* Status actions */}
            {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {complaint.status === 'new' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate('assigned')}>
                      Mark Assigned
                    </Button>
                  )}
                  {(complaint.status === 'assigned' || complaint.status === 'new') && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate('in_progress')}>
                      Mark In Progress
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Resolution Note</Label>
                  <div className="flex gap-2">
                    <Input
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Describe how the issue was resolved..."
                    />
                    <Button
                      className="gap-1.5 flex-shrink-0"
                      onClick={() => resolve.mutate()}
                      disabled={resolve.isPending || !resolutionNote}
                    >
                      {resolve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Comments ({complaint.comments?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(complaint.comments ?? []).map((c: {
              id: string; comment: string; authorType: string; createdAt: string
            }) => (
              <div key={c.id} className={`p-3 rounded-xl text-sm ${c.authorType === 'admin' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${c.authorType === 'admin' ? 'text-blue-700' : 'text-gray-600'}`}>
                    {c.authorType === 'admin' ? '👤 Admin' : '🎓 Student'}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                </div>
                <p className="text-gray-800">{c.comment}</p>
              </div>
            ))}

            {(complaint.comments ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
            )}

            {/* Add comment */}
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={e => { if (e.key === 'Enter' && comment) addComment.mutate() }}
              />
              <Button
                size="icon"
                onClick={() => addComment.mutate()}
                disabled={addComment.isPending || !comment}
              >
                {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
