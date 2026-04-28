'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChangePasswordSchema, type ChangePasswordInput } from '@pg-hostel/shared'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function AdminChangePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  })

  const change = useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
    onSuccess: () => {
      toast({ title: '✓ Password changed successfully' })
      router.push('/dashboard')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Change Password</h1>
          <p className="text-sm text-gray-500 mt-1">Update your admin account password</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(d => change.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Current password"
                    {...register('currentPassword')}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Changing...</>
                  : 'Change Password'
                }
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
