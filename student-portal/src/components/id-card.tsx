'use client'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import QRCode from 'qrcode'

interface IdCardData {
  studentId: string
  name: string
  branch: string
  roomNumber: string
  bedLabel: string
  feeStatus: 'paid' | 'due' | 'overdue'
  qrPayload: string
  validUntil: string
  hostelName: string
  avatarUrl?: string
  totalDue?: number
}

const FEE_STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  due: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
}
const FEE_STATUS_DOT: Record<string, string> = {
  paid: 'bg-green-500', due: 'bg-yellow-500', overdue: 'bg-red-500',
}

function RealQrCode({ payload }: { payload: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'
  const verifyUrl = `${API_URL}/students/verify-qr?token=${encodeURIComponent(payload)}`

  useEffect(() => {
    if (!canvasRef.current) return
    // Set internal canvas size to 40px (1/4 of original 160px)
    canvasRef.current.width = 40
    canvasRef.current.height = 40
    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: 40,
      margin: 0,
      color: { dark: '#1e293b', light: '#ffffff' },
      errorCorrectionLevel: 'L',
    }).catch(() => {})
  }, [verifyUrl])

  return (
    <div className="flex flex-col items-center gap-0.5">
      <a href={verifyUrl} target="_blank" rel="noopener noreferrer" title="Scan to verify">
        <canvas ref={canvasRef} className="rounded border border-gray-200" style={{ width: 40, height: 40 }} />
      </a>
      <p className="text-[7px] text-gray-400 text-center leading-tight">Scan</p>
    </div>
  )
}

export function IdCard() {
  const { data, isLoading, isError } = useQuery<IdCardData>({
    queryKey: ['portal-id-card'],
    queryFn: () => api.get('/portal/id-card').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  if (isLoading) return (
    <div className="rounded-2xl border bg-white shadow-sm p-4 animate-pulse">
      <div className="h-32 bg-gray-100 rounded-xl" />
    </div>
  )
  if (isError || !data) return null

  const feeStatus = data.feeStatus ?? 'due'

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-white shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-[10px] font-medium uppercase tracking-widest">Student ID Card</p>
          <p className="text-white font-bold text-sm mt-0.5">{data.hostelName}</p>
        </div>
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">PG</span>
        </div>
      </div>

      <div className="p-4 flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-16 h-20 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={data.name}
                className="w-full h-full object-cover"
                onError={e => {
                  // Hide broken image, show initial
                  const el = e.currentTarget
                  el.style.display = 'none'
                  const parent = el.parentElement
                  if (parent && !parent.querySelector('span')) {
                    const span = document.createElement('span')
                    span.className = 'text-2xl font-bold text-primary'
                    span.textContent = data.name?.charAt(0) ?? '?'
                    parent.appendChild(span)
                  }
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-primary">{data.name?.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base leading-tight">{data.name}</p>
          <p className="text-xs font-mono text-primary font-semibold mt-0.5">{data.studentId}</p>
          {data.branch && <p className="text-xs text-gray-500 mt-1 truncate">{data.branch}</p>}
          <p className="text-xs text-gray-600 mt-1.5">
            Room <span className="font-semibold text-gray-900">{data.roomNumber || '—'}</span>
            {' · '}Bed <span className="font-semibold text-gray-900">{data.bedLabel || '—'}</span>
          </p>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${FEE_STATUS_STYLE[feeStatus] ?? FEE_STATUS_STYLE.due}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${FEE_STATUS_DOT[feeStatus] ?? FEE_STATUS_DOT.due}`} />
              Fee: {feeStatus === 'paid' ? 'Paid ✓' : feeStatus === 'overdue' ? `Overdue ₹${(data.totalDue ?? 0).toLocaleString('en-IN')}` : `Due ₹${(data.totalDue ?? 0).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* Real QR Code */}
        <div className="flex-shrink-0">
          <RealQrCode payload={data.qrPayload} />
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Valid until {formatDate(data.validUntil)}</p>
        <p className="text-[10px] text-gray-400">🔴 Live fee status</p>
      </div>
    </div>
  )
}
