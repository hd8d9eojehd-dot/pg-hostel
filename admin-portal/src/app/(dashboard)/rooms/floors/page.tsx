'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Plus, Loader2, Layers, Pencil, Trash2, Home } from 'lucide-react'
import Link from 'next/link'

type Floor = { id: string; floorNumber: number; floorName?: string; groupType?: string; rooms: Array<{ id: string; status: string }> }

export default function FloorsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editFloor, setEditFloor] = useState<Floor | null>(null)
  const [form, setForm] = useState({ floorNumber: 1, floorName: '', groupType: 'floor' })

  const { data: floors, isLoading } = useQuery({
    queryKey: ['floor-map', user?.branchId],
    queryFn: () => api.get('/rooms/floor-map', { params: { branchId: user?.branchId } }).then(r => r.data.data),
    enabled: !!user?.branchId,
  })

  const create = useMutation({
    mutationFn: () => api.post('/rooms/floors', { branchId: user?.branchId, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floor-map'] })
      toast({ title: `✓ ${form.groupType === 'villa' ? 'Villa' : 'Floor'} ${form.floorNumber} created` })
      setOpen(false)
      setForm({ floorNumber: (floors?.length ?? 0) + 2, floorName: '', groupType: 'floor' })
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: () => api.patch(`/rooms/floors/${editFloor?.id}`, { floorName: form.floorName, floorNumber: form.floorNumber }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floor-map'] })
      toast({ title: '✓ Floor updated' })
      setEditFloor(null)
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const deleteFloor = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/floors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floor-map'] })
      toast({ title: 'Floor deleted' })
    },
    onError: (e: unknown) => toast({ title: 'Cannot delete', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const openEdit = (f: Floor) => {
    setEditFloor(f)
    setForm({ floorNumber: f.floorNumber, floorName: f.floorName ?? '', groupType: f.groupType ?? 'floor' })
  }

  return (
    <div>
      <Header title="Floor Management" />
      <div className="p-4 md:p-6 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/rooms">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Rooms
            </Button>
          </Link>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm({ floorNumber: (floors?.length ?? 0) + 1, floorName: '', groupType: 'floor' }); setOpen(true) }}>
            <Plus className="w-3.5 h-3.5" /> Add Floor / Villa
          </Button>
        </div>

        <div className="grid gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : (floors ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-gray-400">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No floors yet</p>
                <p className="text-sm mt-1">Add your first floor to start creating rooms</p>
              </CardContent>
            </Card>
          ) : (
            (floors ?? []).map((f: Floor) => {
              const available = f.rooms.filter(r => r.status === 'available').length
              const occupied = f.rooms.filter(r => r.status === 'occupied').length
              const partial = f.rooms.filter(r => r.status === 'partial').length
              return (
                <Card key={f.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.groupType === 'villa' ? 'bg-orange-100' : 'bg-primary/10'}`}>
                        {f.groupType === 'villa'
                          ? <Home className="w-5 h-5 text-orange-600" />
                          : <span className="text-lg font-bold text-primary">{f.floorNumber}</span>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{f.floorName ?? (f.groupType === 'villa' ? `Villa ${f.floorNumber}` : `Floor ${f.floorNumber}`)}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${f.groupType === 'villa' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {f.groupType === 'villa' ? 'Villa' : 'Floor'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{f.rooms.length} rooms total</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-3 text-xs">
                        <div className="text-center">
                          <p className="font-bold text-green-600">{available}</p>
                          <p className="text-gray-400">Free</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-yellow-600">{partial}</p>
                          <p className="text-gray-400">Partial</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-red-600">{occupied}</p>
                          <p className="text-gray-400">Full</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { if (confirm(`Delete ${f.floorName ?? `Floor ${f.floorNumber}`}? All rooms must be removed first.`)) deleteFloor.mutate(f.id) }}
                          disabled={f.rooms.length > 0}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Add Floor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Floor / Villa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'floor', label: '🏢 Floor', desc: 'Level in a building' }, { value: 'villa', label: '🏠 Villa', desc: 'Standalone unit' }].map(t => (
                  <label key={t.value} className="cursor-pointer">
                    <input type="radio" name="groupType" value={t.value} checked={form.groupType === t.value} onChange={() => setForm(f => ({ ...f, groupType: t.value }))} className="sr-only" />
                    <div className={`p-3 rounded-xl border-2 text-center transition-colors ${form.groupType === t.value ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Number</Label>
              <Input type="number" min={0} value={form.floorNumber} onChange={e => setForm(f => ({ ...f, floorNumber: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Name (optional)</Label>
              <Input value={form.floorName} onChange={e => setForm(f => ({ ...f, floorName: e.target.value }))} placeholder={form.groupType === 'villa' ? 'e.g. Garden Villa, Block A' : 'e.g. Ground Floor, First Floor'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : `Create ${form.groupType === 'villa' ? 'Villa' : 'Floor'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Floor Dialog */}
      <Dialog open={!!editFloor} onOpenChange={v => !v && setEditFloor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Floor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Floor Number</Label>
              <Input type="number" min={0} value={form.floorNumber} onChange={e => setForm(f => ({ ...f, floorNumber: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Floor Name</Label>
              <Input value={form.floorName} onChange={e => setForm(f => ({ ...f, floorName: e.target.value }))} placeholder="e.g. Ground Floor, First Floor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFloor(null)}>Cancel</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
