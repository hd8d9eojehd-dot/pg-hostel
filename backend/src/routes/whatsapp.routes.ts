import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { sendSingle, sendBulk, getWhatsAppStatus, getWhatsAppLogs } from '../controllers/whatsapp.controller'

export const whatsappRouter = Router()

whatsappRouter.get('/status', requireAdmin, getWhatsAppStatus)
whatsappRouter.get('/logs', requireAdmin, getWhatsAppLogs)
whatsappRouter.post('/send', requireAdmin, sendSingle)
whatsappRouter.post('/send-bulk', requireAdmin, sendBulk)
