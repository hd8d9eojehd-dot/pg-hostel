import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = (req.query['branchId'] as string) ?? req.user?.branchId
    if (!branchId) throw new ApiError(400, 'branchId required')
    const settings = await prisma.settings.findUnique({ where: { branchId } })
    res.json({ success: true, data: settings })
  } catch (err) { next(err) }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = req.body.branchId ?? req.user?.branchId
    if (!branchId) throw new ApiError(400, 'branchId required')
    const { lateFeeType, lateFeeAmount, gracePeriodDays, depositPolicy, autoInvoiceEnabled, whatsappTemplates, staffPermissions } = req.body
    const settings = await prisma.settings.upsert({
      where: { branchId },
      create: { branchId, lateFeeType, lateFeeAmount, gracePeriodDays, depositPolicy, autoInvoiceEnabled, whatsappTemplates: whatsappTemplates ?? {}, staffPermissions: staffPermissions ?? {} },
      update: { lateFeeType, lateFeeAmount, gracePeriodDays, depositPolicy, autoInvoiceEnabled, whatsappTemplates, staffPermissions },
    })
    res.json({ success: true, data: settings })
  } catch (err) { next(err) }
}

export async function getBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] ?? req.user?.branchId
    if (!id) throw new ApiError(400, 'Branch ID required')
    const branch = await prisma.branch.findUnique({ where: { id }, include: { settings: true, mealTimings: true } })
    if (!branch) throw new ApiError(404, 'Branch not found')
    res.json({ success: true, data: branch })
  } catch (err) { next(err) }
}

export async function updateBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id']!
    const { name, address, city, state, pincode, contactPrimary, contactSecondary, email } = req.body
    const branch = await prisma.branch.update({
      where: { id },
      data: { name, address, city, state, pincode, contactPrimary, contactSecondary, email, updatedAt: new Date() },
    })
    // Update PG_NAME env dynamically so it reflects in WhatsApp messages
    if (name) process.env['PG_NAME'] = name
    res.json({ success: true, data: branch, message: 'Branch updated — PG name change reflected immediately' })
  } catch (err) { next(err) }
}

export async function getAdmins(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admins = await prisma.admin.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ success: true, data: admins })
  } catch (err) { next(err) }
}

export async function updateWhatsappTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = req.body.branchId ?? req.user?.branchId
    if (!branchId) throw new ApiError(400, 'branchId required')
    const { whatsappTemplates } = req.body
    if (!whatsappTemplates || typeof whatsappTemplates !== 'object') throw new ApiError(400, 'whatsappTemplates object required')
    const settings = await prisma.settings.upsert({
      where: { branchId },
      create: { branchId, whatsappTemplates },
      update: { whatsappTemplates },
    })
    res.json({ success: true, data: settings })
  } catch (err) { next(err) }
}

export async function updateAdminEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { newEmail, password } = req.body as { newEmail: string; password: string }
    const user = req.user!

    // Only super_admin can change their own email
    if (user.role !== 'super_admin') throw new ApiError(403, 'Only super admin can change email')

    const admin = await prisma.admin.findUnique({ where: { id } })
    if (!admin) throw new ApiError(404, 'Admin not found')

    // Verify current password
    const { supabaseAdmin } = await import('../config/supabase')
    const { error: verifyErr } = await supabaseAdmin.auth.signInWithPassword({ email: admin.email, password })
    if (verifyErr) throw new ApiError(400, 'Current password is incorrect')

    // Update email in Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(admin.supabaseAuthId, { email: newEmail })
    if (error) throw new ApiError(500, `Failed to update email: ${error.message}`)

    // Update in DB
    const updated = await prisma.admin.update({ where: { id }, data: { email: newEmail } })
    res.json({ success: true, data: updated, message: 'Email updated successfully' })
  } catch (err) { next(err) }
}
