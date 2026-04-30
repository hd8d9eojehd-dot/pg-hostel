import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: process.env['DATABASE_URL'] } },
    log: [{ level: 'error', emit: 'stdout' }],
    errorFormat: 'minimal',
    // PERF FIX: Optimize connection pool for serverless/long-running server
    // connection_limit=10 for server, 1 for serverless (Vercel)
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}

// Retry wrapper for transient Supabase pooler connection errors
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const isConnectionErr =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001' ||
        err instanceof Prisma.PrismaClientInitializationError ||
        (err instanceof Error && (
          err.message.includes("Can't reach database") ||
          err.message.includes('connection') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('timeout')
        ))
      if (!isConnectionErr || i === retries - 1) throw err
      logger.warn(`DB connection error, retrying (${i + 1}/${retries})...`)
      await new Promise(r => setTimeout(r, delayMs * (i + 1)))
      // Try to reconnect
      try { await prisma.$connect() } catch { /* ignore */ }
    }
  }
  throw lastErr
}

export async function connectPrisma(): Promise<void> {
  let retries = 5
  while (retries > 0) {
    try {
      await prisma.$connect()
      await prisma.$queryRawUnsafe('SELECT 1')
      logger.info('✅ Database connected successfully')
      return
    } catch (err) {
      retries--
      if (retries === 0) {
        const msg = err instanceof Error ? err.message.substring(0, 100) : String(err)
        logger.error(`❌ Database connection failed after 5 attempts: ${msg}`)
        throw err
      }
      logger.warn(`Database connection attempt failed, retrying... (${retries} left)`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

export async function disconnectPrisma(): Promise<void> {
  try { await prisma.$disconnect() } catch { /* ignore */ }
}
