import * as dotenv from 'dotenv'
import * as path from 'path'
// Load .env — checks backend/.env first, then root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import './config/env'

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'

import { env } from './config/env'
import { prisma, connectPrisma, disconnectPrisma } from './config/prisma'
import { connectRedis, redis } from './config/redis'
import { initWhatsApp } from './config/whatsapp'
import { closeBrowser } from './config/puppeteer'
import { initCashfree } from './config/cashfree'
import { registerAllJobs } from './jobs/scheduler'
import { router } from './routes'
import { errorMiddleware } from './middleware/error.middleware'
import { loggerMiddleware } from './middleware/logger.middleware'
import { generalLimiter } from './middleware/rateLimit.middleware'
import { logger } from './utils/logger'
const app = express()

// ─── Security ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin: (origin, cb) => {
    const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    if (!origin || allowed.includes(origin)) return cb(null, true)
    cb(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ─── Request parsing ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }))
app.use(loggerMiddleware)
app.use(generalLimiter)

// ─── Health check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    version: '2.0.0',
  })
})

// ─── API routes ──────────────────────────────────────────
app.use('/api/v1', router)

// ─── Error handling ──────────────────────────────────────
app.use(errorMiddleware)
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ─── Bootstrap ───────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await connectPrisma()

    // Connect Redis — non-blocking if unavailable, but wait up to 3s for Upstash TLS handshake
    connectRedis().catch(() => {})
    await new Promise(r => setTimeout(r, 3000))

    initCashfree()

    // Run schema migrations (add new columns if missing) — non-blocking
    runMigrations().catch(err => logger.warn('Migration error:', err))

    // WhatsApp is optional — non-blocking
    initWhatsApp().catch(err =>
      logger.warn('WhatsApp init failed (non-fatal):', err)
    )

    registerAllJobs()

    app.listen(env.PORT, () => {
      logger.info(`🚀 Backend running on port ${env.PORT} [${env.NODE_ENV}]`)
      logger.info(`📊 Admin Portal: ${env.ADMIN_PORTAL_URL}`)
      logger.info(`🎓 Student Portal: ${env.STUDENT_PORTAL_URL}`)
      logger.info(`❤️  Health: http://localhost:${env.PORT}/health`)
    })
  } catch (error) {
    logger.error('Bootstrap failed:', error)
    process.exit(1)
  }
}

async function runMigrations(): Promise<void> {
  const migrations = [
    `ALTER TABLE students ADD COLUMN IF NOT EXISTS father_aadhaar VARCHAR(12)`,
    `ALTER TABLE floors ADD COLUMN IF NOT EXISTS group_type VARCHAR(10) DEFAULT 'floor'`,
    `ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name VARCHAR(100)`,
    `ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_mobile VARCHAR(15)`,
    `ALTER TABLE students ADD COLUMN IF NOT EXISTS total_semesters INTEGER DEFAULT 8`,
    `UPDATE students SET total_semesters = 8 WHERE total_semesters IS NULL`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS semester_number INTEGER`,
    `ALTER TABLE branches ADD COLUMN IF NOT EXISTS signature_url TEXT`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS utr_verified BOOLEAN DEFAULT false`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS utr_rejected BOOLEAN DEFAULT false`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS utr_rejected_reason VARCHAR(200)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_ref) WHERE transaction_ref IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS semester_periods (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES branches(id), sem_number INTEGER NOT NULL, year INTEGER NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, is_active BOOLEAN DEFAULT true, auto_outpass BOOLEAN DEFAULT false, created_by UUID, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(branch_id, sem_number, year))`,
  ]

  let applied = 0
  for (const sql of migrations) {
    try {
      await Promise.race([
        prisma.$executeRawUnsafe(sql),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ])
      applied++
    } catch {
      // Non-fatal — column/table may already exist or timeout
    }
  }
  logger.info(`✅ Schema migrations: ${applied}/${migrations.length} applied`)
}
// ─── Graceful shutdown ───────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — shutting down gracefully...`)
  await disconnectPrisma()
  await redis.quit()
  await closeBrowser()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason)
  process.exit(1)
})

bootstrap()
