import { Router } from 'express'
import { requireAdmin, requireSuperAdmin } from '../middleware/role.middleware'
import { getSettings, updateSettings, getBranch, updateBranch, getAdmins, updateAdminEmail, updateWhatsappTemplates, updatePaymentDetails } from '../controllers/settings.controller'
import { createAdmin, updateAdmin } from '../controllers/admin.controller'
import { cacheResponse } from '../middleware/cache.middleware'

export const settingsRouter = Router()

// PERF FIX: Cache settings for 5 minutes — rarely changes
settingsRouter.get('/', requireAdmin, cacheResponse(300, req => `cache:settings:${req.query['branchId'] ?? 'all'}`), getSettings)
settingsRouter.post('/', requireAdmin, updateSettings)
settingsRouter.patch('/whatsapp-templates', requireAdmin, updateWhatsappTemplates)
settingsRouter.patch('/payment-details', requireAdmin, updatePaymentDetails)
// PERF FIX: Cache branch info for 5 minutes — used in sidebar, receipts, etc.
settingsRouter.get('/branch/:id', requireAdmin, cacheResponse(300, req => `cache:settings:branch:${req.params['id']}`), getBranch)
settingsRouter.patch('/branch/:id', requireSuperAdmin, updateBranch)
settingsRouter.get('/admins', requireSuperAdmin, getAdmins)
settingsRouter.patch('/admins/:id', requireSuperAdmin, updateAdmin)
settingsRouter.patch('/admins/:id/email', requireSuperAdmin, updateAdminEmail)
