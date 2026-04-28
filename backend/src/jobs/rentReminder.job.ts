import { prisma } from '../config/prisma'
import { isDueSoon, isDueToday, isOverdue, formatIST } from '../utils/indianTime'
import { sendWhatsAppMessage, templates } from '../services/whatsapp.service'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export async function runRentReminders(): Promise<void> {
  const pendingInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['due', 'overdue'] } },
    include: {
      student: { select: { name: true, studentId: true, mobile: true, parentMobile: true } },
    },
  })

  for (const invoice of pendingInvoices) {
    const { student } = invoice
    const dueDate = invoice.dueDate
    const amount = Number(invoice.balance).toLocaleString('en-IN')
    const dueDateStr = formatIST(dueDate)

    try {
      if (isDueSoon(dueDate, 7)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentReminder7({ name: student.name, amount, dueDate: dueDateStr, studentId: student.studentId, pgName: env.PG_NAME }),
          studentId: invoice.studentId,
          templateName: 'RENT_REMINDER_7',
        })
      } else if (isDueSoon(dueDate, 3)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentReminder3({ name: student.name, amount, dueDate: dueDateStr, pgName: env.PG_NAME }),
          studentId: invoice.studentId,
          templateName: 'RENT_REMINDER_3',
        })
      } else if (isDueToday(dueDate)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentReminder3({ name: student.name, amount, dueDate: dueDateStr, pgName: env.PG_NAME }),
          studentId: invoice.studentId,
          templateName: 'RENT_DUE_TODAY',
        })
      } else if (isOverdue(dueDate)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentOverdue({ name: student.name, amount, dueDate: dueDateStr, studentId: student.studentId, pgName: env.PG_NAME }),
          studentId: invoice.studentId,
          templateName: 'RENT_OVERDUE',
        })
        if (student.parentMobile) {
          await sendWhatsAppMessage({
            mobile: student.parentMobile,
            message: templates.rentOverdue({ name: student.name, amount, dueDate: dueDateStr, studentId: student.studentId, pgName: env.PG_NAME }),
            studentId: invoice.studentId,
            templateName: 'RENT_OVERDUE_PARENT',
          })
        }
      }
    } catch (err) {
      logger.error(`Reminder failed for student ${student.studentId}:`, err)
    }
  }
}
