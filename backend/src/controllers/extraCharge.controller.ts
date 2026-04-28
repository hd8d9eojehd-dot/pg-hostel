import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { z } from 'zod'

const CreateExtraChargeSchema = z.object({
  studentId: z.string().uuid(),
  type: z.string().min(2).max(50),
  description: z.string().min(3).max(500),
  amount: z.number().positive(),
  chargeDate: z.string().date().optional(),
})

export async function createExtraCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateExtraChargeSchema.parse(req.body)

    const student = await prisma.student.findUnique({ where: { id: input.studentId } })
    if (!student) throw new ApiError(404, 'Student not found')

    const charge = await prisma.extraCharge.create({
      data: {
        studentId: input.studentId,
        type: input.type,
        description: input.description,
        amount: input.amount,
        chargeDate: input.chargeDate ? new Date(input.chargeDate) : new Date(),
        addedBy: req.user!.id,
      },
    })

    res.status(201).json({ success: true, data: charge })
  } catch (err) {
    next(err)
  }
}

export async function getExtraCharges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.query as { studentId?: string }
    const where: Record<string, unknown> = {}
    if (studentId) where['studentId'] = studentId

    const charges = await prisma.extraCharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { name: true, studentId: true } } },
    })

    res.json({ success: true, data: charges })
  } catch (err) {
    next(err)
  }
}
