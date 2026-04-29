import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { sendBulkWhatsApp } from '../services/whatsapp.service'
import { notifyNotice } from '../services/notification.service'
import { formatIST } from '../utils/indianTime'
import { env } from '../config/env'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'
import type { CreateNoticeInput, UpdateNoticeInput } from '@pg-hostel/shared'

export async function createNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateNoticeInput
    const notice = await prisma.notice.create({
      data: {
        ...input,
        createdBy: req.user!.id,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      },
    })
    res.status(201).json({ success: true, data: notice })
  } catch (err) {
    next(err)
  }
}

export async function getNotices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const skip = getSkip(page, limit)
    const where: Record<string, unknown> = {}

    if (req.query['category']) where['category'] = req.query['category']
    if (req.query['isPublished'] !== undefined) where['isPublished'] = req.query['isPublished'] === 'true'
    if (req.user?.type === 'student') where['isPublished'] = true

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdByAdmin: { select: { name: true } } },
      }),
      prisma.notice.count({ where }),
    ])

    res.json({ success: true, data: notices, pagination: getPaginationMeta(total, page, limit) })
  } catch (err) {
    next(err)
  }
}

export async function getNoticeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notice = await prisma.notice.findUnique({
      where: { id: req.params['id']! },
      include: { createdByAdmin: { select: { name: true } } },
    })
    if (!notice) throw new ApiError(404, 'Notice not found')
    res.json({ success: true, data: notice })
  } catch (err) {
    next(err)
  }
}

export async function updateNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as UpdateNoticeInput
    const notice = await prisma.notice.update({
      where: { id: req.params['id']! },
      data: {
        ...input,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        updatedAt: new Date(),
      },
    })
    res.json({ success: true, data: notice })
  } catch (err) {
    next(err)
  }
}

export async function publishNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notice = await prisma.notice.update({
      where: { id: req.params['id']! },
      data: { isPublished: true, publishedAt: new Date(), updatedAt: new Date() },
    })
    res.json({ success: true, message: 'Notice published', data: notice })
  } catch (err) {
    next(err)
  }
}

export async function sendNoticeWhatsApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notice = await prisma.notice.findUnique({ where: { id: req.params['id']! } })
    if (!notice) throw new ApiError(404, 'Notice not found')
    if (!notice.isPublished) throw new ApiError(400, 'Publish the notice before sending via WhatsApp')

    const students = await prisma.student.findMany({
      where: { status: 'active' },
      select: { id: true, mobile: true, room: { select: { branchId: true } } },
    })

    // Group by branchId so each student gets the right PG name
    let sent = 0
    let failed = 0
    for (const student of students) {
      try {
        await notifyNotice({
          studentDbId: student.id,
          mobile: student.mobile,
          title: notice.title,
          description: notice.description,
          date: notice.createdAt,
          category: notice.category,
          priority: notice.priority,
          branchId: student.room?.branchId ?? undefined,
        })
        sent++
        await new Promise(r => setTimeout(r, 2000)) // rate limit
      } catch {
        failed++
      }
    }

    await prisma.notice.update({
      where: { id: req.params['id']! },
      data: { whatsappSent: true, whatsappSentAt: new Date() },
    })

    res.json({ success: true, message: `Sent to ${sent} students`, data: { sent, failed } })
  } catch (err) {
    next(err)
  }
}

export async function deleteNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.notice.delete({ where: { id: req.params['id']! } })
    res.json({ success: true, message: 'Notice deleted' })
  } catch (err) {
    next(err)
  }
}
