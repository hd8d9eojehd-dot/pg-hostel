import { Router } from 'express'
import { authLimiter, otpLimiter } from '../middleware/rateLimit.middleware'
import { validate } from '../middleware/validate.middleware'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireSuperAdmin } from '../middleware/role.middleware'
import { AdminLoginSchema, StudentLoginSchema, ChangePasswordSchema, SendOtpSchema, VerifyOtpSchema } from '@pg-hostel/shared'
import {
  adminLogin, studentLogin, refreshToken, changePassword,
  sendOtp, verifyOtpHandler, forgotPassword, resetPassword, getMe, logout,
} from '../controllers/auth.controller'
import { createAdmin } from '../controllers/admin.controller'

export const authRouter = Router()

authRouter.post('/admin/login', authLimiter, validate(AdminLoginSchema), adminLogin)
authRouter.post('/student/login', authLimiter, validate(StudentLoginSchema), studentLogin)
authRouter.post('/refresh', refreshToken)
authRouter.post('/otp/send', otpLimiter, validate(SendOtpSchema), sendOtp)
authRouter.post('/otp/verify', validate(VerifyOtpSchema), verifyOtpHandler)
authRouter.post('/forgot-password', otpLimiter, forgotPassword)
authRouter.post('/reset-password', resetPassword)
authRouter.post('/logout', authMiddleware, logout)
authRouter.get('/me', authMiddleware, getMe)
authRouter.post('/change-password', authMiddleware, validate(ChangePasswordSchema), changePassword)
authRouter.post('/admin/create', authMiddleware, requireSuperAdmin, createAdmin)
