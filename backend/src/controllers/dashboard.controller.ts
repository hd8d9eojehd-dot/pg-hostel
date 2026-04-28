import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { todayIST } from '../utils/indianTime'
import { addDays } from 'date-fns'

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = todayIST()
    const in7Days = addDays(today, 7)
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Run all counts in parallel — single round trip
    const [
      totalStudents, activeStudents,
      totalRooms, availableRooms,
      overdueInvoices, pendingComplaints,
      pendingOutpasses, expiringStays,
      recentPayments, recentActivity,
      allPayments, thisMonthPayments,
      totalPending,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'active' } }),
      prisma.room.count(),
      prisma.room.count({ where: { status: 'available' } }),
      prisma.invoice.count({ where: { status: 'overdue' } }),
      prisma.complaint.count({ where: { status: { in: ['new', 'assigned', 'in_progress'] } } }),
      prisma.outpass.count({ where: { status: 'pending' } }),
      prisma.student.count({ where: { status: 'active', stayEndDate: { gte: today, lte: in7Days } } }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { name: true, studentId: true, avatarUrl: true } } },
      }),
      prisma.activityLog.findMany({
        where: { actorType: 'admin' },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { name: true, role: true } } },
      }),
      // All payments in last 6 months — single query for monthly chart
      prisma.payment.findMany({
        where: { paidDate: { gte: sixMonthsAgo } },
        select: { paidDate: true, amount: true },
      }),
      // This month total
      prisma.payment.aggregate({
        where: { paidDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Total pending balance
      prisma.invoice.aggregate({
        where: { status: { in: ['due', 'overdue', 'partial'] } },
        _sum: { balance: true },
      }),
    ])

    // Build monthly revenue from single query
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
      const monthNum = d.getMonth()
      const yearNum = d.getFullYear()
      const amount = allPayments
        .filter(p => {
          const pd = new Date(p.paidDate)
          return pd.getMonth() === monthNum && pd.getFullYear() === yearNum
        })
        .reduce((sum, p) => sum + Number(p.amount), 0)
      return { month: d.toLocaleString('default', { month: 'short' }), year: yearNum, amount }
    })

    const totalCollected = allPayments.reduce((s, p) => s + Number(p.amount), 0)

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents, activeStudents,
          totalRooms, availableRooms,
          overdueInvoices, pendingComplaints,
          pendingOutpasses, expiringStays,
          totalCollected,
          thisMonthCollected: Number(thisMonthPayments._sum.amount ?? 0),
          totalPending: Number(totalPending._sum.balance ?? 0),
        },
        monthlyRevenue,
        recentPayments,
        recentActivity,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getOccupancyChart(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rooms = await prisma.room.groupBy({
      by: ['status'],
      _count: true,
    })
    res.json({ success: true, data: rooms })
  } catch (err) {
    next(err)
  }
}
