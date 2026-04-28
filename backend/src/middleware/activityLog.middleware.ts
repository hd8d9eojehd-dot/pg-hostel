import { Request, Response, NextFunction } from 'express'
import { logActivity } from '../services/activityLog.service'

// Maps HTTP method + route pattern to a readable action name
function getAction(method: string, path: string): string {
  const m = method.toUpperCase()
  if (m === 'POST') return 'CREATED'
  if (m === 'PATCH' || m === 'PUT') return 'UPDATED'
  if (m === 'DELETE') return 'DELETED'
  return 'READ'
}

function getEntityType(path: string): string {
  const segments = path.split('/').filter(Boolean)
  // e.g. /api/v1/students/123 → 'students'
  const entity = segments[2] ?? segments[0] ?? 'unknown'
  return entity.toUpperCase()
}

export function activityLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only log mutating operations by admins
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return next()
  }

  res.on('finish', () => {
    if (!req.user || req.user.type !== 'admin') return
    if (res.statusCode >= 400) return // Don't log failed operations

    const action = getAction(req.method, req.path)
    const entityType = getEntityType(req.originalUrl)

    // Extract entity ID from URL params if present
    const entityId = req.params['id'] ?? undefined

    logActivity({
      actorId: req.user.id,
      actorType: 'admin',
      action,
      entityType,
      entityId,
      meta: { method: req.method, path: req.originalUrl, statusCode: res.statusCode },
      ipAddress: req.ip ?? req.socket.remoteAddress,
    }).catch(() => { /* non-blocking */ })
  })

  next()
}
