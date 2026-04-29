'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snacks: '🍎',
  dinner: '🌙',
}

const MEAL_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner']

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface MealEntry {
  id: string
  mealType: string
  items: string
  isSpecial: boolean
  specialLabel?: string
  isHoliday?: boolean
}

interface DayMenu {
  dayOfMonth: number
  isHoliday?: boolean
  meals: MealEntry[]
}

export default function FoodPage() {
  const [view, setView] = useState<'today' | 'month'>('today')
  const today = new Date()

  // Home data for today's meals
  const { data: homeData } = useQuery({
    queryKey: ['portal-home'],
    queryFn: () => api.get('/portal/home').then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  })

  // Month data
  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['portal-food-month', today.getMonth() + 1, today.getFullYear()],
    queryFn: () => api.get('/portal/food', {
      params: { month: today.getMonth() + 1, year: today.getFullYear(), view: 'month' },
    }).then(r => r.data.data),
    enabled: view === 'month',
  })

  const foodData = homeData?.food
  const todayMeals: MealEntry[] = foodData?.menu ?? []
  const timings = foodData?.timings

  // Build day-indexed map for month view
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const monthMenuMap: Record<number, DayMenu> = {}

  if (monthData) {
    const entries: Array<MealEntry & { dayOfMonth: number; isHoliday?: boolean }> = monthData.menu ?? monthData ?? []
    entries.forEach((entry) => {
      const day = entry.dayOfMonth
      if (!monthMenuMap[day]) {
        monthMenuMap[day] = { dayOfMonth: day, isHoliday: entry.isHoliday, meals: [] }
      }
      if (entry.isHoliday) monthMenuMap[day].isHoliday = true
      if (entry.mealType) monthMenuMap[day].meals.push(entry)
    })
  }

  return (
    <div>
      <TopBar title="Food Menu" />
      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('today')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'today' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setView('month')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            {today.toLocaleString('default', { month: 'long' })}
          </button>
        </div>

        {/* Today view */}
        {view === 'today' && (
          <>
            {todayMeals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  <p className="text-2xl mb-2">🍽️</p>
                  <p className="text-sm">No menu for today</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {MEAL_ORDER.map(mealType => {
                  const meal = todayMeals.find(m => m.mealType === mealType)
                  if (!meal) return null
                  const timing = timings ? {
                    breakfast: `${timings.breakfastStart}–${timings.breakfastEnd}`,
                    lunch: `${timings.lunchStart}–${timings.lunchEnd}`,
                    snacks: `${timings.snacksStart}–${timings.snacksEnd}`,
                    dinner: `${timings.dinnerStart}–${timings.dinnerEnd}`,
                  }[mealType] : null

                  return (
                    <Card key={mealType}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">{MEAL_ICONS[mealType] ?? '🍽️'}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold capitalize text-gray-900">{mealType}</p>
                              {timing && <p className="text-xs text-gray-400">{timing}</p>}
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{meal.items}</p>
                            {meal.isSpecial && (
                              <span className="inline-block mt-1.5 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                ✨ {meal.specialLabel || 'Special'}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Month view */}
        {view === 'month' && (
          <>
            {monthLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const date = new Date(today.getFullYear(), today.getMonth(), day)
                  const dayOfWeek = DAYS_SHORT[date.getDay()]
                  const isToday = day === today.getDate()
                  const dayData = monthMenuMap[day]
                  const isHoliday = dayData?.isHoliday

                  return (
                    <Card key={day} className={`${isToday ? 'border-primary ring-1 ring-primary/20' : ''} ${isHoliday ? 'bg-green-50 border-green-200' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-10 text-center rounded-lg py-1 ${isToday ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                            <p className="text-xs font-medium">{dayOfWeek}</p>
                            <p className="text-sm font-bold">{day}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            {isHoliday ? (
                              <p className="text-sm font-medium text-green-700">🎉 Holiday</p>
                            ) : dayData?.meals && dayData.meals.length > 0 ? (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {MEAL_ORDER.map(mealType => {
                                  const meal = dayData.meals.find(m => m.mealType === mealType)
                                  if (!meal) return null
                                  return (
                                    <div key={mealType} className="min-w-0">
                                      <span className="text-xs text-gray-400">{MEAL_ICONS[mealType]} </span>
                                      <span className="text-xs text-gray-700 truncate">{meal.items}</span>
                                      {meal.isSpecial && <span className="ml-1 text-xs">✨</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No menu set</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
