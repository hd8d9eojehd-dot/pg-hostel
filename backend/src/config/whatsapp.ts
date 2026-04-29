import { logger } from '../utils/logger'
import { env } from './env'

let client: unknown = null
let isReady = false
let qrCodeString: string | null = null

export function getWhatsAppClient(): unknown {
  return client
}

export function isWhatsAppReady(): boolean {
  return isReady
}

export function getQrCode(): string | null {
  return qrCodeString
}

export async function sendWhatsAppMessage(mobile: string, message: string): Promise<boolean> {
  if (!isReady || !client) {
    logger.warn(`WhatsApp not ready — skipping message to ${mobile}`)
    return false
  }
  try {
    const chatId = `91${mobile.replace(/^(\+91|91)/, '')}@c.us`
    await (client as { sendMessage: (id: string, msg: string) => Promise<void> }).sendMessage(chatId, message)
    logger.info(`✅ WhatsApp message sent to ${mobile}`)
    return true
  } catch (err) {
    logger.error(`WhatsApp send failed to ${mobile}:`, err)
    return false
  }
}

export async function logoutWhatsApp(): Promise<void> {
  try {
    if (client) {
      await (client as { logout: () => Promise<void> }).logout()
      logger.info('WhatsApp logged out successfully')
    }
  } catch (err) {
    logger.warn('WhatsApp logout error (may already be disconnected):', (err as Error).message)
  } finally {
    client = null
    isReady = false
    qrCodeString = null
  }
}

export async function reconnectWhatsApp(): Promise<void> {
  // Reset state before reinitializing
  client = null
  isReady = false
  qrCodeString = null
  logger.info('Reconnecting WhatsApp...')
  await initWhatsApp()
}

export async function initWhatsApp(): Promise<void> {
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

    // Use system Chrome if path is set (avoids Puppeteer download)
    if (env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerConfig['executablePath'] = env.PUPPETEER_EXECUTABLE_PATH
    }

    const wa = new Client({
      authStrategy: new LocalAuth({ dataPath: env.WHATSAPP_SESSION_PATH }),
      puppeteer: puppeteerConfig,
    })

    wa.on('qr', (qr: string) => {
      qrCodeString = qr
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.info('📱 WHATSAPP QR CODE — Scan with WhatsApp on your phone:')
      logger.info('   Open WhatsApp → Linked Devices → Link a Device → Scan QR')
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const qrt = require('qrcode-terminal') as { generate: (qr: string, opts: { small: boolean }) => void }
        qrt.generate(qr, { small: true })
      } catch {
        logger.info('QR raw string (paste into https://www.qr-code-generator.com to view):', qr)
      }
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    })

    wa.on('loading_screen', (percent: number, message: string) => {
      logger.info(`WhatsApp loading: ${percent}% — ${message}`)
    })

    wa.on('authenticated', () => {
      qrCodeString = null
      logger.info('✅ WhatsApp authenticated — session saved')
    })

    wa.on('ready', () => {
      isReady = true
      client = wa
      qrCodeString = null
      logger.info('✅ WhatsApp client ready — messages will be delivered')

      // Keep-alive: send a ping every 30s to prevent session timeout
      const keepAlive = setInterval(async () => {
        if (!isReady || !client) {
          clearInterval(keepAlive)
          return
        }
        try {
          await (client as { getState: () => Promise<string> }).getState()
        } catch {
          // State check failed — client may have disconnected
          logger.warn('WhatsApp keep-alive check failed')
        }
      }, 30_000)
    })

    wa.on('disconnected', (reason: string) => {
      isReady = false
      client = null
      logger.warn(`WhatsApp disconnected: ${reason}`)
      // Only auto-reconnect for non-logout reasons
      if (reason !== 'LOGOUT') {
        logger.info('Attempting WhatsApp reconnect in 10s...')
        setTimeout(() => {
          initWhatsApp().catch((err: unknown) => logger.error('WhatsApp reconnect failed:', err))
        }, 10000)
      } else {
        logger.warn('WhatsApp logged out — scan QR again via admin portal')
      }
    })

    wa.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp auth failure:', msg)
      logger.error('Delete the whatsapp-session folder and restart to re-scan QR')
      isReady = false
    })

    logger.info('🔄 Initializing WhatsApp client...')
    await wa.initialize()
  } catch (err) {
    logger.warn('WhatsApp not available:', (err as Error).message)
    logger.warn('To enable WhatsApp: ensure whatsapp-web.js and puppeteer are installed')
  }
}
