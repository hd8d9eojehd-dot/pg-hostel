import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../config/supabase'
import { prisma, withRetry } from '../config/prisma'
import { ApiError } from './error.middleware'

export interface AuthUser {
  id: string
  supabaseAuthId: string
  role: 'super_admin' | 'staff' | 'student' | 'parent'
  branchId: string | null
  type: 'admin' | 'student' | 'parent'
  isFirstLogin?: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authorization header missing or malformed')
    }

    const token = authHeader.slice(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      throw new ApiError(401, 'Invalid or expired token')
    }

    const admin = await withRetry(() => prisma.admin.findUnique({
      where: { supabaseAuthId: user.id },
      select: { id: true, role: true, branchId: true, isActive: true, supabaseAuthId: true },
    }))

    if (admin) {
      if (!admin.isActive) throw new ApiError(403, 'Admin account is deactivated')
      req.user = {
        id: admin.id,
        supabaseAuthId: admin.supabaseAuthId,
        role: admin.role as 'super_admin' | 'staff',
        branchId: admin.branchId,
        type: 'admin',
      }
      return next()
    }

    const student = await withRetry(() => prisma.student.findUnique({
      where: { supabaseAuthId: user.id },
      select: { id: true, status: true, supabaseAuthId: true, isFirstLogin: true },
    }))

    if (student) {
      if (student.status === 'vacated' || student.status === 'suspended') {
        throw new ApiError(403, 'Student account is no longer active')
      }
      req.user = {
        id: student.id,
        supabaseAuthId: student.supabaseAuthId ?? user.id,
        role: 'student',
        branchId: null,
        type: 'student',
        isFirstLogin: student.isFirstLogin,
      }
      return next()
    }

    const parent = await withRetry(() => prisma.parent.findUnique({
      where: { supabaseAuthId: user.id },
      select: { id: true, supabaseAuthId: true },
    }))

    if (parent) {
      req.user = {
        id: parent.id,
        supabaseAuthId: parent.supabaseAuthId ?? user.id,
        role: 'parent',
        branchId: null,
        type: 'parent',
      }
      return next()
    }

    throw new ApiError(401, 'User not found in system')
  } catch (err) {
    next(err)
  }
}
