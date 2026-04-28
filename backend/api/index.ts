// Vercel serverless entry point
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Set env before importing anything else
process.env['NODE_ENV'] = process.env['NODE_ENV'] || 'production'

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { router } from '../src/routes'
import { errorMiddleware } from '../src/middleware/error.middleware'
import { loggerMiddleware } from '../src/middleware/logger.middleware'

const app = express()

const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000,http://localhost:3001').split(',').map(s => s.trim())

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, true) // Allow all in production for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(loggerMiddleware)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env['NODE_ENV'], version: '2.0.0' })
})

app.use('/api/v1', router)
app.use(errorMiddleware)
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }))

// Initialize DB and Cashfree on first request
let initialized = false
const originalHandler = app

export default async function handler(req: express.Request, res: express.Response) {
  if (!initialized) {
    initialized = true
    try {
      const { connectPrisma } = await import('../src/config/prisma')
      const { initCashfree } = await import('../src/config/cashfree')
      await connectPrisma()
      initCashfree()
    } catch (e) {
      console.error('Init error (non-fatal):', (e as Error).message?.substring(0, 100))
    }
  }
  return originalHandler(req, res)
}
