import { prisma } from '../config/prisma'
import { todayIST } from '../utils/indianTime'
import { generateInvoiceNumber } from '../utils/studentId'
import { logger } from '../utils/logger'
import { addDays } from 'date-fns'

export async function runMonthlyInvoiceGeneration(): Promise<void> {
  const settings = await prisma.settings.findFirst({ where: { autoInvoiceEnabled: true } })
  if (!settings) {
    logger.info('Auto invoice disabled. Skipping.')
    return
  }

  const today = todayIST()
  const dueDate = addDays(today, settings.gracePeriodDays)

  const activeStudents = await prisma.student.findMany({
    where: { status: 'active', rentPackage: 'monthly' },
    include: { room: true },
  })

  let created = 0
  for (const student of activeStudents) {
    try {
      // Check if invoice already exists for this month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const existing = await prisma.invoice.findFirst({
        where: {
          studentId: student.id,
          type: 'rent',
          generatedDate: { gte: startOfMonth },
        },
      })
      if (existing) continue

      const rent = student.room?.monthlyRent
      if (!rent) continue

      const invoiceNumber = await generateInvoiceNumber()
      const amount = Number(rent)
      const lateFee = 0
      const discount = 0
      const totalAmount = amount + lateFee - discount

      await prisma.invoice.create({
        data: {
          studentId: student.id,
          invoiceNumber,
          type: 'rent',
          description: `Monthly rent - ${today.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          amount,
          lateFee,
          discount,
          totalAmount,
          balance: totalAmount,
          dueDate,
          status: 'due',
        },
      })
      created++
    } catch (err) {
      logger.error(`Monthly invoice failed for student ${student.studentId}:`, err)
    }
  }

  logger.info(`Monthly invoices generated: ${created}`)
}
