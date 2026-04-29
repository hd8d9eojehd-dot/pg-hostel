import Redis from 'ioredis'
import { env } from './env'
import { logger } from '../utils/logger'

const isTLS = env.REDIS_URL.startsWith('rediss://')

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableReadyCheck: false,
  // Upstash requires TLS — auto-detected from rediss:// prefix
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.warn('Redis unavailable — OTP and rate limiting will use in-memory fallback')
      return null // stop retrying
    }
    return Math.min(times * 500, 2000)
  },
})

redis.on('connect', () => logger.info('✅ Redis connected'))
redis.on('ready', () => logger.info('✅ Redis ready'))
redis.on('error', () => { /* suppress repeated errors */ })
redis.on('close', () => { /* suppress */ })

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect()
    // Quick ping to confirm it's actually working
    await redis.ping()
    logger.info('✅ Redis ping OK')
  } catch {
    logger.warn('⚠️  Redis not available — running without cache (OTP will be logged to console)')
  }
}
