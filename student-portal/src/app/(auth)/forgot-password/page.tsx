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
  const [mobile, setMobile] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const sendOtp = async () => {
    if (!studentId.trim()) return toast({ title: 'Enter your Student ID', variant: 'destructive' })
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { studentId: studentId.trim().toUpperCase() })
      setMaskedMobile(res.data.maskedMobile ?? '')
      setStep('otp')
      toast({ title: '✓ OTP sent to your registered WhatsApp number(s)' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to send OTP'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    if (!otp.trim() || otp.length < 4) return toast({ title: 'Enter the OTP', variant: 'destructive' })
    if (!mobile.trim()) return toast({ title: 'Enter the mobile number that received the OTP', variant: 'destructive' })
    setStep('new-password')
  }

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 8) return toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
    if (newPassword !== confirmPassword) return toast({ title: 'Passwords do not match', variant: 'destructive' })
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
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-1">Verify via WhatsApp OTP</p>
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
                  />
                  <p className="text-xs text-gray-400">An OTP will be sent to your registered WhatsApp number(s)</p>
                </div>
                <Button className="w-full" onClick={sendOtp} disabled={loading || !studentId}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</> : 'Send OTP via WhatsApp'}
                </Button>
              </div>
            )}

            {/* Step 2: Enter OTP */}
            {step === 'otp' && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded-xl flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">
                    OTP sent to <strong>{maskedMobile}</strong> and parent number (if registered). Either number can be used.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile Number (that received OTP)</Label>
                  <Input
                    placeholder="Enter your or parent's mobile"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    type="tel"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>OTP</Label>
                  <Input
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="text-center text-xl tracking-widest font-mono"
                  />
                </div>
                <Button className="w-full" onClick={verifyOtp} disabled={!otp || !mobile}>
                  Verify OTP
                </Button>
                <button onClick={() => { setStep('student-id'); setOtp('') }} className="w-full text-xs text-gray-400 hover:text-gray-600">
                  ← Back / Resend OTP
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 'new-password' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Min 8 chars, uppercase, number, symbol"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={resetPassword} disabled={loading || !newPassword || !confirmPassword}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
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
                  <p className="text-sm text-gray-500 mt-1">Your password has been updated. Please login with your new password.</p>
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
