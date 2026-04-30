import { logger } from '../utils/logger'
import { env } from './env'

let client: unknown = null
let isReady = false
let qrCodeString: string | null = null
let isInitializing = false

export function getWhatsAppClient(): unknown { return client }
export function isWhatsAppReady(): boolean { return isReady }
export function getQrCode(): string | null { return qrCodeString }
export function isWhatsAppInitializing(): boolean { return isInitializing }

// Save QR to DB so it persists across page refreshes
async function saveQrToDb(qrDataUrl: string): Promise<void> {
  try {
    const { prisma } = await import('./prisma')
    // Store in the first branch's settings staffPermissions
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) return
    const existing = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (existing?.staffPermissions as Record<string, unknown>) ?? {}
    await prisma.settings.upsert({
      where: { branchId: branch.id },
      create: { branchId: branch.id, staffPermissions: { ...perms, whatsappQr: qrDataUrl, whatsappQrSavedAt: new Date().toISOString() } },
      update: { staffPermissions: { ...perms, whatsappQr: qrDataUrl, whatsappQrSavedAt: new Date().toISOString() } },
    })
    logger.info('WhatsApp QR saved to database')
  } catch (err) {
    logger.warn('Failed to save QR to DB:', (err as Error).message)
  }
}

// Clear QR from DB when connected (no longer needed)
async function clearQrFromDb(): Promise<void> {
  try {
    const { prisma } = await import('./prisma')
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) return
    const existing = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (existing?.staffPermissions as Record<string, unknown>) ?? {}
    const { whatsappQr: _qr, whatsappQrSavedAt: _ts, ...rest } = perms as { whatsappQr?: string; whatsappQrSavedAt?: string; [k: string]: unknown }
    await prisma.settings.update({
      where: { branchId: branch.id },
      data: { staffPermissions: rest },
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
    isInitializing = false
    // Don't clear QR from DB on logout — keep it so admin can reconnect immediately
  }
}

// Reconnect — generates a fresh QR
export async function reconnectWhatsApp(): Promise<void> {
  client = null
  isReady = false
  qrCodeString = null
  isInitializing = false
  logger.info('WhatsApp reconnecting...')
  await initWhatsApp()
}

export async function initWhatsApp(): Promise<void> {
  if (isInitializing) {
    logger.info('WhatsApp already initializing — skipping')
    return
  }
  isInitializing = true

  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js')

    const puppeteerArgs = [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu',
    ]

    const puppeteerConfig: Record<string, unknown> = {
      headless: env.WHATSAPP_HEADLESS,
      args: puppeteerArgs,
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
      logger.info('WhatsApp QR code generated')
      // Generate PNG and save to DB immediately — persistent across page refreshes
      try {
        const QRCode = await import('qrcode')
        const dataUrl = await QRCode.toDataURL(qr, {
          width: 300, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        })
        await saveQrToDb(dataUrl)
      } catch (err) {
        logger.warn('QR PNG generation failed:', (err as Error).message)
      }
    })

    wa.on('loading_screen', (percent: number, message: string) => {
      logger.info(`WhatsApp loading: ${percent}% — ${message}`)
    })

    wa.on('authenticated', () => {
      qrCodeString = null
      logger.info('WhatsApp authenticated')
    })

    wa.on('ready', () => {
      isReady = true
      isInitializing = false
      client = wa
      qrCodeString = null
      logger.info('WhatsApp ready')
      // Clear QR from DB — no longer needed when connected
      clearQrFromDb().catch(() => {})

      // Keep-alive ping every 30s
      const keepAlive = setInterval(async () => {
        if (!isReady || !client) { clearInterval(keepAlive); return }
        try {
          await (client as { getState: () => Promise<string> }).getState()
        } catch {
          logger.warn('WhatsApp keep-alive failed')
        }
      }, 30_000)
    })

    wa.on('disconnected', (reason: string) => {
      isReady = false
      isInitializing = false
      logger.warn(`WhatsApp disconnected: ${reason}`)
      // NO auto-reconnect — admin must manually reconnect via portal
    })

    wa.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp auth failure:', msg)
      isReady = false
      isInitializing = false
    })

    logger.info('Initializing WhatsApp...')
    await wa.initialize()
  } catch (err) {
    isInitializing = false
    logger.warn('WhatsApp not available:', (err as Error).message)
  }
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

// Force logout — only way to disconnect (no auto-logout)
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
    qrExpired = false
    isInitializing = false
  }
}

// Reconnect — generates a fresh QR for scanning
export async function reconnectWhatsApp(): Promise<void> {
  client = null
  isReady = false
  qrCodeString = null
  qrDataUrl = null
  qrExpired = false
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
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ]

    const puppeteerConfig: Record<string, unknown> = {
      headless: env.WHATSAPP_HEADLESS,
      args: puppeteerArgs,
    }

    if (env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerConfig['executablePath'] = env.PUPPETEER_EXECUTABLE_PATH
    }

    const wa = new Client({
      authStrategy: new LocalAuth({ dataPath: env.WHATSAPP_SESSION_PATH }),
      puppeteer: puppeteerConfig,
    })

    wa.on('qr', async (qr: string) => {
      // Only update QR if we don't already have one displayed
      // This keeps the QR stable — user sees the same QR until they scan or manually refresh
      if (!qrCodeString) {
        qrCodeString = qr
        qrExpired = false
        // Pre-generate PNG data URL so frontend shows it instantly
        try {
          const QRCode = await import('qrcode')
          qrDataUrl = await QRCode.toDataURL(qr, {
            width: 300, margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'H', // High error correction — more robust scan
          })
          logger.info('WhatsApp QR code ready — scan via admin portal')
        } catch {
          logger.info('WhatsApp QR generated (PNG conversion failed, using raw string)')
        }
      } else {
        // Subsequent QR events = previous QR expired without being scanned
        // Update to new QR and mark previous as expired
        qrExpired = true
        qrCodeString = qr
        try {
          const QRCode = await import('qrcode')
          qrDataUrl = await QRCode.toDataURL(qr, {
            width: 300, margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'H',
          })
        } catch { /* non-fatal */ }
        logger.info('WhatsApp QR refreshed (previous expired)')
      }
    })

    wa.on('loading_screen', (percent: number, message: string) => {
      logger.info(`WhatsApp loading: ${percent}% — ${message}`)
    })

    wa.on('authenticated', () => {
      qrCodeString = null
      qrDataUrl = null
      qrExpired = false
      logger.info('WhatsApp authenticated — session saved')
    })

    wa.on('ready', () => {
      isReady = true
      isInitializing = false
      client = wa
      qrCodeString = null
      qrDataUrl = null
      qrExpired = false
      logger.info('WhatsApp ready — messages will be delivered')

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
      // NO auto-reconnect — only force logout or manual reconnect via admin portal
      if (reason === 'LOGOUT') {
        client = null
        logger.info('WhatsApp logged out — use admin portal to reconnect')
      } else {
        // Connection dropped (network issue etc.) — keep client reference, just mark not ready
        logger.info('WhatsApp connection dropped — use admin portal Reconnect button')
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
