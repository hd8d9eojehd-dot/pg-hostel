'use client'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, statusColor } from '@/lib/utils'
import api from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function OutpassDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: outpass, isLoading } = useQuery({
    queryKey: ['outpass-detail', id],
    queryFn: () => api.get(`/outpass/${id}`).then(r => r.data.data),
  })

  if (isLoading) return (
    <div><TopBar title="Outpass" />
      <div className="p-4"><div className="h-48 bg-gray-100 rounded-2xl animate-pulse" /></div>
    </div>
  )
  if (!outpass) return null

  return (
    <div>
      <TopBar title="Outpass Details" />
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">
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
                <p className="text-xs text-gray-500 mb-0.5">From</p>
                <p className="font-medium">{formatDate(outpass.fromDate)}</p>
                {outpass.fromTime && <p className="text-xs text-gray-400">{outpass.fromTime}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">To</p>
                <p className="font-medium">{formatDate(outpass.toDate)}</p>
                {outpass.toTime && <p className="text-xs text-gray-400">{outpass.toTime}</p>}
              </div>
              {outpass.destination && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Destination</p>
                  <p className="font-medium">{outpass.destination}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Reason</p>
                <p className="text-gray-800">{outpass.reason}</p>
              </div>
              {outpass.contactAtDestination && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Contact at Destination</p>
                  <p className="font-medium">{outpass.contactAtDestination}</p>
                </div>
              )}
            </div>

            {outpass.approvalNote && (
              <div className={`p-3 rounded-xl text-sm ${outpass.status === 'approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="text-xs font-medium mb-0.5">Admin Note</p>
                {outpass.approvalNote}
              </div>
            )}

            {outpass.returnConfirmedAt && (
              <div className="p-3 bg-gray-50 rounded-xl text-sm">
                <p className="text-xs text-gray-500">Return confirmed on {formatDate(outpass.returnConfirmedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
