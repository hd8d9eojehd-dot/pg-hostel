import { prisma } from '../config/prisma'
import { todayIST, formatIST } from '../utils/indianTime'
import { notifyStayExpiry } from '../services/notification.service'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { addDays } from 'date-fns'

export async function runStayExpiryAlerts(): Promise<void> {
  const today = todayIST()
  const in7Days = addDays(today, 7)

  const expiringStudents = await prisma.student.findMany({
    where: {
      status: 'active',
      stayEndDate: { gte: today, lte: in7Days },
    },
    select: {
      id: true,
      name: true,
      studentId: true,
      mobile: true,
      stayEndDate: true,
    },
  })

  for (const student of expiringStudents) {
    try {
      await notifyStayExpiry({
        studentDbId: student.id,
        studentName: student.name,
        studentId: student.studentId,
        mobile: student.mobile,
        endDate: student.stayEndDate,
      })
    } catch (err) {
      logger.error(`Stay expiry alert failed for ${student.name}:`, err)
    }
  }
}
