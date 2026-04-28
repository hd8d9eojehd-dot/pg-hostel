// Minimal Vercel serverless entry — avoids all problematic imports at module level
import type { IncomingMessage, ServerResponse } from 'http'

let appHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null
let initPromise: Promise<void> | null = null

async function buildApp() {
  // Load dotenv first
  const dotenv = await import('dotenv')
  dotenv.config()

  const express = (await import('express')).default
  const helmet = (await import('helmet')).default
  const cors = (await import('cors')).default

  const app = express()

  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000,http://localhost:3001').split(',').map((s: string) => s.trim())

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({
    origin: (_origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Health check — always works
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env['NODE_ENV'] || 'production', version: '2.0.0' })
  })

  // Load routes dynamically
  try {
    const { router } = await import('../src/routes')
    const { errorMiddleware } = await import('../src/middleware/error.middleware')
    const { loggerMiddleware } = await import('../src/middleware/logger.middleware')

    app.use(loggerMiddleware)
    app.use('/api/v1', router)
    app.use(errorMiddleware)
  } catch (e) {
    console.error('Route load error:', (e as Error).message)
    app.use('/api/v1', (_req, res) => {
      res.status(503).json({ success: false, error: 'Service initializing, please retry' })
    })
  }

  app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }))

  // Init DB
  try {
    const { connectPrisma } = await import('../src/config/prisma')
    const { initCashfree } = await import('../src/config/cashfree')
    await connectPrisma()
    initCashfree()
    console.log('✅ DB and Cashfree initialized')
  } catch (e) {
    console.error('DB init error (non-fatal):', (e as Error).message?.substring(0, 100))
  }

  return app
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!initPromise) {
    initPromise = buildApp().then(app => { appHandler = app }).catch(e => {
      console.error('App build failed:', e)
      initPromise = null
    })
  }
  await initPromise

  if (appHandler) {
    appHandler(req, res)
  } else {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: 'Service starting up, please retry in a moment' }))
  }
}
