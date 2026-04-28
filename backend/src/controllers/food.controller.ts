import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'

export async function getFoodMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId, month, year } = req.query as Record<string, string>
    if (!branchId || !month || !year) throw new ApiError(400, 'branchId, month, year required')
    const menu = await prisma.foodMenu.findMany({
      where: { branchId, month: parseInt(month), year: parseInt(year) },
      orderBy: [{ dayOfMonth: 'asc' }, { mealType: 'asc' }],
    })
    res.json({ success: true, data: menu })
  } catch (err) { next(err) }
}

export async function getWeeklyMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId, startDay, month, year } = req.query as Record<string, string>
    if (!branchId || !month || !year) throw new ApiError(400, 'branchId, month, year required')
    const start = parseInt(startDay ?? '1')
    const end = start + 6
    const menu = await prisma.foodMenu.findMany({
      where: { branchId, month: parseInt(month), year: parseInt(year), dayOfMonth: { gte: start, lte: end } },
      orderBy: [{ dayOfMonth: 'asc' }, { mealType: 'asc' }],
    })
    res.json({ success: true, data: menu })
  } catch (err) { next(err) }
}

export async function copyWeekToRange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId, sourceMonth, sourceYear, sourceStartDay, targetMonths } = req.body as {
      branchId: string; sourceMonth: number; sourceYear: number
      sourceStartDay: number; targetMonths: Array<{ month: number; year: number }>
    }
    const sourceEnd = sourceStartDay + 6
    const sourceMenu = await prisma.foodMenu.findMany({
      where: { branchId, month: sourceMonth, year: sourceYear, dayOfMonth: { gte: sourceStartDay, lte: sourceEnd } },
    })
    if (!sourceMenu.length) throw new ApiError(404, 'No menu found for source week')

    let created = 0
    for (const target of targetMonths) {
      const daysInMonth = new Date(target.year, target.month, 0).getDate()
      const newItems: Array<{
        branchId: string; month: number; year: number; dayOfMonth: number; mealType: string; items: string; isSpecial: boolean; isHoliday: boolean
      }> = []

      for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = (day - 1) % 7
        const sourceDay = sourceStartDay + dayOfWeek
        const sourceDayMenu = sourceMenu.filter(m => m.dayOfMonth === sourceDay)
        for (const item of sourceDayMenu) {
          newItems.push({ branchId, month: target.month, year: target.year, dayOfMonth: day, mealType: item.mealType, items: item.items, isSpecial: false, isHoliday: false })
        }
      }

      await prisma.foodMenu.deleteMany({ where: { branchId, month: target.month, year: target.year } })
      if (newItems.length > 0) {
        await prisma.foodMenu.createMany({ data: newItems, skipDuplicates: true })
        created += newItems.length
      }
    }
    res.json({ success: true, message: `Copied ${created} menu items to ${targetMonths.length} month(s)` })
  } catch (err) { next(err) }
}

export async function applyWeeklyTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as {
      branchId: string
      days?: Array<{ breakfast: string; lunch: string; snacks: string; dinner: string }>
      template?: Array<{ breakfast: string; lunch: string; snacks: string; dinner: string }>
      targetMonths: Array<{ month: number; year: number }>
    }

    const branchId = body.branchId
    const days = body.days ?? body.template
    const targetMonths = body.targetMonths

    if (!branchId) throw new ApiError(400, 'branchId required')
    if (!days || days.length !== 7) throw new ApiError(400, 'Template must have exactly 7 days')
    if (!targetMonths || targetMonths.length === 0) throw new ApiError(400, 'targetMonths required')

    const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'] as const
    let created = 0

    for (const target of targetMonths) {
      const daysInMonth = new Date(target.year, target.month, 0).getDate()

      // Build all upsert operations for this month
      const upsertOps: Array<{
        branchId: string; month: number; year: number; dayOfMonth: number; mealType: string; items: string
      }> = []

      for (let day = 1; day <= daysInMonth; day++) {
        const templateDay = days[(day - 1) % 7]
        for (const mealType of MEAL_TYPES) {
          const items = templateDay[mealType]
          if (!items || items.trim() === '') continue
          upsertOps.push({ branchId, month: target.month, year: target.year, dayOfMonth: day, mealType, items: items.trim() })
        }
      }

      // Delete existing and bulk insert for speed
      await prisma.foodMenu.deleteMany({
        where: { branchId, month: target.month, year: target.year },
      })

      if (upsertOps.length > 0) {
        await prisma.foodMenu.createMany({
          data: upsertOps.map(op => ({
            branchId: op.branchId,
            month: op.month,
            year: op.year,
            dayOfMonth: op.dayOfMonth,
            mealType: op.mealType,
            items: op.items,
            isSpecial: false,
            isHoliday: false,
          })),
          skipDuplicates: true,
        })
        created += upsertOps.length
      }
    }

    res.json({ success: true, message: `Applied template: ${created} menu items across ${targetMonths.length} month(s)`, data: { created } })
  } catch (err) { next(err) }
}

export async function upsertFoodMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId, month, year, dayOfMonth, mealType, items, isSpecial, specialLabel, specialNote, isHoliday } = req.body as {
      branchId: string; month: number; year: number; dayOfMonth: number
      mealType: string; items: string; isSpecial?: boolean
      specialLabel?: string; specialNote?: string; isHoliday?: boolean
    }
    const menu = await prisma.foodMenu.upsert({
      where: { branchId_month_year_dayOfMonth_mealType: { branchId, month, year, dayOfMonth, mealType } },
      create: { branchId, month, year, dayOfMonth, mealType, items, isSpecial: isSpecial ?? false, specialLabel, specialNote, isHoliday: isHoliday ?? false },
      update: { items, isSpecial: isSpecial ?? false, specialLabel, specialNote, isHoliday: isHoliday ?? false },
    })
    res.json({ success: true, data: menu })
  } catch (err) { next(err) }
}

export async function deleteFoodMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    await prisma.foodMenu.delete({ where: { id } })
    res.json({ success: true, message: 'Menu item deleted' })
  } catch (err) { next(err) }
}

export async function getMealTimings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId } = req.query as { branchId: string }
    const timings = await prisma.mealTimings.findUnique({ where: { branchId } })
    res.json({ success: true, data: timings })
  } catch (err) { next(err) }
}

export async function updateMealTimings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId, ...timings } = req.body as { branchId: string; [key: string]: string }
    const updated = await prisma.mealTimings.upsert({
      where: { branchId },
      create: { branchId, ...timings },
      update: timings,
    })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

export async function getTodayMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId } = req.query as { branchId: string }
    const today = new Date()
    const [menu, timings] = await Promise.all([
      prisma.foodMenu.findMany({
        where: { branchId, month: today.getMonth() + 1, year: today.getFullYear(), dayOfMonth: today.getDate() },
        orderBy: { mealType: 'asc' },
      }),
      prisma.mealTimings.findUnique({ where: { branchId } }),
    ])
    res.json({ success: true, data: { menu, timings } })
  } catch (err) { next(err) }
}
