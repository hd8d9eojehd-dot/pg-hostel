'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import api from '@/lib/api'
import { Activity, RefreshCw } from 'lucide-react'

const ACTION_COLOR: Record<string, string> = {
  CREATED: 'bg-green-100 text-green-700',
  UPDATED: 'bg-blue-100 text-blue-700',
  DELETED: 'bg-red-100 text-red-700',
}

export default function ActivityPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', page],
    queryFn: () => api.get('/dashboard/activity', { params: { page, limit: 30 } }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const logs = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div>
      <Header title="Activity Log" />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{pagination?.total ?? 0} total actions</p>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex gap-3 px-5 py-3 animate-pulse">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 bg-gray-100 rounded w-64" />
                      <div className="h-3 bg-gray-100 rounded w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((a: {
                  id: string; action: string; entityType: string; entityId?: string
                  createdAt: string; meta?: Record<string, unknown>
                  admin: { name: string; role: string }
                }) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${ACTION_COLOR[a.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.action.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{a.admin.name}</span>
                        <span className="text-gray-500"> {a.action.toLowerCase()} </span>
                        <span className="capitalize text-gray-700">{a.entityType.toLowerCase()}</span>
                        {a.meta && typeof a.meta === 'object' && (a.meta as { studentId?: string }).studentId && (
                          <span className="text-gray-400 font-mono text-xs ml-1">({(a.meta as { studentId: string }).studentId})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.createdAt)}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize flex-shrink-0">{a.admin.role.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t">
                <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
