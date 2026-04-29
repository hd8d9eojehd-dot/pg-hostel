import { prisma } from '../config/prisma'
import { isDueSoon, isDueToday, isOverdue, formatIST } from '../utils/indianTime'
import { sendWhatsAppMessage, templates } from '../services/whatsapp.service'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export async function runRentReminders(): Promise<void> {
  const pendingInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['due', 'overdue'] } },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
          mobile: true,
          parentMobile: true,
          room: {
            select: {
              roomNumber: true,
              branch: {
                select: { name: true, address: true, city: true, state: true, contactPrimary: true },
              },
            },
          },
        },
      },
    },
  })

  for (const invoice of pendingInvoices) {
    const { student } = invoice
    const dueDate = invoice.dueDate
    const amount = Number(invoice.balance).toLocaleString('en-IN')
    const dueDateStr = formatIST(dueDate)

    // Build PG context from student's branch
    const branch = student.room?.branch
    const pgName = branch?.name ?? env.PG_NAME
    const pgAddressParts = [branch?.address, branch?.city, branch?.state].filter(Boolean)
    const pgAddress = pgAddressParts.length > 0 ? pgAddressParts.join(', ') : undefined
    const pgContact = branch?.contactPrimary ?? undefined
    const roomNumber = student.room?.roomNumber

    const baseData = {
      name: student.name,
      studentId: student.studentId,
      roomNumber,
      pgName,
      pgAddress,
      pgContact,
      amount,
      dueDate: dueDateStr,
      portalUrl: env.STUDENT_PORTAL_URL,
    }

    try {
      if (isDueSoon(dueDate, 7)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentReminder7(baseData),
          studentId: invoice.studentId,
          templateName: 'RENT_REMINDER_7',
        })
      } else if (isDueSoon(dueDate, 3)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentReminder3(baseData),
          studentId: invoice.studentId,
          templateName: 'RENT_REMINDER_3',
        })
      } else if (isDueToday(dueDate)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentReminder3(baseData),
          studentId: invoice.studentId,
          templateName: 'RENT_DUE_TODAY',
        })
      } else if (isOverdue(dueDate)) {
        await sendWhatsAppMessage({
          mobile: student.mobile,
          message: templates.rentOverdue(baseData),
          studentId: invoice.studentId,
          templateName: 'RENT_OVERDUE',
        })
        // Also notify parent
        if (student.parentMobile) {
          await sendWhatsAppMessage({
            mobile: student.parentMobile,
            message: templates.rentOverdue(baseData),
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
