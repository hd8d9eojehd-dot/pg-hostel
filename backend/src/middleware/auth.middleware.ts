import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../config/supabase'
import { prisma, withRetry } from '../config/prisma'
import { ApiError } from './error.middleware'
import { redis } from '../config/redis'

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

// PERF FIX: Cache auth lookups in Redis for 5 minutes to avoid 3 DB queries per request
const AUTH_CACHE_TTL = 300 // 5 minutes

async function getCachedUser(supabaseId: string): Promise<AuthUser | null> {
  try {
    const cached = await redis.get(`auth:${supabaseId}`)
    if (cached) return JSON.parse(cached) as AuthUser
  } catch { /* Redis unavailable — fall through to DB */ }
  return null
}

async function setCachedUser(supabaseId: string, user: AuthUser): Promise<void> {
  try {
    await redis.setex(`auth:${supabaseId}`, AUTH_CACHE_TTL, JSON.stringify(user))
  } catch { /* Redis unavailable — non-fatal */ }
}

export async function invalidateAuthCache(supabaseId: string): Promise<void> {
  try { await redis.del(`auth:${supabaseId}`) } catch { /* non-fatal */ }
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

    // PERF FIX: Check Redis cache first — avoids 3 sequential DB queries on every request
    const cached = await getCachedUser(user.id)
    if (cached) {
      req.user = cached
      return next()
    }

    // PERF FIX: Run all 3 user type lookups in parallel instead of sequential
    const [admin, student, parent] = await Promise.all([
      withRetry(() => prisma.admin.findUnique({
        where: { supabaseAuthId: user.id },
        select: { id: true, role: true, branchId: true, isActive: true, supabaseAuthId: true },
      })),
      withRetry(() => prisma.student.findUnique({
        where: { supabaseAuthId: user.id },
        select: { id: true, status: true, supabaseAuthId: true, isFirstLogin: true },
      })),
      withRetry(() => prisma.parent.findUnique({
        where: { supabaseAuthId: user.id },
        select: { id: true, supabaseAuthId: true },
      })),
    ])

    let authUser: AuthUser | null = null

    if (admin) {
      if (!admin.isActive) throw new ApiError(403, 'Admin account is deactivated')
      authUser = {
        id: admin.id,
        supabaseAuthId: admin.supabaseAuthId,
        role: admin.role as 'super_admin' | 'staff',
        branchId: admin.branchId,
        type: 'admin',
      }
    } else if (student) {
      if (student.status === 'vacated' || student.status === 'suspended') {
        throw new ApiError(403, 'Student account is no longer active')
      }
      authUser = {
        id: student.id,
        supabaseAuthId: student.supabaseAuthId ?? user.id,
        role: 'student',
        branchId: null,
        type: 'student',
        isFirstLogin: student.isFirstLogin,
      }
    } else if (parent) {
      authUser = {
        id: parent.id,
        supabaseAuthId: parent.supabaseAuthId ?? user.id,
        role: 'parent',
        branchId: null,
        type: 'parent',
      }
    }

    if (!authUser) throw new ApiError(401, 'User not found in system')

    // PERF FIX: Cache the resolved user for 5 minutes
    await setCachedUser(user.id, authUser)
    req.user = authUser
    return next()
  } catch (err) {
    next(err)
  }
}
