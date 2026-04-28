import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
}

export function Pagination({ page, totalPages, total, limit, hasNext, hasPrev, onNext, onPrev }: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-sm text-gray-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev} className="gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </Button>
        <span className="text-sm text-gray-500 px-2">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext} className="gap-1">
          Next <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
