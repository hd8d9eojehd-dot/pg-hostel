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
// PERF FIX: gzip/brotli compression — reduces response size 3-5x
import compression from 'compression'

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

// PERF FIX: Enable gzip compression on all responses — must be first middleware
app.use(compression({
  level: 6, // balance between speed and compression ratio
  threshold: 1024, // only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress PDF/image responses
    const ct = res.getHeader('Content-Type') as string ?? ''
    if (ct.includes('application/pdf') || ct.includes('image/')) return false
    return compression.filter(req, res)
  },
}))

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
  // PERF FIX: Cache health check for 10s to reduce DB load
  res.setHeader('Cache-Control', 'public, max-age=10')
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
    // PERF FIX: Critical indexes for hot query paths
    `CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)`,
    `CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id)`,
    `CREATE INDEX IF NOT EXISTS idx_students_supabase_auth_id ON students(supabase_auth_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_student_status ON invoices(student_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_semester_number ON invoices(student_id, semester_number)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_paid_date ON payments(paid_date)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_utr_pending ON payments(utr_verified, utr_rejected) WHERE utr_verified = false AND utr_rejected = false`,
    `CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)`,
    `CREATE INDEX IF NOT EXISTS idx_outpass_student_id ON outpass(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_outpass_status ON outpass(status)`,
    `CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(is_published, published_at)`,
    `CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_student_id ON whatsapp_logs(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_students_stay_end_date ON students(stay_end_date) WHERE status = 'active'`,
    `CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status)`,
    `CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms(branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id)`,
    `CREATE INDEX IF NOT EXISTS idx_beds_is_occupied ON beds(is_occupied)`,
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
