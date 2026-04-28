import { z } from 'zod'
import { COMPLAINT_CATEGORY, COMPLAINT_PRIORITY, COMPLAINT_STATUS } from '../constants/status.constants'

export const CreateComplaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORY),
  description: z.string().min(10).max(1000).trim(),
  priority: z.enum(COMPLAINT_PRIORITY).default('medium'),
  photoUrl: z.string().url().optional(),
})
export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>

export const UpdateComplaintSchema = z.object({
  status: z.enum(COMPLAINT_STATUS).optional(),
  assignedTo: z.string().uuid().optional(),
  resolutionNote: z.string().max(500).optional(),
  priority: z.enum(COMPLAINT_PRIORITY).optional(),
})
export type UpdateComplaintInput = z.infer<typeof UpdateComplaintSchema>

export const AddCommentSchema = z.object({
  comment: z.string().min(2).max(500).trim(),
})
export type AddCommentInput = z.infer<typeof AddCommentSchema>
