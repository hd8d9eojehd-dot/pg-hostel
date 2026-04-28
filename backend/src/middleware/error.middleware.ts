import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      errors: err.errors,
    })
    return
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    err.errors.forEach(e => {
      const key = e.path.join('.')
      errors[key] = [...(errors[key] ?? []), e.message]
    })
    res.status(422).json({ success: false, error: 'Validation failed', errors })
    return
  }

  // Handle Prisma/DB connection errors gracefully
  const errMsg = err instanceof Error ? err.message : String(err)
  if (
    errMsg.includes('connection') ||
    errMsg.includes('ECONNRESET') ||
    errMsg.includes('timeout') ||
    errMsg.includes('P1001') ||
    errMsg.includes('P1008') ||
    errMsg.includes('Can\'t reach database')
  ) {
    logger.warn('DB connection error (transient):', errMsg.substring(0, 100))
    res.status(503).json({ success: false, error: 'Database temporarily unavailable. Please retry.' })
    return
  }

  logger.error('Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Internal server error' })
}
