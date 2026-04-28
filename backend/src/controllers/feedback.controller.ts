import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'

export async function submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!
    const { month, year, foodRating, cleanlinessRating, wifiRating, staffRating, overallRating, comment } = req.body as {
      month: number; year: number; foodRating?: number; cleanlinessRating?: number
      wifiRating?: number; staffRating?: number; overallRating?: number; comment?: string
    }

    const existing = await prisma.feedback.findUnique({
      where: { studentId_month_year: { studentId: user.id, month, year } },
    })
    if (existing) throw new ApiError(409, 'Feedback already submitted for this month')

    const feedback = await prisma.feedback.create({
      data: { studentId: user.id, month, year, foodRating, cleanlinessRating, wifiRating, staffRating, overallRating, comment },
    })

    res.status(201).json({ success: true, data: feedback })
  } catch (err) {
    next(err)
  }
}

export async function getFeedbackSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = req.query as { month: string; year: string }
    const where: Record<string, unknown> = {}
    if (month) where['month'] = parseInt(month)
    if (year) where['year'] = parseInt(year)

    const feedbacks = await prisma.feedback.findMany({ where })
    const count = feedbacks.length

    if (count === 0) {
      res.json({ success: true, data: { count: 0, averages: {} } })
      return
    }

    const avg = (field: keyof typeof feedbacks[0]) => {
      const vals = feedbacks.map(f => f[field] as number | null).filter((v): v is number => v !== null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }

    res.json({
      success: true,
      data: {
        count,
        averages: {
          food: avg('foodRating'),
          cleanliness: avg('cleanlinessRating'),
          wifi: avg('wifiRating'),
          staff: avg('staffRating'),
          overall: avg('overallRating'),
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getMyFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { studentId: req.user!.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    res.json({ success: true, data: feedbacks })
  } catch (err) {
    next(err)
  }
}

export async function getAllFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year, page = '1', limit = '20' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where: Record<string, unknown> = {}
    if (month) where['month'] = parseInt(month)
    if (year) where['year'] = parseInt(year)

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { submittedAt: 'desc' },
        include: { student: { select: { name: true, studentId: true } } },
      }),
      prisma.feedback.count({ where }),
    ])

    res.json({
      success: true,
      data: feedbacks,
      pagination: {
        page: parseInt(page), limit: parseInt(limit), total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
    })
  } catch (err) {
    next(err)
  }
}
