import { logger } from '../utils/logger'
import { env } from './env'

let client: unknown = null
let isReady = false
let qrCodeString: string | null = null
let qrDataUrl: string | null = null
let isInitializing = false

export function getWhatsAppClient(): unknown { return client }
export function isWhatsAppReady(): boolean { return isReady }
export function getQrCode(): string | null { return qrCodeString }
export function getQrDataUrl(): string | null { return qrDataUrl }
export function isWhatsAppInitializing(): boolean { return isInitializing }

// ── Save QR to DB — persists across page refreshes and backend restarts ──
async function saveQrToDb(dataUrl: string): Promise<void> {
  try {
    const { prisma } = await import('./prisma')
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) return
    const existing = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (existing?.staffPermissions as Record<string, unknown>) ?? {}
    await prisma.settings.upsert({
      where: { branchId: branch.id },
      create: { branchId: branch.id, staffPermissions: { ...perms, whatsappQr: dataUrl, whatsappConnected: false, whatsappQrAt: new Date().toISOString() } },
      update: { staffPermissions: { ...perms, whatsappQr: dataUrl, whatsappConnected: false, whatsappQrAt: new Date().toISOString() } },
    })
    logger.info('WhatsApp QR saved to DB — visible in admin portal at any time')
  } catch (err) {
    logger.warn('Failed to save QR to DB:', (err as Error).message)
  }
}

// ── Update connection status in DB ──
async function setConnectedInDb(connected: boolean): Promise<void> {
  try {
    const { prisma } = await import('./prisma')
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) return
    const existing = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (existing?.staffPermissions as Record<string, unknown>) ?? {}
    // When connected, remove the QR (no longer needed). When disconnected, keep QR.
    const updated = connected
      ? { ...perms, whatsappConnected: true, whatsappQr: null, whatsappQrAt: null }
      : { ...perms, whatsappConnected: false }
    await prisma.settings.upsert({
      where: { branchId: branch.id },
      create: { branchId: branch.id, staffPermissions: updated },
      update: { staffPermissions: updated },
    })
  } catch { /* non-fatal */ }
}

export async function sendWhatsAppMessage(mobile: string, message: string): Promise<boolean> {
  if (!isReady || !client) {
    logger.warn(`WhatsApp not ready — skipping message to ${mobile}`)
    return false
  }
  try {
    const chatId = `91${mobile.replace(/^(\+91|91)/, '')}@c.us`
    await (client as { sendMessage: (id: string, msg: string) => Promise<void> }).sendMessage(chatId, message)
    logger.info(`WhatsApp message sent to ${mobile}`)
    return true
  } catch (err) {
    logger.error(`WhatsApp send failed to ${mobile}:`, err)
    return false
  }
}

// Force logout — only way to disconnect
export async function logoutWhatsApp(): Promise<void> {
  try {
    if (client) {
      await (client as { logout: () => Promise<void> }).logout()
      logger.info('WhatsApp force-logged out')
    }
  } catch (err) {
    logger.warn('WhatsApp logout error:', (err as Error).message)
  } finally {
    client = null
    isReady = false
    qrCodeString = null
    qrDataUrl = null
    isInitializing = false
    await setConnectedInDb(false).catch(() => {})
  }
}

// Reconnect — generates a fresh QR
export async function reconnectWhatsApp(): Promise<void> {
  client = null
  isReady = false
  qrCodeString = null
  qrDataUrl = null
  isInitializing = false
  logger.info('WhatsApp reconnecting...')
  await initWhatsApp()
}

export async function initWhatsApp(): Promise<void> {
  if (isInitializing) {
    logger.info('WhatsApp already initializing — skipping duplicate init')
    return
  }
  isInitializing = true

  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js')

    const puppeteerArgs = [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu',
      '--disable-features=site-per-process',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
    ]

    const puppeteerConfig: Record<string, unknown> = {
      headless: env.WHATSAPP_HEADLESS,
      args: puppeteerArgs,
      ignoreHTTPSErrors: true,
      pipe: false,
    }

    if (env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerConfig['executablePath'] = env.PUPPETEER_EXECUTABLE_PATH
    }

    const wa = new Client({
      authStrategy: new LocalAuth({ dataPath: env.WHATSAPP_SESSION_PATH }),
      puppeteer: puppeteerConfig,
    })

    wa.on('qr', async (qr: string) => {
      qrCodeString = qr
      logger.info('WhatsApp QR generated — saving to DB for admin portal')
      try {
        const QRCode = await import('qrcode')
        qrDataUrl = await QRCode.toDataURL(qr, {
          width: 320, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        })
        // Save to DB — this is the key: QR persists in DB so admin portal always shows it
        await saveQrToDb(qrDataUrl)
      } catch (err) {
        logger.warn('QR PNG generation failed:', (err as Error).message)
      }
    })

    wa.on('loading_screen', (percent: number, message: string) => {
      logger.info(`WhatsApp loading: ${percent}% — ${message}`)
    })

    wa.on('authenticated', () => {
      qrCodeString = null
      qrDataUrl = null
      logger.info('WhatsApp authenticated — session saved')
    })

    wa.on('ready', () => {
      isReady = true
      isInitializing = false
      client = wa
      qrCodeString = null
      qrDataUrl = null
      logger.info('WhatsApp ready — messages will be delivered')
      // Mark as connected in DB — admin portal will show "Connected" state
      setConnectedInDb(true).catch(() => {})

      // Keep-alive ping every 30s
      const keepAlive = setInterval(async () => {
        if (!isReady || !client) { clearInterval(keepAlive); return }
        try {
          await (client as { getState: () => Promise<string> }).getState()
        } catch {
          logger.warn('WhatsApp keep-alive check failed')
        }
      }, 30_000)
    })

    wa.on('disconnected', (reason: string) => {
      isReady = false
      isInitializing = false
      logger.warn(`WhatsApp disconnected: ${reason}`)
      // Mark as disconnected in DB
      setConnectedInDb(false).catch(() => {})
      // NO auto-reconnect — only manual reconnect via admin portal
      if (reason === 'LOGOUT') {
        client = null
        logger.info('WhatsApp logged out — use admin portal to reconnect')
      }
    })

    wa.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp auth failure:', msg)
      isReady = false
      isInitializing = false
    })

    logger.info('Initializing WhatsApp client...')
    await wa.initialize()
  } catch (err) {
    isInitializing = false
    logger.warn('WhatsApp not available:', (err as Error).message)
  }
}
