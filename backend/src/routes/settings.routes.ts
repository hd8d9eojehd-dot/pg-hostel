import { Router } from 'express'
import { requireAdmin, requireSuperAdmin } from '../middleware/role.middleware'
import { getSettings, updateSettings, getBranch, updateBranch, getAdmins, updateAdminEmail, updateWhatsappTemplates } from '../controllers/settings.controller'
import { createAdmin, updateAdmin } from '../controllers/admin.controller'

export const settingsRouter = Router()

settingsRouter.get('/', requireAdmin, getSettings)
settingsRouter.post('/', requireAdmin, updateSettings)
settingsRouter.patch('/whatsapp-templates', requireAdmin, updateWhatsappTemplates)
settingsRouter.get('/branch/:id', requireAdmin, getBranch)
settingsRouter.patch('/branch/:id', requireSuperAdmin, updateBranch)
settingsRouter.get('/admins', requireSuperAdmin, getAdmins)
settingsRouter.patch('/admins/:id', requireSuperAdmin, updateAdmin)
settingsRouter.patch('/admins/:id/email', requireSuperAdmin, updateAdminEmail)
