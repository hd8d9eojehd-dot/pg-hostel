'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Download } from 'lucide-react'
import api from '@/lib/api'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()
  const orderId = searchParams.get('order_id')
  const status = searchParams.get('status')
  const [verifying, setVerifying] = useState(true)
  const [result, setResult] = useState<{ success: boolean; receiptNumber?: string; amount?: number; message?: string } | null>(null)

  useEffect(() => {
    if (!orderId) { setVerifying(false); return }

    // Verify payment with backend
    api.post('/payment/verify', { orderId })
      .then(res => {
        setResult(res.data.data)
        // Invalidate fee structure and invoices so they refresh
        qc.invalidateQueries({ queryKey: ['fee-structure'] })
        qc.invalidateQueries({ queryKey: ['my-invoices'] })
        qc.invalidateQueries({ queryKey: ['portal-home'] })
      })
      .catch(() => {
        // If verify endpoint doesn't exist, use status from URL
        setResult({
          success: status === 'SUCCESS',
          message: status === 'SUCCESS' ? 'Payment successful' : 'Payment failed or cancelled',
        })
        if (status === 'SUCCESS') {
          qc.invalidateQueries({ queryKey: ['fee-structure'] })
          qc.invalidateQueries({ queryKey: ['my-invoices'] })
        }
      })
      .finally(() => setVerifying(false))
  }, [orderId, status, qc])

  return (
    <div>
      <TopBar title="Payment Status" />
      <div className="p-4 max-w-sm mx-auto mt-8">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            {verifying ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="font-semibold text-gray-700">Verifying payment...</p>
                <p className="text-sm text-gray-400">Please wait, do not close this page</p>
              </>
            ) : result?.success ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <p className="text-xl font-bold text-green-700">Payment Successful!</p>
                  {result.amount && <p className="text-gray-600 mt-1">₹{result.amount.toLocaleString('en-IN')} paid</p>}
                  {result.receiptNumber && (
                    <p className="text-sm text-gray-500 mt-1 font-mono">Receipt: {result.receiptNumber}</p>
                  )}
                </div>
                {result.receiptNumber && (
                  <a href={`${API_URL}/finance/receipts/${result.receiptNumber}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2 w-full">
                      <Download className="w-4 h-4" /> Download Receipt
                    </Button>
                  </a>
                )}
                <Button className="w-full" onClick={() => router.push('/finance')}>
                  View Fee Structure
                </Button>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-400 mx-auto" />
                <div>
                  <p className="text-xl font-bold text-red-600">Payment Failed</p>
                  <p className="text-sm text-gray-500 mt-1">{result?.message ?? 'Payment was not completed'}</p>
                </div>
                <Button className="w-full" onClick={() => router.push('/finance')}>
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
      <PaymentStatusContent />
    </Suspense>
  )
}
