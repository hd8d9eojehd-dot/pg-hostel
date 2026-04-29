'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { Plus, Loader2, IndianRupee } from 'lucide-react'

export default function ExtraChargesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ studentId: '', type: '', description: '', amount: 0, chargeDate: new Date().toISOString().split('T')[0] })

  const { data: charges, isLoading } = useQuery({
    queryKey: ['extra-charges'],
    queryFn: () => api.get('/finance/extra-charges').then(r => r.data.data),
  })

  const { data: students } = useQuery({
    queryKey: ['students-search-ec', search],
    queryFn: () => api.get('/students', { params: { search, limit: 8 } }).then(r => r.data.students),
    enabled: search.length >= 2,
  })

  const create = useMutation({
    mutationFn: () => api.post('/finance/extra-charges', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extra-charges'] })
      toast({ title: '✓ Extra charge added' })
      setOpen(false)
      setForm({ studentId: '', type: '', description: '', amount: 0, chargeDate: new Date().toISOString().split('T')[0] })
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  return (
    <div>
      <Header title="Extra Charges" />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Add Charge
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (charges ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No extra charges</td></tr>
                  ) : (
                    (charges ?? []).map((c: {
                      id: string; type: string; description: string; amount: number; chargeDate: string
                      student: { name: string; studentId: string }
                    }) => (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.student.name}</p>
                          <p className="text-xs text-gray-400">{c.student.studentId}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-700">{c.type}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{c.description}</td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">{formatCurrency(Number(c.amount))}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{formatDate(c.chargeDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Extra Charge</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Search Student</Label>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type name or ID..." />
              {(students ?? []).length > 0 && (
                <div className="border rounded-xl overflow-hidden mt-1">
                  {(students ?? []).map((s: { id: string; name: string; studentId: string }) => (
                    <button key={s.id} onClick={() => { setForm(f => ({ ...f, studentId: s.id })); setSearch(s.name) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0 ${form.studentId === s.id ? 'bg-primary/5' : ''}`}>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-gray-400 text-xs">{s.studentId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="damage, fine, etc." />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.chargeDate} onChange={e => setForm(f => ({ ...f, chargeDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.studentId || !form.type || !form.amount}>
              {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
