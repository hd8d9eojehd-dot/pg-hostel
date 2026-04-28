'use client'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api'
import { ArrowLeft, Bell } from 'lucide-react'
import Link from 'next/link'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600',
}
const CATEGORY_ICON: Record<string, string> = {
  general: '📢', rent: '💰', food: '🍽️', maintenance: '🔧',
  rules: '📋', emergency: '🚨', event: '🎉',
}

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: notice, isLoading } = useQuery({
    queryKey: ['notice-detail', id],
    queryFn: () => api.get(`/notices/${id}`).then(r => r.data.data),
  })

  if (isLoading) return (
    <div><TopBar title="Notice" />
      <div className="p-4"><div className="h-48 bg-gray-100 rounded-2xl animate-pulse" /></div>
    </div>
  )
  if (!notice) return null

  return (
    <div>
      <TopBar title="Notice" />
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">
        <Link href="/notices">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Notices
          </Button>
        </Link>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{CATEGORY_ICON[notice.category] ?? '📢'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[notice.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                {notice.priority}
              </span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">{notice.category}</span>
            </div>

            <h1 className="text-lg font-bold text-gray-900">{notice.title}</h1>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{notice.description}</p>

            <div className="pt-3 border-t text-xs text-gray-400 space-y-1">
              {notice.publishedAt && <p>Posted: {formatDate(notice.publishedAt)}</p>}
              {notice.expiryDate && <p>Expires: {formatDate(notice.expiryDate)}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
