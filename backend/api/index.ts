// Vercel serverless entry point
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })
import '../src/config/env' // validate env vars

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import { env } from '../src/config/env'
import { router } from '../src/routes'
import { errorMiddleware } from '../src/middleware/error.middleware'
import { loggerMiddleware } from '../src/middleware/logger.middleware'
import { generalLimiter } from '../src/middleware/rateLimit.middleware'
import { connectPrisma } from '../src/config/prisma'
import { initCashfree } from '../src/config/cashfree'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
    if (!origin || allowed.includes(origin)) return cb(null, true)
    cb(new Error(`Origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(loggerMiddleware)
app.use(generalLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV, version: '2.0.0' })
})

app.use('/api/v1', router)
app.use(errorMiddleware)
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }))

// Initialize on cold start
let initialized = false
const init = async () => {
  if (initialized) return
  initialized = true
  try {
    await connectPrisma()
    initCashfree()
    // Run migrations non-blocking
    const { prisma } = await import('../src/config/prisma')
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
    ]
    for (const sql of migrations) {
      await Promise.race([
        prisma.$executeRawUnsafe(sql),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
      ]).catch(() => {})
    }
  } catch (e) {
    console.error('Init error:', e)
  }
}

// Wrap handler to ensure init
const handler = async (req: express.Request, res: express.Response) => {
  await init()
  app(req, res)
}

export default handler
