import { logger } from '../utils/logger'
import { env } from './env'

let browser: unknown = null

export async function getBrowser(): Promise<unknown> {
  if (browser) return browser
  try {
    const puppeteerCore = await import('puppeteer-core')
    const executablePath = await getExecutablePath()
    browser = await puppeteerCore.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath,
    })
    logger.info('✅ Puppeteer browser launched')
    return browser
  } catch (err) {
    throw new Error(`Puppeteer not available: ${(err as Error).message}`)
  }
}

async function getExecutablePath(): Promise<string | undefined> {
  if (env.PUPPETEER_EXECUTABLE_PATH) return env.PUPPETEER_EXECUTABLE_PATH
  if (env.NODE_ENV === 'production') {
    try {
      const chromium = await import('@sparticuz/chromium')
      return await chromium.default.executablePath()
    } catch { return undefined }
  }
  // Common local paths
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]
  for (const p of paths) {
    try {
      const fs = await import('fs')
      if (fs.existsSync(p)) return p
    } catch { /* continue */ }
  }
  return undefined
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    try {
      await (browser as { close: () => Promise<void> }).close()
    } catch { /* ignore */ }
    browser = null
  }
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const b = await getBrowser() as { newPage: () => Promise<{
    setContent: (html: string, opts: unknown) => Promise<void>
    pdf: (opts: unknown) => Promise<Uint8Array>
    close: () => Promise<void>
  }> }
  const page = await b.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}

export async function htmlToPdfCard(html: string): Promise<Buffer> {
  const b = await getBrowser() as { newPage: () => Promise<{
    setContent: (html: string, opts: unknown) => Promise<void>
    pdf: (opts: unknown) => Promise<Uint8Array>
    close: () => Promise<void>
  }> }
  const page = await b.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ width: '3.375in', height: '2.125in', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
