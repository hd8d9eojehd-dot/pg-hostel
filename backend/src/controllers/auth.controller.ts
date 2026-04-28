import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../config/supabase'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { generateAndStoreOtp, verifyOtp, storeOtpForMobile } from '../services/otp.service'
import type { AdminLoginInput, StudentLoginInput, ChangePasswordInput, SendOtpInput, VerifyOtpInput } from '@pg-hostel/shared'

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as AdminLoginInput

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new ApiError(401, 'Invalid credentials')

    const admin = await prisma.admin.findUnique({
      where: { supabaseAuthId: data.user.id },
      select: { id: true, name: true, email: true, role: true, branchId: true, isActive: true },
    })
    if (!admin) throw new ApiError(401, 'Admin not found')
    if (!admin.isActive) throw new ApiError(403, 'Account is deactivated')

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } })

    res.json({
      success: true,
      data: {
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: admin,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function studentLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, password } = req.body as StudentLoginInput

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, email: true, name: true, studentId: true, status: true, isFirstLogin: true },
    })
    if (!student) throw new ApiError(401, 'Invalid Student ID or password')
    if (student.status === 'vacated' || student.status === 'suspended') {
      throw new ApiError(403, 'Account is no longer active')
    }

    const email = student.email ?? `${studentId.toLowerCase()}@pg-hostel.local`
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new ApiError(401, 'Invalid Student ID or password')

    res.json({
      success: true,
      data: {
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          isFirstLogin: student.isFirstLogin,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string }
    if (!token) throw new ApiError(400, 'Refresh token required')

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: token })
    if (error || !data.session) throw new ApiError(401, 'Invalid refresh token')

    res.json({
      success: true,
      data: {
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordInput
    const user = req.user!

    let email: string

    if (user.type === 'admin') {
      const adminRecord = await prisma.admin.findUnique({
        where: { id: user.id },
        select: { email: true },
      })
      if (!adminRecord) throw new ApiError(404, 'Admin not found')
      email = adminRecord.email
    } else {
      const studentRecord = await prisma.student.findUnique({
        where: { id: user.id },
        select: { email: true, studentId: true },
      })
      email = studentRecord?.email ?? `${studentRecord?.studentId?.toLowerCase()}@pg-hostel.local`
    }

    // Verify current password
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.signInWithPassword({ email, password: currentPassword })
    if (verifyError || !verifyData.user) throw new ApiError(400, 'Current password is incorrect')

    // Update password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseAuthId, { password: newPassword })
    if (error) throw new ApiError(500, 'Failed to update password')

    // For students: mark first login complete and get fresh session
    let newToken: string | undefined
    let newRefreshToken: string | undefined

    if (user.type === 'student') {
      await prisma.student.update({ where: { id: user.id }, data: { isFirstLogin: false } })
      // Sign in with new password to get fresh tokens
      const { data: newSession } = await supabaseAdmin.auth.signInWithPassword({ email, password: newPassword })
      newToken = newSession?.session?.access_token
      newRefreshToken = newSession?.session?.refresh_token
    } else {
      // Admin: also get fresh session
      const { data: newSession } = await supabaseAdmin.auth.signInWithPassword({ email, password: newPassword })
      newToken = newSession?.session?.access_token
      newRefreshToken = newSession?.session?.refresh_token
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        isFirstLogin: false,
        ...(newToken && { token: newToken }),
        ...(newRefreshToken && { refreshToken: newRefreshToken }),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, purpose } = req.body as SendOtpInput
    await generateAndStoreOtp(mobile, purpose)
    res.json({ success: true, message: 'OTP sent successfully' })
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.body as { studentId: string }
    if (!studentId) throw new ApiError(400, 'Student ID required')

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, mobile: true, parentMobile: true, parent: { select: { mobile: true } } },
    })
    if (!student) throw new ApiError(404, 'Student not found')

    const otp = await generateAndStoreOtp(student.mobile, 'password_reset')

    // Store same OTP for parent mobile (both parentMobile field and parent table)
    const parentMobile = student.parentMobile ?? student.parent?.mobile
    if (parentMobile && parentMobile !== student.mobile) {
      await storeOtpForMobile(parentMobile, 'password_reset', otp)
    }

    // Send via WhatsApp
    const { sendWhatsAppMessage } = await import('../config/whatsapp')
    const msg = `Your OTP for password reset is: *${otp}*\nValid for 5 minutes. Do not share with anyone.`
    await sendWhatsAppMessage(student.mobile, msg).catch(() => {})
    if (parentMobile && parentMobile !== student.mobile) {
      await sendWhatsAppMessage(parentMobile, msg).catch(() => {})
    }

    // Log OTP in dev mode
    if (process.env['NODE_ENV'] !== 'production') {
      const { logger } = await import('../utils/logger')
      logger.info(`🔑 Password reset OTP for ${studentId}: ${otp}`)
    }

    res.json({
      success: true,
      message: 'OTP sent to registered mobile number(s)',
      maskedMobile: student.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'),
      // Return actual mobile so frontend can use it for reset (no re-entry needed)
      mobile: student.mobile,
    })
  } catch (err) { next(err) }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, mobile, otp, newPassword } = req.body as {
      studentId: string; mobile?: string; otp: string; newPassword: string
    }
    if (!studentId || !otp || !newPassword) throw new ApiError(400, 'studentId, otp, newPassword required')

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, mobile: true, parentMobile: true, supabaseAuthId: true, parent: { select: { mobile: true } } },
    })
    if (!student) throw new ApiError(404, 'Student not found')

    // Verify OTP — try student mobile first, then parent mobile
    // If mobile provided, validate it; otherwise try student's own mobile
    const mobileToVerify = mobile || student.mobile
    const parentMobile = student.parentMobile ?? student.parent?.mobile

    const isStudentMobile = mobileToVerify === student.mobile
    const isParentMobile = mobileToVerify === parentMobile

    if (!isStudentMobile && !isParentMobile) {
      throw new ApiError(400, 'Mobile number not registered with this account')
    }

    // Try verifying OTP on the provided mobile
    let result = await verifyOtp(mobileToVerify, otp, 'password_reset')

    // If failed and we have a parent mobile, try that too
    if (!result.valid && parentMobile && parentMobile !== mobileToVerify) {
      result = await verifyOtp(parentMobile, otp, 'password_reset')
    }

    // Also try student's own mobile if different
    if (!result.valid && student.mobile !== mobileToVerify) {
      result = await verifyOtp(student.mobile, otp, 'password_reset')
    }

    if (!result.valid) throw new ApiError(400, result.reason ?? 'Invalid or expired OTP')

    if (!student.supabaseAuthId) throw new ApiError(500, 'Auth account not found')

    const { error } = await supabaseAdmin.auth.admin.updateUserById(student.supabaseAuthId, { password: newPassword })
    if (error) throw new ApiError(500, 'Failed to reset password')

    await supabaseAdmin.auth.admin.signOut(student.supabaseAuthId).catch(() => {})

    res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' })
  } catch (err) { next(err) }
}

export async function verifyOtpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, otp, purpose } = req.body as VerifyOtpInput
    const result = await verifyOtp(mobile, otp, purpose)
    if (!result.valid) throw new ApiError(400, result.reason ?? 'Invalid OTP')
    res.json({ success: true, message: 'OTP verified successfully' })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!
    if (user.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: user.id },
        include: { branch: true },
      })
      res.json({ success: true, data: admin })
    } else {
      const student = await prisma.student.findUnique({
        where: { id: user.id },
        include: { room: { include: { floor: true } }, bed: true },
      })
      res.json({ success: true, data: student })
    }
  } catch (err) {
    next(err)
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, message: 'Logged out successfully' })
}
