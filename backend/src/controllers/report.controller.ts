import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { todayIST } from '../utils/indianTime'
import {
  toCSV,
  getOccupancyReportData,
  getRevenueReportData,
  getDefaultersReportData,
  getStudentReportData,
} from '../services/report.service'

export async function occupancyReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        beds: { include: { student: { select: { name: true, studentId: true, status: true } } } },
        floor: true,
      },
      orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }],
    })
    res.json({ success: true, data: rooms })
  } catch (err) {
    next(err)
  }
}

export async function revenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = req.query as { month: string; year: string }
    const start = new Date(parseInt(year), parseInt(month) - 1, 1)
    const end = new Date(parseInt(year), parseInt(month), 0)

    const [payments, invoices] = await Promise.all([
      prisma.payment.findMany({
        where: { paidDate: { gte: start, lte: end } },
        include: { student: { select: { name: true, studentId: true } }, invoice: { select: { type: true } } },
      }),
      prisma.invoice.findMany({
        where: { dueDate: { gte: start, lte: end } },
        include: { student: { select: { name: true, studentId: true } } },
      }),
    ])

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalDue = invoices.reduce((sum, i) => sum + Number(i.balance), 0)

    res.json({ success: true, data: { payments, invoices, totalCollected, totalDue } })
  } catch (err) {
    next(err)
  }
}

export async function defaultersReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defaulters = await prisma.invoice.findMany({
      where: { status: { in: ['overdue', 'due'] } },
      include: {
        student: {
          select: {
            name: true, studentId: true, mobile: true, parentMobile: true,
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })
    res.json({ success: true, data: defaulters })
  } catch (err) {
    next(err)
  }
}

export async function stayExpiryReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = todayIST()
    const in30Days = new Date(today)
    in30Days.setDate(in30Days.getDate() + 30)

    const students = await prisma.student.findMany({
      where: { status: 'active', stayEndDate: { gte: today, lte: in30Days } },
      include: {
        room: { select: { roomNumber: true } },
        bed: { select: { bedLabel: true } },
      },
      orderBy: { stayEndDate: 'asc' },
    })
    res.json({ success: true, data: students })
  } catch (err) {
    next(err)
  }
}

export async function complaintReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [byStatus, byCategory, avgResolutionTime] = await Promise.all([
      prisma.complaint.groupBy({ by: ['status'], _count: true }),
      prisma.complaint.groupBy({ by: ['category'], _count: true }),
      prisma.complaint.findMany({
        where: { status: 'resolved', resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ])

    const avgHours = avgResolutionTime.length
      ? avgResolutionTime.reduce((sum, c) => {
          const diff = (c.resolvedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60)
          return sum + diff
        }, 0) / avgResolutionTime.length
      : 0

    res.json({ success: true, data: { byStatus, byCategory, avgResolutionHours: Math.round(avgHours) } })
  } catch (err) {
    next(err)
  }
}

export async function studentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const students = await prisma.student.findMany({
      include: {
        room: { select: { roomNumber: true, roomType: true } },
        bed: { select: { bedLabel: true } },
        invoices: { where: { status: { in: ['due', 'overdue'] } }, select: { balance: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: students })
  } catch (err) {
    next(err)
  }
}

export async function exportOccupancyCSV(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, headers } = await getOccupancyReportData()
    const csv = toCSV(rows, headers)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="occupancy-report.csv"')
    res.send(csv)
  } catch (err) { next(err) }
}

export async function exportRevenueCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = req.query as { month: string; year: string }
    const { rows, headers } = await getRevenueReportData(parseInt(month), parseInt(year))
    const csv = toCSV(rows, headers)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="revenue-${year}-${month}.csv"`)
    res.send(csv)
  } catch (err) { next(err) }
}

export async function exportDefaultersCSV(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, headers } = await getDefaultersReportData()
    const csv = toCSV(rows, headers)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="defaulters-report.csv"')
    res.send(csv)
  } catch (err) { next(err) }
}

export async function exportStudentsCSV(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, headers } = await getStudentReportData()
    const csv = toCSV(rows, headers)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="students-report.csv"')
    res.send(csv)
  } catch (err) { next(err) }
}
