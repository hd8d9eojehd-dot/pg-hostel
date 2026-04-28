import { z } from 'zod'
import { NOTICE_CATEGORY, NOTICE_PRIORITY } from '../constants/status.constants'

export const CreateNoticeSchema = z.object({
  branchId: z.string().uuid().optional(),
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  category: z.enum(NOTICE_CATEGORY),
  priority: z.enum(NOTICE_PRIORITY).default('medium'),
  expiryDate: z.string().date().optional(),
})
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>

export const UpdateNoticeSchema = CreateNoticeSchema.partial()
export type UpdateNoticeInput = z.infer<typeof UpdateNoticeSchema>
