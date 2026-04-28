'use client'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api'
import { Bell } from 'lucide-react'
import Link from 'next/link'

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-gray-300',
}
const CATEGORY_ICON: Record<string, string> = {
  general: '📢', rent: '💰', food: '🍽️', maintenance: '🔧', rules: '📋', emergency: '🚨', event: '🎉',
}

export default function NoticesPage() {
  const { data: notices, isLoading } = useQuery({
    queryKey: ['notices-public'],
    queryFn: () => api.get('/portal/notices').then(r => r.data.data),
  })

  return (
    <div>
      <TopBar title="Notices" />
      <div className="p-4 space-y-3 max-w-lg mx-auto pb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : (notices ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No notices</p>
            </CardContent>
          </Card>
        ) : (
          (notices ?? []).map((n: {
            id: string; title: string; description: string
            category: string; priority: string; publishedAt?: string
          }) => (
            <Link key={n.id} href={`/notices/${n.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[n.priority] ?? 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{CATEGORY_ICON[n.category] ?? '📢'}</span>
                        <span className="text-xs text-gray-500 capitalize">{n.category}</span>
                        {n.priority === 'urgent' && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Urgent</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{n.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                      {n.publishedAt && (
                        <p className="text-xs text-gray-400 mt-2">{formatDate(n.publishedAt)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
