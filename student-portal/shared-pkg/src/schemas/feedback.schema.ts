import { z } from 'zod'

const rating = z.number().int().min(1).max(5).optional()

export const SubmitFeedbackSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  foodRating: rating,
  cleanlinessRating: rating,
  wifiRating: rating,
  staffRating: rating,
  overallRating: rating,
  comment: z.string().max(1000).optional(),
})
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>
