import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { generateOutpassNumber } from '../utils/studentId'
import { logger } from '../utils/logger'

// Use raw SQL since Prisma client doesn't have semesterPeriod model yet
export async function getSemesterPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const branchId = (req.query['branchId'] as string) ?? req.user?.branchId
    if (!branchId) throw new ApiError(400, 'branchId required')
    try {
      const periods = await prisma.$queryRawUnsafe(
        `SELECT * FROM semester_periods WHERE branch_id = $1::uuid ORDER BY year DESC, sem_number DESC`,
        branchId
      )
      res.json({ success: true, data: periods })
    } catch {
      // Table doesn't exist yet
      res.json({ success: true, data: [] })
    }
  } catch (err) { next(err) }
}

export async function createSemesterPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branchId, semNumber, year, startDate, endDate, autoOutpass } = req.body as {
      branchId: string; semNumber: number; year: number
      startDate: string; endDate: string; autoOutpass?: boolean
    }
    const adminId = req.user!.id

    if (!branchId || !semNumber || !year || !startDate || !endDate) {
      throw new ApiError(400, 'branchId, semNumber, year, startDate, endDate required')
    }

    // Ensure table exists first
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS semester_periods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES branches(id),
        sem_number INTEGER NOT NULL,
        year INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        auto_outpass BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(branch_id, sem_number, year)
      )
    `).catch(() => {}) // ignore if already exists or timeout

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO semester_periods (branch_id, sem_number, year, start_date, end_date, auto_outpass, created_by)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)
       ON CONFLICT (branch_id, sem_number, year)
       DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
                     auto_outpass = EXCLUDED.auto_outpass, is_active = true
       RETURNING *`,
      branchId, semNumber, year, new Date(startDate), new Date(endDate), autoOutpass ?? false, adminId
    ) as Array<{ id: string; branch_id: string; sem_number: number; year: number; start_date: Date; end_date: Date; auto_outpass: boolean }>

    const period = rows[0]

    if (autoOutpass && period) {
      autoGenerateSemHolidayOutpasses(branchId, {
        semNumber: period.sem_number,
        year: period.year,
        startDate: period.start_date,
        endDate: period.end_date,
      }, adminId).catch(err => logger.warn('Auto outpass generation failed:', err))
    }

    res.json({ success: true, data: period })
  } catch (err) { next(err) }
}

export async function updateSemesterPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { startDate, endDate, autoOutpass, isActive } = req.body as {
      startDate?: string; endDate?: string; autoOutpass?: boolean; isActive?: boolean
    }

    const sets: string[] = []
    const vals: unknown[] = []
    let idx = 1

    if (startDate) { sets.push(`start_date = $${idx++}`); vals.push(new Date(startDate)) }
    if (endDate) { sets.push(`end_date = $${idx++}`); vals.push(new Date(endDate)) }
    if (autoOutpass !== undefined) { sets.push(`auto_outpass = $${idx++}`); vals.push(autoOutpass) }
    if (isActive !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(isActive) }

    if (!sets.length) throw new ApiError(400, 'Nothing to update')

    vals.push(id)
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE semester_periods SET ${sets.join(', ')} WHERE id = $${idx}::uuid RETURNING *`,
      ...vals
    )

    res.json({ success: true, data: (rows as unknown[])[0] })
  } catch (err) { next(err) }
}

export async function triggerSemHolidayOutpasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const adminId = req.user!.id

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM semester_periods WHERE id = $1::uuid`, id
    ) as Array<{ id: string; branch_id: string; sem_number: number; year: number; start_date: Date; end_date: Date }>

    if (!rows.length) throw new ApiError(404, 'Semester period not found')
    const period = rows[0]

    const count = await autoGenerateSemHolidayOutpasses(period.branch_id, {
      semNumber: period.sem_number,
      year: period.year,
      startDate: period.start_date,
      endDate: period.end_date,
    }, adminId)

    res.json({ success: true, message: `Generated ${count} sem holiday outpasses for fee-cleared students`, data: { count } })
  } catch (err) { next(err) }
}

async function autoGenerateSemHolidayOutpasses(
  branchId: string,
  period: { semNumber: number; year: number; startDate: Date; endDate: Date },
  adminId: string
): Promise<number> {
  const students = await prisma.student.findMany({
    where: { status: 'active', room: { branchId } },
    include: {
      invoices: {
        where: { status: { in: ['due', 'overdue', 'partial'] } },
        select: { balance: true },
      },
    },
  })

  const feeCleared = students.filter(s =>
    s.invoices.reduce((sum, inv) => sum + Number(inv.balance), 0) <= 0
  )

  let count = 0
  for (const student of feeCleared) {
    try {
      const existing = await prisma.outpass.findFirst({
        where: {
          studentId: student.id,
          type: 'sem_holiday',
          fromDate: { gte: period.startDate },
          toDate: { lte: period.endDate },
        },
      })
      if (existing) continue

      const outpassNumber = await generateOutpassNumber()
      await prisma.outpass.create({
        data: {
          outpassNumber,
          studentId: student.id,
          type: 'sem_holiday',
          fromDate: period.startDate,
          toDate: period.endDate,
          reason: `Semester ${period.semNumber} (${period.year}) holiday break`,
          destination: 'Home',
          status: 'approved',
          approvedBy: adminId,
          approvalNote: `Auto-approved: Sem ${period.semNumber} holiday. Fee cleared.`,
        },
      })
      count++
    } catch { /* skip individual failures */ }
  }

  return count
}
