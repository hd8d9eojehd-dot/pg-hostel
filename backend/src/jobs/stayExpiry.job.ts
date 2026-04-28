import { prisma } from '../config/prisma'
import { todayIST, formatIST } from '../utils/indianTime'
import { sendWhatsAppMessage, templates } from '../services/whatsapp.service'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { addDays } from 'date-fns'

export async function runStayExpiryAlerts(): Promise<void> {
  const today = todayIST()
  const in7Days = addDays(today, 7)
  const in3Days = addDays(today, 3)

  const expiringStudents = await prisma.student.findMany({
    where: {
      status: 'active',
      stayEndDate: { gte: today, lte: in7Days },
    },
    select: { name: true, mobile: true, stayEndDate: true },
  })

  for (const student of expiringStudents) {
    try {
      await sendWhatsAppMessage({
        mobile: student.mobile,
        message: templates.stayExpiry({
          name: student.name,
          endDate: formatIST(student.stayEndDate),
          pgName: env.PG_NAME,
        }),
        templateName: 'STAY_EXPIRY',
      })
    } catch (err) {
      logger.error(`Stay expiry alert failed for ${student.name}:`, err)
    }
  }

  logger.info(`Stay expiry alerts sent to ${expiringStudents.length} students`)
}
