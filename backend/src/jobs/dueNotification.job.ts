import { prisma } from '../config/prisma'
import { sendWhatsAppMessage, templates } from '../services/whatsapp.service'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { formatIST } from '../utils/indianTime'

export async function runDuePaymentNotifications(): Promise<void> {
  // Find all active students with due/overdue invoices — include branch for PG context
  const students = await prisma.student.findMany({
    where: {
      status: 'active',
      invoices: {
        some: { status: { in: ['due', 'overdue', 'partial'] } },
      },
    },
    include: {
      invoices: {
        where: { status: { in: ['due', 'overdue', 'partial'] } },
        select: { balance: true, status: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
        take: 1, // earliest due invoice for due date display
      },
      room: {
        select: {
          roomNumber: true,
          branch: {
            select: { name: true, address: true, city: true, state: true, contactPrimary: true },
          },
        },
      },
    },
  })

  let sent = 0
  for (const student of students) {
    try {
      const totalDue = student.invoices.reduce((s, i) => s + Number(i.balance), 0)
      const hasOverdue = student.invoices.some(i => i.status === 'overdue')
      const earliestInvoice = student.invoices[0]

      // Build PG context
      const branch = student.room?.branch
      const pgName = branch?.name ?? env.PG_NAME
      const pgAddressParts = [branch?.address, branch?.city, branch?.state].filter(Boolean)
      const pgAddress = pgAddressParts.length > 0 ? pgAddressParts.join(', ') : undefined
      const pgContact = branch?.contactPrimary ?? undefined
      const roomNumber = student.room?.roomNumber
      const dueDate = earliestInvoice?.dueDate ? formatIST(earliestInvoice.dueDate) : 'N/A'

      const baseData = {
        name: student.name,
        studentId: student.studentId,
        roomNumber,
        pgName,
        pgAddress,
        pgContact,
        amount: totalDue.toLocaleString('en-IN'),
        dueDate,
        portalUrl: env.STUDENT_PORTAL_URL,
      }

      const msg = hasOverdue
        ? templates.rentOverdue(baseData)
        : templates.rentReminder3(baseData)

      await sendWhatsAppMessage({
        mobile: student.mobile,
        message: msg,
        studentId: student.id,
        templateName: hasOverdue ? 'PAYMENT_OVERDUE_EVENING' : 'PAYMENT_DUE_EVENING',
      })
      sent++
      await new Promise(r => setTimeout(r, 1500)) // rate limit
    } catch (e) {
      logger.error(`Due notification failed for ${student.name}:`, e)
    }
  }

  logger.info(`✅ Due payment notifications sent to ${sent}/${students.length} students`)
}
