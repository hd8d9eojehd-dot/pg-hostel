/**
 * WhatsApp QR Generator — prints a scannable QR directly in the terminal.
 *
 * Usage (from the backend folder):
 *   npx ts-node --transpile-only src/scripts/whatsapp-qr.ts
 *
 * Or from the root:
 *   npm run whatsapp:qr --workspace=backend
 *
 * Scan the QR with WhatsApp → ⋮ Menu → Linked Devices → Link a Device.
 * Once connected the session is saved and the main backend stays connected.
 */

// Load .env before anything else
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const SESSION_PATH = process.env['WHATSAPP_SESSION_PATH'] ?? './whatsapp-session'
const CHROME_PATH  = process.env['PUPPETEER_EXECUTABLE_PATH'] ?? undefined
const HEADLESS     = process.env['WHATSAPP_HEADLESS'] !== 'false'

// ── Print QR as UTF-8 block characters in the terminal ──────────────────────
async function printQrInTerminal(qrString: string): Promise<void> {
  try {
    // Try qrcode-terminal first (small, clean output)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const qrt = require('qrcode-terminal') as { generate: (s: string, opts: { small: boolean }, cb?: (qr: string) => void) => void }
    qrt.generate(qrString, { small: true }, (qr: string) => {
      console.log('\n' + qr)
    })
  } catch {
    // Fallback: use the qrcode package to print UTF-8 blocks
    try {
      const QRCode = await import('qrcode')
      const text = await QRCode.toString(qrString, { type: 'terminal' as 'svg', margin: 1 })
      console.log('\n' + text)
    } catch {
      // Last resort: just print the raw string
      console.log('\nRaw QR string (paste into a QR generator):\n')
      console.log(qrString)
    }
  }
}

async function main(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  WhatsApp QR Generator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Chrome : ${CHROME_PATH ?? 'auto-detect'}`)
  console.log(`  Session: ${SESSION_PATH}`)
  console.log(`  Headless: ${HEADLESS}`)
  console.log('  Starting Chrome... this takes 15-30 seconds.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Check Chrome exists
  if (CHROME_PATH) {
    const fs = await import('fs')
    if (!fs.existsSync(CHROME_PATH)) {
      console.error(`❌  Chrome not found at: ${CHROME_PATH}`)
      console.error('    Update PUPPETEER_EXECUTABLE_PATH in your .env file.')
      process.exit(1)
    }
    console.log(`✅  Chrome found at: ${CHROME_PATH}\n`)
  }

  // Import whatsapp-web.js
  let Client: new (opts: unknown) => {
    on: (event: string, cb: (...args: unknown[]) => void) => void
    initialize: () => Promise<void>
  }
  let LocalAuth: new (opts: { dataPath: string }) => unknown

  try {
    const ww = await import('whatsapp-web.js')
    Client = ww.Client as typeof Client
    LocalAuth = ww.LocalAuth as typeof LocalAuth
  } catch (err) {
    console.error('❌  whatsapp-web.js not installed.')
    console.error('    Run: npm install whatsapp-web.js --save-optional')
    console.error('    Error:', (err as Error).message)
    process.exit(1)
  }

  const puppeteerConfig: Record<string, unknown> = {
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-features=site-per-process',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
    ],
    ignoreHTTPSErrors: true,
    // Needed for Chrome 120+ with external Chrome binary
    pipe: false,
  }
  if (CHROME_PATH) puppeteerConfig['executablePath'] = CHROME_PATH

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: puppeteerConfig,
  })

  let qrCount = 0

  client.on('qr', async (qr: unknown) => {
    const qrString = qr as string
    qrCount++
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`  SCAN THIS QR WITH WHATSAPP  (QR #${qrCount})`)
    console.log(`  WhatsApp → ⋮ Menu → Linked Devices → Link a Device`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    await printQrInTerminal(qrString)
    console.log(`  ⏱  QR expires in ~20 seconds. Waiting for scan...\n`)
  })

  client.on('loading_screen', (percent: unknown, message: unknown) => {
    process.stdout.write(`\r  Loading: ${percent}% — ${message}          `)
  })

  client.on('authenticated', () => {
    console.log('\n✅  Authenticated! Session saved to:', SESSION_PATH)
  })

  client.on('ready', () => {
    console.log('✅  WhatsApp CONNECTED and ready!')
    console.log('    You can now stop this script (Ctrl+C).')
    console.log('    The main backend will use the saved session automatically.\n')
    setTimeout(() => process.exit(0), 2000)
  })

  client.on('auth_failure', (msg: unknown) => {
    console.error('\n❌  Auth failed:', msg)
    console.error('    Delete the whatsapp-session folder and try again:')
    console.error(`    rmdir /s /q "${SESSION_PATH}"`)
    process.exit(1)
  })

  client.on('disconnected', (reason: unknown) => {
    console.warn('\n⚠️  Disconnected:', reason)
    process.exit(1)
  })

  console.log('  Launching Chrome...\n')
  try {
    await client.initialize()
  } catch (err) {
    console.error('\n❌  Failed to initialize WhatsApp client:')
    console.error('   ', (err as Error).message)
    if ((err as Error).message.includes('Cannot find module')) {
      console.error('\n    Missing dependency. Run:')
      console.error('    npm install whatsapp-web.js puppeteer-core --save-optional')
    }
    process.exit(1)
  }
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err)
  process.exit(1)
})
