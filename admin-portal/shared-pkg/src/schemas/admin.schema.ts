import { z } from 'zod'
import { ADMIN_ROLE } from '../constants/status.constants'

export const CreateAdminSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  role: z.enum(ADMIN_ROLE),
  branchId: z.string().uuid().optional(),
  password: z.string().min(8),
})
export type CreateAdminInput = z.infer<typeof CreateAdminSchema>

export const UpdateAdminSchema = CreateAdminSchema.partial().omit({ password: true })
export type UpdateAdminInput = z.infer<typeof UpdateAdminSchema>
