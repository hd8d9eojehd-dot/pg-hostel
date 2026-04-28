'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-sm px-4">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <Button onClick={reset} size="sm">Try again</Button>
      </div>
    </div>
  )
}
