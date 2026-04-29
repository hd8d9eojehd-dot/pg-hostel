'use client'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import QRCode from 'qrcode'

interface IdCardData {
  studentId: string
  name: string
  branch: string
  course?: string
  college?: string
  roomNumber: string
  bedLabel: string
  feeStatus: 'paid' | 'due' | 'overdue'
  qrPayload: string  // this is the raw studentId
  validUntil: string
  hostelName: string
  avatarUrl?: string
  totalDue?: number
  currentSem?: number
  totalSems?: number
}

function QrImage({ studentId }: { studentId: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'
  // Raw studentId in URL — no encoding, short, scannable
  const verifyUrl = `${API_URL}/students/verify-qr?token=${studentId}`

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      width: 180,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'L',
    }).then(setDataUrl).catch(() => {})
  }, [verifyUrl])

  if (!dataUrl) return <div style={{ width: 72, height: 72 }} className="bg-gray-100 rounded animate-pulse" />

  return (
    <div className="flex flex-col items-center gap-0.5">
      <a href={verifyUrl} target="_blank" rel="noopener noreferrer">
        <img src={dataUrl} alt="QR" style={{ width: 72, height: 72 }} className="rounded border border-gray-200" />
      </a>
      <p className="text-[7px] text-gray-400">Scan to verify</p>
    </div>
  )
}

export function IdCard() {
  const [avatarError, setAvatarError] = useState(false)
  const { data, isLoading, isError } = useQuery<IdCardData>({
    queryKey: ['portal-id-card'],
    queryFn: () => api.get('/portal/id-card').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })

  if (isLoading) return <div className="rounded-2xl border bg-white shadow-sm p-4 animate-pulse"><div className="h-40 bg-gray-100 rounded-xl" /></div>
  if (isError || !data) return null

  const feeStatus = data.feeStatus ?? 'due'
  const feePending = feeStatus === 'due' || feeStatus === 'overdue'
  const showAvatar = !!data.avatarUrl && !avatarError
  const semLabel = data.currentSem && data.totalSems ? `Sem ${data.currentSem} of ${data.totalSems}` : null

  return (
    <div className={`rounded-2xl border-2 shadow-md overflow-hidden relative ${feePending ? 'border-red-500' : 'border-primary/20'}`}>

      {/* Fee pending alert banner */}
      {feePending && (
        <div className="bg-red-600 px-3 py-1.5 flex items-center justify-between">
          <span className="text-white text-[10px] font-bold animate-pulse">
            [!] FEE {feeStatus === 'overdue' ? 'OVERDUE' : 'PENDING'} - Rs.{(data.totalDue ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="text-red-200 text-[9px]">Pay immediately to activate card</span>
        </div>
      )}

      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between ${feePending ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-gradient-to-r from-primary to-primary/80'}`}>
        <div>
          <p className="text-white/70 text-[9px] font-medium uppercase tracking-widest">Student ID Card</p>
          <p className="text-white font-bold text-sm leading-tight">{data.hostelName}</p>
        </div>
        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">PG</span>
        </div>
      </div>

      {/* Watermark when fee pending */}
      {feePending && (
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center" style={{ top: '80px' }}>
          <p className="text-red-200 text-4xl font-black opacity-10 rotate-[-30deg] select-none whitespace-nowrap">
            FEE PENDING
          </p>
        </div>
      )}

      {/* Main content */}
      <div className={`p-3 flex gap-2.5 relative z-[1] ${feePending ? 'bg-red-50/50' : 'bg-white'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-16 rounded-xl flex items-center justify-center overflow-hidden border ${feePending ? 'bg-red-100 border-red-200' : 'bg-primary/10 border-primary/20'}`}>
            {showAvatar ? (
              <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
            ) : (
              <span className={`text-xl font-bold ${feePending ? 'text-red-400' : 'text-primary'}`}>{data.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{data.name}</p>
          <p className={`text-[10px] font-mono font-semibold ${feePending ? 'text-red-600' : 'text-primary'}`}>{data.studentId}</p>
          {data.college && <p className="text-[10px] text-gray-500 leading-tight truncate">{data.college}</p>}
          {(data.course || data.branch) && (
            <p className="text-[10px] text-gray-600 leading-tight truncate">{[data.course, data.branch].filter(Boolean).join(' . ')}</p>
          )}
          {semLabel && <p className="text-[10px] text-gray-500">{semLabel}</p>}
        </div>

        {/* QR — raw studentId, no encoding */}
        <div className="flex-shrink-0">
          <QrImage studentId={data.studentId} />
        </div>
      </div>

      {/* Room row */}
      <div className={`px-3 py-1.5 border-t border-b text-[10px] text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5 ${feePending ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
        <span>Room <strong className="text-gray-900">{data.roomNumber || '-'}</strong></span>
        <span>Bed <strong className="text-gray-900">{data.bedLabel || '-'}</strong></span>
        {semLabel && <span className={`font-semibold ${feePending ? 'text-red-600' : 'text-primary'}`}>Valid: {semLabel}</span>}
      </div>

      {/* Fee status footer */}
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${feePending ? 'bg-red-50' : 'bg-white'}`}>
        {feePending ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-100 text-red-800 border-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {feeStatus === 'overdue' ? `Overdue Rs.${(data.totalDue ?? 0).toLocaleString('en-IN')}` : `Due Rs.${(data.totalDue ?? 0).toLocaleString('en-IN')}`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-green-100 text-green-800 border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Fee Paid
          </span>
        )}
        <p className="text-[9px] text-gray-400">{semLabel ? `Valid: ${semLabel}` : 'Live'} . Live</p>
      </div>
    </div>
  )
}
