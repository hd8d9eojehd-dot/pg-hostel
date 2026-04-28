import { z } from 'zod'
import { OUTPASS_TYPE } from '../constants/status.constants'

export const CreateOutpassSchema = z.object({
  type: z.enum(OUTPASS_TYPE),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  fromTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  toTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().min(5).max(500).trim(),
  destination: z.string().min(3).max(200).trim(),
  contactAtDestination: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid mobile')
    .optional(),
}).refine(d => new Date(d.toDate) >= new Date(d.fromDate), {
  message: 'To date must be after from date',
  path: ['toDate'],
})
export type CreateOutpassInput = z.infer<typeof CreateOutpassSchema>

export const ApproveOutpassSchema = z.object({
  note: z.string().max(500).optional(),
})
export type ApproveOutpassInput = z.infer<typeof ApproveOutpassSchema>

export const RejectOutpassSchema = z.object({
  note: z.string().min(5).max(500).trim(),
})
export type RejectOutpassInput = z.infer<typeof RejectOutpassSchema>
