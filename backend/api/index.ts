// Vercel serverless entry point
import type { IncomingMessage, ServerResponse } from 'http'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null

async function getApp() {
  if (app) return app

  const dotenv = await import('dotenv')
  dotenv.config()

  const { default: express } = await import('express')
  const { default: helmet } = await import('helmet')
  const { default: cors } = await import('cors')

  const server = express()

  server.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  server.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  server.use(express.json({ limit: '10mb' }))
  server.use(express.urlencoded({ extended: true, limit: '10mb' }))

  server.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env['NODE_ENV'] || 'production', version: '2.0.0' })
  })

  // Load all routes
  const { router } = await import('../src/routes')
  const { errorMiddleware } = await import('../src/middleware/error.middleware')
  const { loggerMiddleware } = await import('../src/middleware/logger.middleware')

  server.use(loggerMiddleware)
  server.use('/api/v1', router)
  server.use(errorMiddleware)
  server.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }))

  // Init DB + Cashfree (non-blocking)
  Promise.all([
    import('../src/config/prisma').then(m => m.connectPrisma()),
    import('../src/config/cashfree').then(m => m.initCashfree()),
  ]).catch(e => console.error('Init error:', (e as Error).message?.substring(0, 100)))

  app = server
  return server
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const server = await getApp()
    server(req, res)
  } catch (e) {
    console.error('Handler error:', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: 'Internal server error' }))
  }
}
