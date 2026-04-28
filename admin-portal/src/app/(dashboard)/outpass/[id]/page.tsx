'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate, statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function OutpassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState('')

  const { data: outpass, isLoading } = useQuery({
    queryKey: ['outpass', id],
    queryFn: () => api.get(`/outpass/${id}`).then(r => r.data.data),
  })

  const approve = useMutation({
    mutationFn: () => api.post(`/outpass/${id}/approve`, { note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outpass', id] }); toast({ title: 'Outpass approved' }); setApproveOpen(false) },
    onError: () => toast({ title: 'Failed', variant: 'destructive' }),
  })

  const reject = useMutation({
    mutationFn: () => api.post(`/outpass/${id}/reject`, { note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outpass', id] }); toast({ title: 'Outpass rejected' }); setRejectOpen(false) },
    onError: () => toast({ title: 'Failed', variant: 'destructive' }),
  })

  const confirmReturn = useMutation({
    mutationFn: () => api.post(`/outpass/${id}/return`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outpass', id] }); toast({ title: 'Return confirmed' }) },
  })

  if (isLoading) return (
    <div><Header title="Outpass" />
      <div className="p-6"><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /></div>
    </div>
  )
  if (!outpass) return null

  return (
    <div>
      <Header title={`Outpass ${outpass.outpassNumber}`} />
      <div className="p-4 md:p-6 space-y-4 max-w-xl">
        <Link href="/outpass">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Outpass
          </Button>
        </Link>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(outpass.status)}`}>
                  {outpass.status}
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full capitalize">{outpass.type}</span>
              </div>
              <span className="text-xs text-gray-400 font-mono">{outpass.outpassNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Student</p>
                <p className="font-medium">{outpass.student?.name}</p>
                <p className="text-xs text-gray-400">{outpass.student?.studentId}</p>
                <p className="text-xs text-gray-400">{outpass.student?.mobile}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dates</p>
                <p className="font-medium">{formatDate(outpass.fromDate)}</p>
                <p className="text-xs text-gray-400">to {formatDate(outpass.toDate)}</p>
                {outpass.fromTime && <p className="text-xs text-gray-400">{outpass.fromTime} – {outpass.toTime}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="font-medium">{outpass.destination ?? '—'}</p>
                {outpass.contactAtDestination && <p className="text-xs text-gray-400">{outpass.contactAtDestination}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Reason</p>
                <p className="font-medium">{outpass.reason}</p>
              </div>
            </div>

            {outpass.approvalNote && (
              <div className={`p-3 rounded-xl text-sm ${outpass.status === 'approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="text-xs font-medium mb-1">Note</p>
                {outpass.approvalNote}
              </div>
            )}

            {outpass.status === 'pending' && (
              <div className="flex gap-3 pt-2 border-t">
                <Button className="flex-1 gap-1.5" onClick={() => setApproveOpen(true)}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1 gap-1.5" onClick={() => setRejectOpen(true)}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            )}

            {outpass.status === 'approved' && (
              <Button variant="outline" className="w-full gap-1.5" onClick={() => confirmReturn.mutate()} disabled={confirmReturn.isPending}>
                {confirmReturn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Confirm Return
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Outpass</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Any instructions..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
              {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Outpass</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => reject.mutate()} disabled={reject.isPending || !note}>
              {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
