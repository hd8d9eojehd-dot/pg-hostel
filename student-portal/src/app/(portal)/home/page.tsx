'use client'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import api from '@/lib/api'
import Link from 'next/link'
import { BedDouble, IndianRupee, MessageSquare, Bell, UtensilsCrossed, AlertTriangle, ChevronRight, DoorOpen } from 'lucide-react'
import { IdCard } from '@/components/id-card'

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', snacks: '🍎', dinner: '🌙' }
const PRIORITY_DOT: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-gray-300' }

export default function HomePage() {
  // Single API call for all home data — much faster
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['portal-home'],
    queryFn: () => api.get('/portal/home').then(r => r.data.data),
    staleTime: 2 * 60 * 1000, // 2 min cache
    gcTime: 5 * 60 * 1000,
  })

  const profile = homeData?.profile
  const pendingInvoices = homeData?.pendingInvoices ?? []
  const notices = homeData?.notices ?? []
  const foodData = homeData?.food
  const totalDue = pendingInvoices.reduce((s: number, i: { balance: number }) => s + Number(i.balance), 0)
  const stayDaysLeft = profile ? daysUntil(profile.stayEndDate) : null

  return (
    <div>
      <TopBar />
      <div className="p-4 space-y-4 max-w-lg mx-auto">{/* bottom padding handled by portal layout */}

        {/* Room card */}
        {isLoading ? (
          <div className="h-36 bg-primary/10 rounded-2xl animate-pulse" />
        ) : profile ? (
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0 shadow-lg shadow-primary/20">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wide">Your Room</p>
                  <p className="text-3xl font-bold mt-1">
                    {profile.room?.roomNumber ?? '—'}
                    <span className="text-lg font-normal ml-2">Bed {profile.bed?.bedLabel ?? '—'}</span>
                  </p>
                  <p className="text-primary-foreground/80 text-sm mt-1">
                    {profile.room?.floor?.floorName ?? `Floor ${profile.room?.floor?.floorNumber ?? ''}`}
                    {profile.room?.roomType ? ` · ${profile.room.roomType}` : ''}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <BedDouble className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/70 text-xs">Stay ends</p>
                  <p className="text-sm font-medium">{formatDate(profile.stayEndDate)}</p>
                </div>
                {stayDaysLeft !== null && (
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${stayDaysLeft <= 7 ? 'bg-red-400/30 text-red-100' : stayDaysLeft <= 30 ? 'bg-yellow-400/30 text-yellow-100' : 'bg-white/20 text-white'}`}>
                    {stayDaysLeft > 0 ? `${stayDaysLeft} days left` : 'Expired'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* ID Card */}
        <IdCard />

        {/* Dues alert */}
        {totalDue > 0 && (
          <Link href="/finance">
            <Card className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">{pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-600">Total due: {formatCurrency(totalDue)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/finance">
            <Card className={`cursor-pointer hover:shadow-md transition-shadow h-full ${totalDue > 0 ? 'border-orange-200' : ''}`}>
              <CardContent className="p-3 md:p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${totalDue > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <IndianRupee className={`w-4 h-4 ${totalDue > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                </div>
                <p className={`text-sm font-bold ${totalDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {totalDue > 0 ? formatCurrency(totalDue) : 'All clear!'}
                </p>
                <p className="text-xs text-gray-500">{totalDue > 0 ? 'Amount due' : 'No dues'}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/complaints">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-3 md:p-4">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm font-bold text-gray-900">Complaints</p>
                <p className="text-xs text-gray-500">Raise an issue</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/outpass">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-3 md:p-4">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center mb-2">
                  <DoorOpen className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-sm font-bold text-gray-900">Outpass</p>
                <p className="text-xs text-gray-500">Request leave</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/food">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-3 md:p-4">
                <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center mb-2">
                  <UtensilsCrossed className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-sm font-bold text-gray-900">Food Menu</p>
                <p className="text-xs text-gray-500">Today's meals</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Today's food */}
        {(foodData?.menu ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UtensilsCrossed className="w-4 h-4 text-primary" /> Today's Menu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(foodData.menu ?? []).map((m: { id: string; mealType: string; items: string; isSpecial: boolean; specialLabel?: string }) => (
                <div key={m.id} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{MEAL_ICONS[m.mealType] ?? '🍽️'}</span>
                  <div>
                    <p className="text-xs font-medium text-gray-500 capitalize">{m.mealType}</p>
                    <p className="text-sm text-gray-800">{m.items}</p>
                    {m.isSpecial && <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">✨ {m.specialLabel}</span>}
                  </div>
                </div>
              ))}
              {foodData?.timings && (
                <div className="pt-2 border-t grid grid-cols-2 sm:grid-cols-4 gap-1 text-center">
                  {[
                    { label: 'Breakfast', start: foodData.timings.breakfastStart, end: foodData.timings.breakfastEnd },
                    { label: 'Lunch', start: foodData.timings.lunchStart, end: foodData.timings.lunchEnd },
                    { label: 'Snacks', start: foodData.timings.snacksStart, end: foodData.timings.snacksEnd },
                    { label: 'Dinner', start: foodData.timings.dinnerStart, end: foodData.timings.dinnerEnd },
                  ].filter(t => t.start).map(({ label, start, end }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-1.5">
                      <p className="text-xs font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-500">{start}–{end}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notices */}
        {notices.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bell className="w-4 h-4 text-primary" /> Notices
                </CardTitle>
                <Link href="/notices" className="text-xs text-primary">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {notices.slice(0, 3).map((n: { id: string; title: string; description: string; priority: string; category: string }) => (
                <Link key={n.id} href={`/notices/${n.id}`}>
                  <div className="flex gap-3 hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[n.priority] ?? 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{n.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>{/* end max-w-lg */}
    </div>
  )
}
