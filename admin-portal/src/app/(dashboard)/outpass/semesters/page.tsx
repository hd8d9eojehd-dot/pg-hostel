'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Play, Loader2, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default function SemesterPeriodsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const branchId = user?.branchId ?? ''
  const today = new Date()

  const [form, setForm] = useState({
    semNumber: 1,
    year: today.getFullYear(),
    startDate: '',
    endDate: '',
    autoOutpass: true,
  })

  const { data: periods, isLoading } = useQuery({
    queryKey: ['semester-periods', branchId],
    queryFn: () => api.get('/semesters', { params: { branchId } }).then(r => r.data.data),
    enabled: !!branchId,
  })

  const create = useMutation({
    mutationFn: () => api.post('/semesters', { ...form, branchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['semester-periods'] })
      toast({ title: '✓ Semester period saved' })
      setForm(f => ({ ...f, startDate: '', endDate: '' }))
    },
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  const triggerOutpasses = useMutation({
    mutationFn: (id: string) => api.post(`/semesters/${id}/trigger-outpasses`),
    onSuccess: (res) => toast({ title: res.data.message }),
    onError: (e: unknown) => toast({ title: 'Failed', description: (e as { response?: { data?: { error?: string } } })?.response?.data?.error, variant: 'destructive' }),
  })

  return (
    <div>
      <Header title="Semester Periods" />
      <div className="p-4 md:p-6 max-w-3xl space-y-6">
        <Link href="/outpass">
          <Button variant="ghost" size="sm" className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Outpass</Button>
        </Link>

        {/* Add new */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add / Update Semester Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Semester Number</Label>
                <Input type="number" min={1} max={12} value={form.semNumber}
                  onChange={e => setForm(f => ({ ...f, semNumber: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Academic Year</Label>
                <Input type="number" min={2020} max={2040} value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Semester Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Semester End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <input type="checkbox" id="autoOutpass" checked={form.autoOutpass}
                onChange={e => setForm(f => ({ ...f, autoOutpass: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary" />
              <div>
                <Label htmlFor="autoOutpass" className="cursor-pointer text-blue-800">Auto-generate sem holiday outpasses</Label>
                <p className="text-xs text-blue-600 mt-0.5">Automatically creates approved outpasses for fee-cleared students when semester ends</p>
              </div>
            </div>
            <Button className="w-full gap-2" disabled={create.isPending || !form.startDate || !form.endDate}
              onClick={() => create.mutate()}>
              {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CalendarDays className="w-4 h-4" /> Save Semester Period</>}
            </Button>
          </CardContent>
        </Card>

        {/* Existing periods */}
        <Card>
          <CardHeader><CardTitle className="text-base">Semester Periods</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : (periods ?? []).length === 0 ? (
              <p className="p-8 text-center text-gray-400">No semester periods defined yet</p>
            ) : (
              <div className="divide-y">
                {(periods ?? []).map((p: {
                  id: string; semNumber: number; year: number
                  startDate: string; endDate: string; autoOutpass: boolean; isActive: boolean
                }) => {
                  const isEnded = new Date(p.endDate) < today
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">Sem {p.semNumber} — {p.year}</span>
                          {isEnded
                            ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Ended</span>
                            : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                          }
                          {p.autoOutpass && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Auto-outpass</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(p.startDate)} → {formatDate(p.endDate)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                        disabled={triggerOutpasses.isPending}
                        onClick={() => triggerOutpasses.mutate(p.id)}>
                        {triggerOutpasses.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Generate Outpasses
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
