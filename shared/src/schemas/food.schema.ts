import { z } from 'zod'
import { MEAL_TYPE } from '../constants/status.constants'

const timeRegex = /^\d{2}:\d{2}$/

export const UpsertFoodMenuSchema = z.object({
  branchId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  dayOfMonth: z.number().int().min(1).max(31),
  mealType: z.enum(MEAL_TYPE),
  items: z.string().min(1).max(1000).trim(),
  isSpecial: z.boolean().default(false),
  specialLabel: z.string().max(100).optional(),
  specialNote: z.string().max(500).optional(),
  isHoliday: z.boolean().default(false),
})
export type UpsertFoodMenuInput = z.infer<typeof UpsertFoodMenuSchema>

export const UpdateMealTimingsSchema = z.object({
  branchId: z.string().uuid(),
  breakfastStart: z.string().regex(timeRegex),
  breakfastEnd: z.string().regex(timeRegex),
  lunchStart: z.string().regex(timeRegex),
  lunchEnd: z.string().regex(timeRegex),
  snacksStart: z.string().regex(timeRegex).optional(),
  snacksEnd: z.string().regex(timeRegex).optional(),
  dinnerStart: z.string().regex(timeRegex),
  dinnerEnd: z.string().regex(timeRegex),
})
export type UpdateMealTimingsInput = z.infer<typeof UpdateMealTimingsSchema>

// 7-day meal template — one entry per day (index 0 = Day 1 ... index 6 = Day 7)
const DayMealsSchema = z.object({
  breakfast: z.string().max(500).default(''),
  lunch: z.string().max(500).default(''),
  snacks: z.string().max(500).default(''),
  dinner: z.string().max(500).default(''),
})

export const WeeklyTemplateSchema = z.object({
  branchId: z.string().uuid(),
  days: z.array(DayMealsSchema).length(7),
})
export type WeeklyTemplateInput = z.infer<typeof WeeklyTemplateSchema>

export const ApplyTemplateSchema = z.object({
  branchId: z.string().uuid(),
  days: z.array(DayMealsSchema).length(7),
  targetMonths: z.array(z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2100),
  })).min(1),
})
export type ApplyTemplateInput = z.infer<typeof ApplyTemplateSchema>
