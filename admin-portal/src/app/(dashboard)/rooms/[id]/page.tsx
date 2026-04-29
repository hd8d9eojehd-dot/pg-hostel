'use client'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { statusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, BedDouble, Wifi, Bath, Sofa, Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const BED_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const router = useRouter()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [addBedOpen, setAddBedOpen] = useState(false)
  const [newBedLabel, setNewBedLabel] = useState('A')
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean>>({})

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => api.get(`/rooms/${id}`).then(r => r.data.data),
  })

  // Sync edit form when room data loads
  useEffect(() => {
    if (room) {
      setEditForm({
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        monthlyRent: Number(room.monthlyRent ?? 0),
        semesterRent: Number(room.semesterRent ?? 0),
        annualRent: Number(room.annualRent ?? 0),
        hasAttachedBath: room.hasAttachedBath,
        isFurnished: room.isFurnished,
        hasWifi: room.hasWifi,
        notes: room.notes ?? '',
      })
    }
  }, [room])

  const updateRoom = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/rooms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', id] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast({ title: '✓ Room updated' })
      setEditOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const deleteRoom = useMutation({
    mutationFn: () => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      toast({ title: 'Room deleted' })
      router.push('/rooms')
    },
    onError: (e: unknown) => toast({ title: 'Cannot delete', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/rooms/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', id] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast({ title: 'Room status updated' })
    },
  })

  const addBed = useMutation({
    mutationFn: () => api.post(`/rooms/${id}/beds`, { bedLabel: newBedLabel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', id] })
      toast({ title: `✓ Bed ${newBedLabel} added` })
      setAddBedOpen(false)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const deleteBed = useMutation({
    mutationFn: (bedId: string) => api.delete(`/rooms/${id}/beds/${bedId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', id] })
      toast({ title: 'Bed removed' })
    },
    onError: (e: unknown) => toast({ title: 'Cannot remove', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  if (isLoading) return (
    <div><Header title="Room" />
      <div className="p-6"><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /></div>
    </div>
  )
  if (!room) return null

  const occupiedBeds = room.beds?.filter((b: { isOccupied: boolean }) => b.isOccupied).length ?? 0
  const totalBeds = room.beds?.length ?? 0
  const usedLabels = (room.beds ?? []).map((b: { bedLabel: string }) => b.bedLabel)
  const availableLabels = BED_LABELS.filter(l => !usedLabels.includes(l))

  return (
    <div>
      <Header title={`Room ${room.roomNumber}`} />
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link href="/rooms">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Rooms
            </Button>
          </Link>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit Room
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => { if (confirm('Delete this room? This cannot be undone.')) deleteRoom.mutate() }}
              disabled={deleteRoom.isPending || occupiedBeds > 0}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Room info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Room {room.roomNumber}</h2>
                <p className="text-gray-500 capitalize mt-0.5">{room.roomType} · {room.floor?.floorName ?? `Floor ${room.floor?.floorNumber}`}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor(room.status)}`}>
                {room.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <BedDouble className="w-4 h-4 text-gray-400" />
                <span>{occupiedBeds}/{totalBeds} beds</span>
              </div>
              {room.hasWifi && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Wifi className="w-4 h-4" /><span>WiFi</span>
                </div>
              )}
              {room.hasAttachedBath && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Bath className="w-4 h-4" /><span>Attached Bath</span>
                </div>
              )}
              {room.isFurnished && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <Sofa className="w-4 h-4" /><span>Furnished</span>
                </div>
              )}
            </div>

            {/* Rent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-sm">
              {room.monthlyRent && <div><p className="text-xs text-gray-500">Monthly</p><p className="font-semibold">₹{Number(room.monthlyRent).toLocaleString('en-IN')}</p></div>}
              {room.semesterRent && <div><p className="text-xs text-gray-500">Semester</p><p className="font-semibold">₹{Number(room.semesterRent).toLocaleString('en-IN')}</p></div>}
              {room.annualRent && <div><p className="text-xs text-gray-500">Annual</p><p className="font-semibold">₹{Number(room.annualRent).toLocaleString('en-IN')}</p></div>}
            </div>

            {/* Status actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
              <p className="text-xs text-gray-500 w-full">Change status:</p>
              {['available', 'maintenance', 'blocked'].map(s => (
                <Button key={s} variant={room.status === s ? 'default' : 'outline'} size="sm" className="capitalize"
                  onClick={() => updateStatus.mutate(s)} disabled={room.status === s || updateStatus.isPending}>
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Beds */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-primary" /> Beds ({totalBeds})
              </CardTitle>
              {availableLabels.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setNewBedLabel(availableLabels[0]); setAddBedOpen(true) }}>
                  <Plus className="w-3.5 h-3.5" /> Add Bed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(room.beds ?? []).map((bed: {
              id: string; bedLabel: string; isOccupied: boolean
              student?: { id: string; name: string; studentId: string }
            }) => (
              <div key={bed.id} className={`p-3 rounded-xl border-2 ${bed.isOccupied ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">Bed {bed.bedLabel}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bed.isOccupied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {bed.isOccupied ? 'Occupied' : 'Vacant'}
                    </span>
                    {!bed.isOccupied && (
                      <button onClick={() => { if (confirm(`Remove Bed ${bed.bedLabel}?`)) deleteBed.mutate(bed.id) }}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {bed.student && (
                  <Link href={`/students/${bed.student.id}`}>
                    <div className="flex items-center gap-2 mt-1 hover:opacity-80">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        {bed.student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800 truncate">{bed.student.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{bed.student.studentId}</p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Edit Room Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Room {room.roomNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room Number</Label>
                <Input value={editForm.roomNumber as string} onChange={e => setEditForm(f => ({ ...f, roomNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Room Type</Label>
                <select value={editForm.roomType as string} onChange={e => setEditForm(f => ({ ...f, roomType: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {['single', 'double', 'triple', 'quad'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly Rent (₹)</Label>
                <Input type="number" value={editForm.monthlyRent as number} onChange={e => setEditForm(f => ({ ...f, monthlyRent: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Semester Rent (₹)</Label>
                <Input type="number" value={editForm.semesterRent as number} onChange={e => setEditForm(f => ({ ...f, semesterRent: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Annual Rent (₹)</Label>
                <Input type="number" value={editForm.annualRent as number} onChange={e => setEditForm(f => ({ ...f, annualRent: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-4">
              {[
                { key: 'hasWifi', label: '📶 WiFi' },
                { key: 'hasAttachedBath', label: '🚿 Attached Bath' },
                { key: 'isFurnished', label: '🛋️ Furnished' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm[key] as boolean}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={editForm.notes as string} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateRoom.mutate(editForm)} disabled={updateRoom.isPending}>
              {updateRoom.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={addBedOpen} onOpenChange={setAddBedOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bed to Room {room.roomNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Bed Label</Label>
            <div className="flex gap-2 flex-wrap">
              {availableLabels.map(l => (
                <button key={l} onClick={() => setNewBedLabel(l)}
                  className={`w-12 h-12 rounded-xl font-bold text-lg border-2 transition-colors ${newBedLabel === l ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBedOpen(false)}>Cancel</Button>
            <Button onClick={() => addBed.mutate()} disabled={addBed.isPending}>
              {addBed.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : `Add Bed ${newBedLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
