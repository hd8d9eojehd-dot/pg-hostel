'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { ArrowLeft, Lock, Loader2, Eye, EyeOff, Phone, KeyRound, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, clearAuth } = useAuthStore()

  const [step, setStep] = useState<1 | 2>(1)
  // Store the actual mobile from backend (not asking user to re-enter)
  const [studentMobile, setStudentMobile] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 1: Request OTP — backend sends to student's registered mobile
  const requestOtp = useMutation({
    mutationFn: () => api.post('/auth/forgot-password', { studentId: user?.studentId }),
    onSuccess: (res) => {
      // Backend returns maskedMobile for display AND we store the actual mobile internally
      setMaskedMobile(res.data.maskedMobile ?? '')
      // The backend also returns the actual mobile for use in reset (or we use studentId)
      setStudentMobile(res.data.mobile ?? '')
      setStep(2)
      toast({ title: `OTP sent to ${res.data.maskedMobile ?? 'your registered number'}` })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to send OTP'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  // Step 2: Reset password — use studentId + OTP (no mobile re-entry needed)
  const resetPassword = useMutation({
    mutationFn: () => api.post('/auth/reset-password', {
      studentId: user?.studentId,
      // Use stored mobile from step 1, or fall back to a placeholder that backend resolves by studentId
      mobile: studentMobile,
      otp,
      newPassword,
    }),
    onSuccess: () => {
      toast({ title: '✓ Password changed! Please login with your new password.' })
      clearAuth()
      router.replace('/login')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const handleReset = () => {
    if (!otp || otp.length < 4) { toast({ title: 'Enter the OTP', variant: 'destructive' }); return }
    if (!newPassword || newPassword.length < 8) { toast({ title: 'Password must be at least 8 characters', variant: 'destructive' }); return }
    if (newPassword !== confirmPassword) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return }
    resetPassword.mutate()
  }

  return (
    <div>
      <TopBar title="Change Password" />
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Profile
          </Button>
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`flex-1 h-0.5 mx-2 transition-colors ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Verify Your Identity</p>
                  <p className="text-xs text-gray-500">OTP will be sent to your registered mobile & parent mobile</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <p className="font-medium">Student ID: <span className="font-mono">{user?.studentId}</span></p>
                <p className="text-xs mt-1 text-blue-600">OTP will be sent to your registered mobile number and your parent's number via WhatsApp.</p>
              </div>

              <Button className="w-full gap-2" onClick={() => requestOtp.mutate()} disabled={requestOtp.isPending}>
                {requestOtp.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
                  : <><Phone className="w-4 h-4" /> Send OTP</>
                }
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Enter OTP & New Password</p>
                  <p className="text-xs text-gray-500">OTP sent to {maskedMobile || 'your registered number'}</p>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                ✓ OTP sent to your mobile and parent's mobile. Enter the OTP received on either number.
              </div>

              <div className="space-y-1.5">
                <Label>OTP <span className="text-destructive">*</span></Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>New Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input type={showNew ? 'text' : 'password'} placeholder="Min 8 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Confirm Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input type={showConfirm ? 'text' : 'password'} placeholder="Repeat new password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button className="w-full gap-2" onClick={handleReset} disabled={resetPassword.isPending}>
                {resetPassword.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                  : <><Lock className="w-4 h-4" /> Reset Password</>
                }
              </Button>

              <button type="button"
                onClick={() => { setStep(1); setOtp(''); setNewPassword(''); setConfirmPassword('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center py-1">
                ← Back / Resend OTP
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
