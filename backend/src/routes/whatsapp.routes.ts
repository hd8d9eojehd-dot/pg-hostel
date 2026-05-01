import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { sendSingle, sendBulk, getWhatsAppStatus, getWhatsAppLogs } from '../controllers/whatsapp.controller'
import { logoutWhatsApp, reconnectWhatsApp } from '../config/whatsapp'
import { prisma } from '../config/prisma'

export const whatsappRouter = Router()

whatsappRouter.get('/status', requireAdmin, getWhatsAppStatus)
whatsappRouter.get('/logs', requireAdmin, getWhatsAppLogs)
whatsappRouter.post('/send', requireAdmin, sendSingle)
whatsappRouter.post('/send-bulk', requireAdmin, sendBulk)

// Save QR image (data URL or public URL) to DB — permanent storage
// Admin can paste a QR image URL or upload base64 data URL
whatsappRouter.post('/save-qr', requireAdmin, async (req, res) => {
  try {
    const { qrDataUrl } = req.body as { qrDataUrl: string }
    if (!qrDataUrl) { res.status(400).json({ success: false, error: 'qrDataUrl required' }); return }
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) { res.status(404).json({ success: false, error: 'No branch found' }); return }
    const existing = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (existing?.staffPermissions as Record<string, unknown>) ?? {}
    await prisma.settings.upsert({
      where: { branchId: branch.id },
      create: { branchId: branch.id, staffPermissions: { ...perms, whatsappQr: qrDataUrl, whatsappQrSavedAt: new Date().toISOString() } },
      update: { staffPermissions: { ...perms, whatsappQr: qrDataUrl, whatsappQrSavedAt: new Date().toISOString() } },
    })
    res.json({ success: true, message: 'QR saved to database' })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// Clear stored QR from DB
whatsappRouter.post('/clear-qr', requireAdmin, async (_req, res) => {
  try {
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) { res.json({ success: true }); return }
    const existing = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (existing?.staffPermissions as Record<string, unknown>) ?? {}
    const { whatsappQr: _q, whatsappQrSavedAt: _t, ...rest } = perms as { whatsappQr?: string; whatsappQrSavedAt?: string; [k: string]: unknown }
    await prisma.settings.update({ where: { branchId: branch.id }, data: { staffPermissions: rest as Parameters<typeof prisma.settings.update>[0]['data']['staffPermissions'] } })
    res.json({ success: true, message: 'QR cleared' })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// Force logout
whatsappRouter.post('/logout', requireAdmin, async (_req, res) => {
  try {
    await logoutWhatsApp()
    res.json({ success: true, message: 'WhatsApp logged out' })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// Reconnect — triggers new QR generation via Puppeteer (if available)
whatsappRouter.post('/reconnect', requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, message: 'WhatsApp reconnecting...' })
    await reconnectWhatsApp()
  } catch (err) {
    console.error('WhatsApp reconnect error:', err)
  }
})
