import { z } from 'zod'

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>

export const StudentLoginSchema = z.object({
  studentId: z.string().regex(/^PG-\d{4}-\d{4}$/, 'Invalid Student ID format'),
  password: z.string().min(6),
})
export type StudentLoginInput = z.infer<typeof StudentLoginSchema>

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

export const SendOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile'),
  purpose: z.enum(['login', 'reset', 'verify']),
})
export type SendOtpInput = z.infer<typeof SendOtpSchema>

export const VerifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6).regex(/^\d+$/),
  purpose: z.enum(['login', 'reset', 'verify']),
})
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>
