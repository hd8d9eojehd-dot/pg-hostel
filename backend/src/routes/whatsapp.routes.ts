import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { sendSingle, sendBulk, getWhatsAppStatus, getWhatsAppLogs } from '../controllers/whatsapp.controller'
import { getQrCode, logoutWhatsApp, reconnectWhatsApp } from '../config/whatsapp'
import QRCode from 'qrcode'

export const whatsappRouter = Router()

whatsappRouter.get('/status', requireAdmin, getWhatsAppStatus)
whatsappRouter.get('/logs', requireAdmin, getWhatsAppLogs)
whatsappRouter.post('/send', requireAdmin, sendSingle)
whatsappRouter.post('/send-bulk', requireAdmin, sendBulk)

// Returns the current QR code as a PNG data URL — used by admin portal to render inline
whatsappRouter.get('/qr-image', requireAdmin, async (_req, res) => {
  const qr = getQrCode()
  if (!qr) {
    res.status(404).json({ success: false, error: 'No QR available' })
    return
  }
  try {
    const dataUrl = await QRCode.toDataURL(qr, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
    // Return as JSON so the frontend can use it as <img src={dataUrl}>
    res.json({ success: true, data: { dataUrl } })
  } catch {
    res.status(500).json({ success: false, error: 'QR generation failed' })
  }
})

// Logout WhatsApp — destroys session and forces re-scan
whatsappRouter.post('/logout', requireAdmin, async (_req, res) => {
  try {
    await logoutWhatsApp()
    res.json({ success: true, message: 'WhatsApp logged out. Restart the backend or use /reconnect to re-scan QR.' })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// Reconnect WhatsApp — reinitializes the client (triggers new QR scan)
whatsappRouter.post('/reconnect', requireAdmin, async (_req, res) => {
  try {
    // Respond immediately, then reconnect in background
    res.json({ success: true, message: 'WhatsApp reconnecting... QR code will appear shortly.' })
    await reconnectWhatsApp()
  } catch (err) {
    // Already responded, just log
    console.error('WhatsApp reconnect error:', err)
  }
})
