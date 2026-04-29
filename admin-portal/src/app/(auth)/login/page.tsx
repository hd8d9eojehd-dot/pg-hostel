'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AdminLoginSchema, type AdminLoginInput } from '@pg-hostel/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdminLoginInput>({
    resolver: zodResolver(AdminLoginSchema),
  })

  const onSubmit = async (data: AdminLoginInput) => {
    try {
      const res = await api.post('/auth/admin/login', data)
      const { token, refreshToken, user } = res.data.data
      setAuth(user, token, refreshToken)
      toast({ title: 'Welcome back!', description: `Logged in as ${user.name}`, variant: 'default' })
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed'
      toast({ title: 'Login failed', description: msg, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-primary rounded-2xl mb-3 md:mb-4 shadow-lg">
            <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">PG Hostel Admin</h1>
          <p className="text-gray-500 mt-1 text-sm">Management Portal</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-lg md:text-xl">Sign in</CardTitle>
            <CardDescription>Enter your admin credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  {...register('email')}
                  className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`h-11 ${errors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
              </Button>
            </form>

            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <strong>Demo:</strong> admin@sunrise-pg.com / Admin@123456
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
