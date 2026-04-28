import { Request, Response, NextFunction } from 'express'
import { ApiError } from './error.middleware'
import type { AuthUser } from './auth.middleware'

type AllowedRole = AuthUser['role']

export function requireRole(...roles: AllowedRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'))
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'))
    }
    next()
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.type !== 'admin') {
    return next(new ApiError(403, 'Admin access required'))
  }
  next()
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'super_admin') {
    return next(new ApiError(403, 'Super admin access required'))
  }
  next()
}
