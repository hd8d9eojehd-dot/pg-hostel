'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { StudentLoginSchema, type StudentLoginInput } from '@pg-hostel/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { GraduationCap, Eye, EyeOff, Loader2, Info } from 'lucide-react'

export default function StudentLoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StudentLoginInput>({
    resolver: zodResolver(StudentLoginSchema),
  })

  const onSubmit = async (data: StudentLoginInput) => {
    try {
      const res = await api.post('/auth/student/login', data)
      const { token, refreshToken, user } = res.data.data
      setAuth(user, token, refreshToken)
      toast({ title: `Welcome, ${user.name}!` })
      // Redirect to change password on first login
      if (user.isFirstLogin) {
        router.push('/change-password')
      } else {
        router.push('/home')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Invalid Student ID or password'
      toast({ title: 'Login failed', description: msg, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My PG</h1>
          <p className="text-gray-500 mt-1 text-sm">Student Portal</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-1">Sign in</h2>
            <p className="text-xs text-gray-500 mb-5">
              Use the Student ID and password provided by your hostel admin.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="PG-2026-0001"
                  {...register('studentId')}
                  className={errors.studentId ? 'border-destructive' : ''}
                  autoCapitalize="characters"
                />
                {errors.studentId && (
                  <p className="text-xs text-destructive">{errors.studentId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                  : 'Sign in'
                }
              </Button>
            </form>

            {/* Info box */}
            <div className="mt-4 p-3 bg-blue-50 rounded-xl flex gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">First time logging in?</p>
                <p className="mt-0.5">Your Student ID and temporary password were sent via WhatsApp when you were admitted. Contact your hostel admin if you haven't received them.</p>
              </div>
            </div>

            <div className="mt-3 text-center">
              <a href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password? Reset via OTP
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
