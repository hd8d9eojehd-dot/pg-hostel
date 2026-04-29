import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { generateOutpassNumber } from '../utils/studentId'
import { notifyOutpassStatus } from '../services/notification.service'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'
import type { CreateOutpassInput, ApproveOutpassInput, RejectOutpassInput } from '@pg-hostel/shared'

export async function createOutpass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!
    const input = req.body as CreateOutpassInput

    const studentId = user.type === 'student' ? user.id : (req.body as { studentId: string }).studentId
    const outpassNumber = await generateOutpassNumber()

    const outpass = await prisma.outpass.create({
      data: {
        outpassNumber,
        studentId,
        type: input.type,
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        fromTime: input.fromTime,
        toTime: input.toTime,
        reason: input.reason,
        destination: input.destination,
        contactAtDestination: input.contactAtDestination,
        status: 'pending',
      },
    })

    res.status(201).json({ success: true, message: 'Outpass request submitted', data: outpass })
  } catch (err) {
    next(err)
  }
}

export async function getOutpasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const skip = getSkip(page, limit)
    const where: Record<string, unknown> = {}

    if (req.query['status']) where['status'] = req.query['status']
    if (req.query['type']) where['type'] = req.query['type']
    if (req.user?.type === 'student') where['studentId'] = req.user.id

    const [outpasses, total] = await Promise.all([
      prisma.outpass.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true, studentId: true, mobile: true } },
          approvedByAdmin: { select: { name: true } },
        },
      }),
      prisma.outpass.count({ where }),
    ])

    res.json({ success: true, data: outpasses, pagination: getPaginationMeta(total, page, limit) })
  } catch (err) {
    next(err)
  }
}

export async function getOutpassById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const outpass = await prisma.outpass.findUnique({
      where: { id: req.params['id']! },
      include: {
        student: { select: { name: true, studentId: true, mobile: true } },
        approvedByAdmin: { select: { name: true } },
      },
    })
    if (!outpass) throw new ApiError(404, 'Outpass not found')
    res.json({ success: true, data: outpass })
  } catch (err) {
    next(err)
  }
}

export async function approveOutpass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { note } = req.body as ApproveOutpassInput
    const outpass = await prisma.outpass.findUnique({
      where: { id: req.params['id']! },
      include: { student: { select: { id: true, name: true, studentId: true, mobile: true } } },
    })
    if (!outpass) throw new ApiError(404, 'Outpass not found')
    if (outpass.status !== 'pending') throw new ApiError(400, 'Outpass is not pending')

    const updated = await prisma.outpass.update({
      where: { id: req.params['id']! },
      data: { status: 'approved', approvedBy: req.user!.id, approvalNote: note, updatedAt: new Date() },
    })

    notifyOutpassStatus({
      studentDbId: outpass.student.id,
      studentName: outpass.student.name,
      studentId: outpass.student.studentId,
      mobile: outpass.student.mobile,
      fromDate: outpass.fromDate,
      toDate: outpass.toDate,
      status: 'approved',
      note,
    }).catch(() => { /* non-blocking */ })

    res.json({ success: true, message: 'Outpass approved', data: updated })
  } catch (err) {
    next(err)
  }
}

export async function rejectOutpass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { note } = req.body as RejectOutpassInput
    const outpass = await prisma.outpass.findUnique({
      where: { id: req.params['id']! },
      include: { student: { select: { id: true, name: true, studentId: true, mobile: true } } },
    })
    if (!outpass) throw new ApiError(404, 'Outpass not found')
    if (outpass.status !== 'pending') throw new ApiError(400, 'Outpass is not pending')

    const updated = await prisma.outpass.update({
      where: { id: req.params['id']! },
      data: { status: 'rejected', approvedBy: req.user!.id, approvalNote: note, updatedAt: new Date() },
    })

    notifyOutpassStatus({
      studentDbId: outpass.student.id,
      studentName: outpass.student.name,
      studentId: outpass.student.studentId,
      mobile: outpass.student.mobile,
      fromDate: outpass.fromDate,
      toDate: outpass.toDate,
      status: 'rejected',
      note,
    }).catch(() => { /* non-blocking */ })

    res.json({ success: true, message: 'Outpass rejected', data: updated })
  } catch (err) {
    next(err)
  }
}

export async function confirmReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const outpass = await prisma.outpass.findUnique({ where: { id: req.params['id']! } })
    if (!outpass) throw new ApiError(404, 'Outpass not found')
    if (outpass.status !== 'approved') throw new ApiError(400, 'Outpass is not approved')

    const updated = await prisma.outpass.update({
      where: { id: req.params['id']! },
      data: {
        status: 'returned',
        returnConfirmedAt: new Date(),
        returnConfirmedBy: req.user!.id,
        updatedAt: new Date(),
      },
    })

    res.json({ success: true, message: 'Return confirmed', data: updated })
  } catch (err) {
    next(err)
  }
}
