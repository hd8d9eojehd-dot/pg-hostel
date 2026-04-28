import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'

export async function getRenewalExits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const skip = getSkip(page, limit)
    const where: Record<string, unknown> = {}
    if (req.query['type']) where['type'] = req.query['type']
    if (req.query['status']) where['status'] = req.query['status']

    const [records, total] = await Promise.all([
      prisma.renewalExit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true, studentId: true, mobile: true } },
          processedByAdmin: { select: { name: true } },
        },
      }),
      prisma.renewalExit.count({ where }),
    ])

    res.json({ success: true, data: records, pagination: getPaginationMeta(total, page, limit) })
  } catch (err) {
    next(err)
  }
}

export async function processRenewal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { status, notes } = req.body as { status: string; notes?: string }

    const record = await prisma.renewalExit.findUnique({ where: { id } })
    if (!record) throw new ApiError(404, 'Record not found')

    const updated = await prisma.renewalExit.update({
      where: { id },
      data: {
        status,
        notes,
        processedBy: req.user!.id,
        processedAt: new Date(),
      },
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
