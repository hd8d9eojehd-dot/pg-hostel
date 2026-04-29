'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { KeyRound, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, Smartphone } from 'lucide-react'

type Step = 'student-id' | 'otp' | 'new-password' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('student-id')
  const [loading, setLoading] = useState(false)
  const [studentId, setStudentId] = useState('')
  // mobile is auto-populated from API response — student doesn't need to re-enter
  const [mobile, setMobile] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const sendOtp = async () => {
    if (!studentId.trim()) return toast({ title: 'Enter your Student ID', variant: 'destructive' })
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { studentId: studentId.trim().toUpperCase() })
      // Auto-populate mobile from response — no re-entry needed
      const returnedMobile: string = res.data.mobile ?? ''
      setMobile(returnedMobile)
      setMaskedMobile(res.data.maskedMobile ?? returnedMobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'))
      setStep('otp')
      toast({ title: '✓ OTP sent', description: 'Check your WhatsApp for the OTP' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to send OTP'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const verifyAndProceed = () => {
    if (!otp.trim() || otp.length < 4) {
      return toast({ title: 'Enter the OTP', variant: 'destructive' })
    }
    setStep('new-password')
  }

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      return toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
    }
    if (newPassword !== confirmPassword) {
      return toast({ title: 'Passwords do not match', variant: 'destructive' })
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        studentId: studentId.trim().toUpperCase(),
        mobile: mobile.trim(),
        otp: otp.trim(),
        newPassword,
      })
      setStep('done')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to reset password'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
      // If OTP is wrong, go back to OTP step
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('invalid')) {
        setStep('otp')
        setOtp('')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-1">Verify via WhatsApp OTP</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {(['student-id', 'otp', 'new-password'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-primary text-white' :
                (['otp', 'new-password', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {(['otp', 'new-password', 'done'].indexOf(step) > i) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 ${(['otp', 'new-password', 'done'].indexOf(step) > i) ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">

            {/* Step 1: Enter Student ID */}
            {step === 'student-id' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Student ID</Label>
                  <Input
                    placeholder="PG-2026-0001"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value.toUpperCase())}
                    autoCapitalize="characters"
                    onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  />
                  <p className="text-xs text-gray-400">An OTP will be sent to your registered WhatsApp number</p>
                </div>
                <Button className="w-full" onClick={sendOtp} disabled={loading || !studentId.trim()}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
                    : 'Send OTP via WhatsApp'
                  }
                </Button>
              </div>
            )}

            {/* Step 2: Enter OTP — mobile is pre-filled, no re-entry */}
            {step === 'otp' && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded-xl flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-700">
                    <p>OTP sent to <strong>{maskedMobile}</strong></p>
                    <p className="mt-0.5 text-green-600">Check your WhatsApp. If not received, contact admin.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Enter OTP</Label>
                  <Input
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && otp.length >= 4 && verifyAndProceed()}
                  />
                </div>

                <Button className="w-full" onClick={verifyAndProceed} disabled={!otp || otp.length < 4}>
                  Verify OTP
                </Button>

                <button
                  onClick={() => { setStep('student-id'); setOtp(''); setMobile('') }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                >
                  ← Back / Resend OTP
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 'new-password' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                  OTP verified ✓ — Set your new password
                </div>

                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Min 8 chars, uppercase, number, symbol"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPwd ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      onKeyDown={e => e.key === 'Enter' && resetPassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={resetPassword}
                  disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                    : 'Reset Password'
                  }
                </Button>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Password Reset!</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your password has been updated. Please login with your new password.
                  </p>
                </div>
                <Button className="w-full" onClick={() => router.push('/login')}>
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {step !== 'done' && (
          <div className="mt-4 text-center">
            <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
