'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Reports page removed — redirecting to dashboard
export default function ReportsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [router])
  return null
}
