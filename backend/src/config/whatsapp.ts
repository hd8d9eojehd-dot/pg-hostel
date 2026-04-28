import { logger } from '../utils/logger'
import { env } from './env'

let client: unknown = null
let isReady = false

export function getWhatsAppClient(): unknown {
  return client
}

export function isWhatsAppReady(): boolean {
  return isReady
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

export async function initWhatsApp(): Promise<void> {
  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js')

    const wa = new Client({
      authStrategy: new LocalAuth({ dataPath: env.WHATSAPP_SESSION_PATH }),
      puppeteer: {
        headless: env.WHATSAPP_HEADLESS,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
          '--single-process', '--disable-gpu',
        ],
      },
    })

    wa.on('qr', (qr: string) => {
      logger.info('WhatsApp QR Code generated. Scan with your phone:')
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const qrt = require('qrcode-terminal') as { generate: (qr: string, opts: { small: boolean }) => void }
        qrt.generate(qr, { small: true })
      } catch {
        logger.info('QR (raw):', qr)
      }
    })

    wa.on('authenticated', () => logger.info('✅ WhatsApp authenticated'))
    wa.on('ready', () => { isReady = true; client = wa; logger.info('✅ WhatsApp client ready') })
    wa.on('disconnected', (reason: string) => {
      isReady = false
      logger.warn(`WhatsApp disconnected: ${reason}`)
      setTimeout(() => {
        (wa as { initialize: () => Promise<void> }).initialize().catch((err: unknown) => logger.error('WhatsApp reconnect failed:', err))
      }, 5000)
    })
    wa.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp auth failure:', msg)
      isReady = false
    })

    await wa.initialize()
  } catch (err) {
    logger.warn('WhatsApp not available (install whatsapp-web.js to enable):', (err as Error).message)
  }
}
