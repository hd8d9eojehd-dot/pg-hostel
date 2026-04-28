import { z } from 'zod'
import { DOC_TYPE } from '../constants/status.constants'

export const UploadDocumentSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(DOC_TYPE),
  label: z.string().max(100).optional(),
  fileUrl: z.string().url(),
  fileName: z.string().max(200).optional(),
  fileSize: z.number().int().positive().optional(),
})
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>

export const VerifyDocumentSchema = z.object({
  note: z.string().max(500).optional(),
})
export type VerifyDocumentInput = z.infer<typeof VerifyDocumentSchema>

export const RejectDocumentSchema = z.object({
  reason: z.string().min(5).max(500).trim(),
})
export type RejectDocumentInput = z.infer<typeof RejectDocumentSchema>

export const GetUploadUrlSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(DOC_TYPE),
  fileName: z.string().min(1).max(200),
})
export type GetUploadUrlInput = z.infer<typeof GetUploadUrlSchema>
