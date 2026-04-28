'use client'
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Save, Loader2, UtensilsCrossed, Clock, CalendarDays } from 'lucide-react'
import Link from 'next/link'

const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'] as const
const DAYS = ['Day 1 (Mon)', 'Day 2 (Tue)', 'Day 3 (Wed)', 'Day 4 (Thu)', 'Day 5 (Fri)', 'Day 6 (Sat)', 'Day 7 (Sun)']

type WeeklyTemplate = Array<{
  breakfast: string
  lunch: string
  snacks: string
  dinner: string
}>

function emptyTemplate(): WeeklyTemplate {
  return Array.from({ length: 7 }, () => ({ breakfast: '', lunch: '', snacks: '', dinner: '' }))
}

export default function EditFoodMenuPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const today = new Date()
  const branchId = user?.branchId ?? ''

  const [menuForm, setMenuForm] = useState({
    branchId,
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    dayOfMonth: today.getDate(),
    mealType: 'lunch' as typeof MEAL_TYPES[number],
    items: '',
    isSpecial: false,
    specialLabel: '',
    isHoliday: false,
  })

  // Weekly template state
  const [template, setTemplate] = useState<WeeklyTemplate>(emptyTemplate())
  const [applyMonths, setApplyMonths] = useState(1)

  // Sync branchId when user loads
  useEffect(() => {
    if (user?.branchId) {
      setMenuForm(f => ({ ...f, branchId: user.branchId! }))
      setTimingsForm(f => ({ ...f, branchId: user.branchId! }))
    }
  }, [user?.branchId])

  const { data: existingTimings } = useQuery({
    queryKey: ['meal-timings', branchId],
    queryFn: () => api.get('/food/timings', { params: { branchId } }).then(r => r.data.data),
    enabled: !!branchId,
  })

  const [timingsForm, setTimingsForm] = useState({
    branchId,
    breakfastStart: '07:30', breakfastEnd: '09:30',
    lunchStart: '12:30', lunchEnd: '14:30',
    snacksStart: '16:30', snacksEnd: '17:30',
    dinnerStart: '19:30', dinnerEnd: '21:30',
  })

  useEffect(() => {
    if (existingTimings) {
      setTimingsForm({
        branchId: existingTimings.branchId ?? branchId,
        breakfastStart: existingTimings.breakfastStart,
        breakfastEnd: existingTimings.breakfastEnd,
        lunchStart: existingTimings.lunchStart,
        lunchEnd: existingTimings.lunchEnd,
        snacksStart: existingTimings.snacksStart ?? '16:30',
        snacksEnd: existingTimings.snacksEnd ?? '17:30',
        dinnerStart: existingTimings.dinnerStart,
        dinnerEnd: existingTimings.dinnerEnd,
      })
    }
  }, [existingTimings, branchId])

  const saveMenu = useMutation({
    mutationFn: () => api.post('/food/menu', menuForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-menu'] })
      toast({ title: '✓ Menu saved' })
      setMenuForm(f => ({ ...f, items: '', isSpecial: false, specialLabel: '', isHoliday: false }))
    },
    onError: () => toast({ title: 'Failed to save menu', variant: 'destructive' }),
  })

  const saveTimings = useMutation({
    mutationFn: () => api.post('/food/timings', timingsForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-timings'] })
      toast({ title: '✓ Timings saved' })
    },
    onError: () => toast({ title: 'Failed to save timings', variant: 'destructive' }),
  })

  const applyTemplate = useMutation({
    mutationFn: () => {
      const targetMonths: Array<{ month: number; year: number }> = []
      for (let i = 0; i < applyMonths; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
        targetMonths.push({ month: d.getMonth() + 1, year: d.getFullYear() })
      }
      return api.post('/food/apply-template', { branchId, template, targetMonths })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['food-menu'] })
      toast({ title: `✓ Template applied to ${applyMonths} month(s)`, description: `${res.data.data?.created ?? 0} entries created` })
    },
    onError: () => toast({ title: 'Failed to apply template', variant: 'destructive' }),
  })

  const TimingField = ({ label, startKey, endKey }: {
    label: string
    startKey: keyof typeof timingsForm
    endKey: keyof typeof timingsForm
  }) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <Label className="text-sm">{label}</Label>
      <div className="space-y-1">
        <p className="text-xs text-gray-400">Start</p>
        <Input
          type="time"
          value={timingsForm[startKey] as string}
          onChange={e => setTimingsForm(f => ({ ...f, [startKey]: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400">End</p>
        <Input
          type="time"
          value={timingsForm[endKey] as string}
          onChange={e => setTimingsForm(f => ({ ...f, [endKey]: e.target.value }))}
        />
      </div>
    </div>
  )

  return (
    <div>
      <Header title="Edit Food Menu" />
      <div className="p-4 md:p-6 max-w-3xl">
        <Link href="/food">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" /> Food Menu
          </Button>
        </Link>

        <Tabs defaultValue="menu">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="menu" className="flex-1 gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Menu Items
            </TabsTrigger>
            <TabsTrigger value="template" className="flex-1 gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Weekly Template
            </TabsTrigger>
            <TabsTrigger value="timings" className="flex-1 gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Meal Timings
            </TabsTrigger>
          </TabsList>

          {/* Menu Items Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader><CardTitle className="text-base">Add / Update Menu Item</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Day</Label>
                    <Input type="number" min={1} max={31} value={menuForm.dayOfMonth}
                      onChange={e => setMenuForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Month</Label>
                    <Input type="number" min={1} max={12} value={menuForm.month}
                      onChange={e => setMenuForm(f => ({ ...f, month: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year</Label>
                    <Input type="number" value={menuForm.year}
                      onChange={e => setMenuForm(f => ({ ...f, year: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Meal Type</Label>
                  <div className="flex gap-2">
                    {MEAL_TYPES.map(m => (
                      <button key={m} type="button"
                        onClick={() => setMenuForm(f => ({ ...f, mealType: m }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${
                          menuForm.mealType === m ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {m === 'breakfast' ? '🌅' : m === 'lunch' ? '☀️' : m === 'snacks' ? '🍎' : '🌙'} {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Menu Items</Label>
                  <textarea
                    value={menuForm.items}
                    onChange={e => setMenuForm(f => ({ ...f, items: e.target.value }))}
                    rows={3}
                    placeholder="e.g. Idli, Sambar, Coconut Chutney, Tea"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={menuForm.isSpecial}
                      onChange={e => setMenuForm(f => ({ ...f, isSpecial: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary" />
                    <span className="text-sm">Special meal ✨</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={menuForm.isHoliday}
                      onChange={e => setMenuForm(f => ({ ...f, isHoliday: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary" />
                    <span className="text-sm">Holiday 🎉</span>
                  </label>
                </div>

                {menuForm.isSpecial && (
                  <div className="space-y-1.5">
                    <Label>Special Label</Label>
                    <Input value={menuForm.specialLabel}
                      onChange={e => setMenuForm(f => ({ ...f, specialLabel: e.target.value }))}
                      placeholder="e.g. Diwali Special, Birthday Treat" />
                  </div>
                )}

                <Button className="w-full gap-2" onClick={() => saveMenu.mutate()}
                  disabled={saveMenu.isPending || !menuForm.items || !menuForm.branchId}>
                  {saveMenu.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><Save className="w-4 h-4" /> Save Menu Item</>}
                </Button>

                {!menuForm.branchId && (
                  <p className="text-xs text-red-500 text-center">No branch assigned to your account</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Template Tab */}
          <TabsContent value="template">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">7-Day Weekly Template</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Set meals for each day of the week. Day 1 = Monday, Day 7 = Sunday.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {DAYS.map((dayLabel, dayIdx) => (
                    <div key={dayIdx} className="border rounded-xl p-4 space-y-3">
                      <p className="font-semibold text-sm text-gray-700">{dayLabel}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {MEAL_TYPES.map(meal => (
                          <div key={meal} className="space-y-1">
                            <Label className="text-xs capitalize">
                              {meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : meal === 'snacks' ? '🍎' : '🌙'} {meal}
                            </Label>
                            <Input
                              value={template[dayIdx][meal]}
                              onChange={e => {
                                const updated = template.map((d, i) =>
                                  i === dayIdx ? { ...d, [meal]: e.target.value } : d
                                )
                                setTemplate(updated)
                              }}
                              placeholder={`e.g. ${meal === 'breakfast' ? 'Idli, Sambar' : meal === 'lunch' ? 'Rice, Dal, Sabzi' : meal === 'snacks' ? 'Tea, Biscuits' : 'Chapati, Sabzi'}`}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Apply Template to Month(s)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Number of months to apply (starting from current month)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={applyMonths}
                        onChange={e => setApplyMonths(Math.min(12, Math.max(1, Number(e.target.value))))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">month(s)</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Will apply to: {Array.from({ length: applyMonths }, (_, i) => {
                        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
                        return d.toLocaleString('default', { month: 'short', year: 'numeric' })
                      }).join(', ')}
                    </p>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      if (confirm(`Apply this template to ${applyMonths} month(s)?`)) applyTemplate.mutate()
                    }}
                    disabled={applyTemplate.isPending || !branchId}
                  >
                    {applyTemplate.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
                      : <><CalendarDays className="w-4 h-4" /> Apply to {applyMonths} Month(s)</>}
                  </Button>
                  {!branchId && (
                    <p className="text-xs text-red-500 text-center">No branch assigned to your account</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Meal Timings Tab */}
          <TabsContent value="timings">
            <Card>
              <CardHeader><CardTitle className="text-base">Meal Timings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <TimingField label="🌅 Breakfast" startKey="breakfastStart" endKey="breakfastEnd" />
                <TimingField label="☀️ Lunch" startKey="lunchStart" endKey="lunchEnd" />
                <TimingField label="🍎 Snacks" startKey="snacksStart" endKey="snacksEnd" />
                <TimingField label="🌙 Dinner" startKey="dinnerStart" endKey="dinnerEnd" />

                <Button className="w-full gap-2" onClick={() => saveTimings.mutate()}
                  disabled={saveTimings.isPending || !timingsForm.branchId}>
                  {saveTimings.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><Save className="w-4 h-4" /> Save Timings</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
