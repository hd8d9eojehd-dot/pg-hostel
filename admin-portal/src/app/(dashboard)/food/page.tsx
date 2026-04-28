'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight, Pencil, Clock, Copy } from 'lucide-react'
import Link from 'next/link'

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', snacks: '🍎', dinner: '🌙' }
const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function FoodPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [view, setView] = useState<'month' | 'week'>('week')
  const [weekStart, setWeekStart] = useState(1)
  const [copyMonths, setCopyMonths] = useState(1)
  const branchId = user?.branchId ?? ''

  const { data: menuData } = useQuery({
    queryKey: ['food-menu', branchId, month, year],
    queryFn: () => api.get('/food/menu', { params: { branchId, month, year } }).then(r => r.data.data),
    enabled: !!branchId,
  })

  const { data: timings } = useQuery({
    queryKey: ['meal-timings', branchId],
    queryFn: () => api.get('/food/timings', { params: { branchId } }).then(r => r.data.data),
    enabled: !!branchId,
  })

  const copyWeek = useMutation({
    mutationFn: () => {
      const targets = Array.from({ length: copyMonths }, (_, i) => {
        const d = new Date(year, month - 1 + i + 1, 1)
        return { month: d.getMonth() + 1, year: d.getFullYear() }
      })
      return api.post('/food/copy-week', { branchId, sourceMonth: month, sourceYear: year, sourceStartDay: weekStart, targetMonths: targets })
    },
    onSuccess: (res) => { toast({ title: res.data.message }); qc.invalidateQueries({ queryKey: ['food-menu'] }) },
    onError: () => toast({ title: 'Copy failed', variant: 'destructive' }),
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const getMenu = (day: number, mealType: string) =>
    (menuData ?? []).find((m: { dayOfMonth: number; mealType: string }) => m.dayOfMonth === day && m.mealType === mealType)

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const weekDays = Array.from({ length: 7 }, (_, i) => Math.min(weekStart + i, daysInMonth))
  const filledDays = new Set((menuData ?? []).map((m: { dayOfMonth: number }) => m.dayOfMonth)).size

  return (
    <div>
      <Header title="Food Menu" />
      <div className="p-4 md:p-6 space-y-4">

        {/* Meal timings */}
        {timings && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Meal Timings</CardTitle>
                <Link href="/food/edit"><Button variant="outline" size="sm" className="gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { meal: 'Breakfast', icon: '🌅', start: timings.breakfastStart, end: timings.breakfastEnd },
                  { meal: 'Lunch', icon: '☀️', start: timings.lunchStart, end: timings.lunchEnd },
                  { meal: 'Snacks', icon: '🍎', start: timings.snacksStart ?? '16:30', end: timings.snacksEnd ?? '17:30' },
                  { meal: 'Dinner', icon: '🌙', start: timings.dinnerStart, end: timings.dinnerEnd },
                ].map(({ meal, icon, start, end }) => (
                  <div key={meal} className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-lg">{icon}</p>
                    <p className="font-medium text-xs">{meal}</p>
                    <p className="text-xs text-gray-500">{start}–{end}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="text-center min-w-[140px]">
              <h2 className="text-base font-semibold">{MONTHS[month - 1]} {year}</h2>
              <p className="text-xs text-gray-400">{filledDays}/{daysInMonth} days filled</p>
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1">
              <Button variant={view === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setView('week')}>Week</Button>
              <Button variant={view === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setView('month')}>Month</Button>
            </div>
            <Link href="/food/edit"><Button size="sm" className="gap-1"><Pencil className="w-3.5 h-3.5" /> Add/Edit</Button></Link>
          </div>
        </div>

        {/* Week navigation */}
        {view === 'week' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={weekStart <= 1} onClick={() => setWeekStart(w => Math.max(1, w - 7))}>← Prev Week</Button>
            <span className="text-sm text-gray-600">Days {weekStart}–{Math.min(weekStart + 6, daysInMonth)}</span>
            <Button variant="outline" size="sm" disabled={weekStart + 7 > daysInMonth} onClick={() => setWeekStart(w => Math.min(daysInMonth - 6, w + 7))}>Next Week →</Button>

            {/* Copy week feature */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-500">Copy this week to next</span>
              <select value={copyMonths} onChange={e => setCopyMonths(Number(e.target.value))} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                <option value={1}>1 month</option>
                <option value={2}>2 months</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
              </select>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => copyWeek.mutate()} disabled={copyWeek.isPending}>
                <Copy className="w-3.5 h-3.5" /> {copyWeek.isPending ? 'Copying...' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {/* Menu grid */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left text-gray-500 font-medium w-16">Day</th>
                    {MEAL_ORDER.map(m => (
                      <th key={m} className="p-3 text-left text-gray-500 font-medium capitalize">
                        {MEAL_ICONS[m]} {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(view === 'week' ? weekDays : Array.from({ length: daysInMonth }, (_, i) => i + 1)).map(day => {
                    const date = new Date(year, month - 1, day)
                    const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
                    return (
                      <tr key={day} className={`border-b ${isToday ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                        <td className="p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isToday ? 'bg-primary text-white' : 'text-gray-600'}`}>{day}</div>
                          <p className="text-xs text-gray-400 mt-0.5">{DAYS[date.getDay()]}</p>
                        </td>
                        {MEAL_ORDER.map(mealType => {
                          const menu = getMenu(day, mealType)
                          return (
                            <td key={mealType} className="p-3">
                              {menu ? (
                                <div>
                                  <p className="text-xs text-gray-700 leading-relaxed">{menu.items}</p>
                                  {menu.isSpecial && <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">✨ {menu.specialLabel}</span>}
                                  {menu.isHoliday && <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">🎉 Holiday</span>}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
