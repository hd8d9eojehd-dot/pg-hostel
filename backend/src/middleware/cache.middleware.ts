import { Request, Response, NextFunction } from 'express'
import { redis } from '../config/redis'
import { logger } from '../utils/logger'

// PERF FIX: Server-side response cache using Redis
// Caches GET responses to avoid repeated DB queries for stable data

/**
 * Cache middleware — caches GET responses in Redis
 * @param ttlSeconds - how long to cache (default 60s)
 * @param keyFn - optional function to build cache key from request
 */
export function cacheResponse(
  ttlSeconds = 60,
  keyFn?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') { next(); return }

    const cacheKey = keyFn
      ? keyFn(req)
      : `cache:${req.originalUrl}:${req.user?.id ?? 'anon'}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        res.setHeader('X-Cache', 'HIT')
        res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}`)
        res.json(JSON.parse(cached))
        return
      }
    } catch { /* Redis unavailable — fall through */ }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      // Only cache successful responses
      if (res.statusCode === 200 && body) {
        redis.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch(() => {})
      }
      res.setHeader('X-Cache', 'MISS')
      res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}`)
      return originalJson(body)
    }

    next()
  }
}

/**
 * Invalidate cache keys matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.debug(`Cache invalidated: ${keys.length} keys matching ${pattern}`)
    }
  } catch { /* non-fatal */ }
}

/**
 * HTTP Cache-Control headers for browser/CDN caching
 */
export function httpCache(maxAgeSeconds: number, isPublic = false) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const directive = isPublic ? 'public' : 'private'
    res.setHeader('Cache-Control', `${directive}, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`)
    next()
  }
}
