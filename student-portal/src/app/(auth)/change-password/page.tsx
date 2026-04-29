'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChangePasswordSchema, type ChangePasswordInput } from '@pg-hostel/shared'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, token, setAuth } = useAuthStore()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  })

  const change = useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
    onSuccess: (res) => {
      const responseData = res.data?.data
      const newToken = responseData?.token
      const newRefreshToken = responseData?.refreshToken

      if (user) {
        const updatedUser = { ...user, isFirstLogin: false }
        const stored = typeof window !== 'undefined' ? localStorage.getItem('student-auth') : null
        const parsed = stored ? JSON.parse(stored) : null
        const existingRefresh = newRefreshToken ?? parsed?.state?.refreshToken ?? undefined
        setAuth(updatedUser, newToken ?? token ?? '', existingRefresh)
        toast({ title: '✓ Password changed successfully' })
        setTimeout(() => router.replace('/home'), 150)
      } else {
        router.replace('/login')
      }
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">
            {user?.isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.isFirstLogin
              ? 'Please set a permanent password to continue.'
              : 'Update your account password.'}
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(d => change.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{user?.isFirstLogin ? 'Temporary Password' : 'Current Password'}</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder={user?.isFirstLogin ? 'Enter temporary password' : 'Current password'}
                    {...register('currentPassword')}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, number, symbol"
                    {...register('newPassword')}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Repeat new password" {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || change.isPending}>
                {(isSubmitting || change.isPending)
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : user?.isFirstLogin ? 'Set Password & Continue' : 'Change Password'
                }
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
