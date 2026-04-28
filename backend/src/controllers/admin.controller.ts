import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { supabaseAdmin } from '../config/supabase'
import { ApiError } from '../middleware/error.middleware'
import type { CreateAdminInput, UpdateAdminInput } from '@pg-hostel/shared'

export async function createAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateAdminInput & { branchId?: string }

    const existing = await prisma.admin.findUnique({ where: { email: input.email } })
    if (existing) throw new ApiError(409, 'Admin with this email already exists')

    // Enforce max 2 additional admins (super_admin doesn't count toward limit)
    if (input.role !== 'super_admin') {
      const nonSuperCount = await prisma.admin.count({ where: { role: { not: 'super_admin' } } })
      if (nonSuperCount >= 2) throw new ApiError(400, 'Maximum of 2 additional staff/admin accounts allowed')
    }

    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name, role: input.role },
    })
    if (error) throw new ApiError(500, `Auth creation failed: ${error.message}`)

    const admin = await prisma.admin.create({
      data: {
        supabaseAuthId: authData.user!.id,
        name: input.name,
        email: input.email,
        mobile: input.mobile,
        role: input.role,
        branchId: input.branchId ?? null,
        isActive: true,
      },
    })

    res.status(201).json({ success: true, data: admin })
  } catch (err) {
    next(err)
  }
}

export async function updateAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const input = req.body as UpdateAdminInput & { isActive?: boolean }

    const admin = await prisma.admin.update({
      where: { id },
      data: {
        name: input.name,
        mobile: input.mobile,
        role: input.role,
        branchId: input.branchId,
        isActive: input.isActive,
      },
    })

    res.json({ success: true, data: admin })
  } catch (err) {
    next(err)
  }
}
