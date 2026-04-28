'use client'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'
import { BedDouble, Plus, Home, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function RoomsPage() {
  const { data: floors, isLoading } = useQuery({
    queryKey: ['floor-map'],
    queryFn: () => api.get('/rooms/floor-map').then(r => r.data.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['room-stats'],
    queryFn: () => api.get('/rooms/stats').then(r => r.data.data),
  })

  return (
    <div>
      <Header title="Rooms" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-gray-700' },
              { label: 'Available', value: stats.available, color: 'text-green-600' },
              { label: 'Occupied', value: stats.occupied, color: 'text-red-600' },
              { label: 'Partial', value: stats.partial, color: 'text-yellow-600' },
              { label: 'Maintenance', value: stats.maintenance, color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Floor Map</h2>
          <div className="flex gap-2">
            <Link href="/rooms/floors">
              <Button size="sm" variant="outline">Manage Floors</Button>
            </Link>
            <Link href="/rooms/new">
              <Button size="sm" className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Room
              </Button>
            </Link>
          </div>
        </div>

        {/* Floor map */}
        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-32 bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {(floors ?? []).map((floor: {
              id: string
              floorNumber: number
              floorName?: string
              groupType?: string
              rooms: Array<{
                id: string
                roomNumber: string
                roomType: string
                bedCount: number
                status: string
                beds: Array<{
                  id: string
                  bedLabel: string
                  isOccupied: boolean
                  student?: { name: string }
                }>
              }>
            }) => {
              const isVilla = floor.groupType === 'villa'
              const groupLabel = floor.floorName
                ? floor.floorName
                : isVilla
                  ? `Villa ${floor.floorNumber}`
                  : `Floor ${floor.floorNumber}`

              return (
                <Card key={floor.id} className={isVilla ? 'border-amber-200 bg-amber-50/30' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {isVilla
                        ? <Home className="w-4 h-4 text-amber-600" />
                        : <Building2 className="w-4 h-4 text-gray-400" />
                      }
                      <span className={isVilla ? 'text-amber-800' : ''}>
                        {groupLabel}
                        {isVilla && <span className="ml-1.5 text-xs font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Villa</span>}
                      </span>
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        ({floor.rooms.length} rooms)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {floor.rooms.map(room => (
                        <Link key={room.id} href={`/rooms/${room.id}`}>
                          <div className={`rounded-xl border-2 p-3 cursor-pointer hover:shadow-md transition-all ${
                            room.status === 'available' ? 'border-green-200 bg-green-50' :
                            room.status === 'occupied' ? 'border-red-200 bg-red-50' :
                            room.status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
                            'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm">{room.roomNumber}</span>
                              <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 capitalize mb-2">{room.roomType}</p>
                            <div className="flex gap-1 flex-wrap">
                              {room.beds.map(bed => (
                                <div
                                  key={bed.id}
                                  title={bed.student?.name ?? 'Vacant'}
                                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                                    bed.isOccupied ? 'bg-red-400 text-white' : 'bg-green-400 text-white'
                                  }`}
                                >
                                  {bed.bedLabel}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
