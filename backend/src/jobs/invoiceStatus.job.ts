import { prisma } from '../config/prisma'
import { todayIST } from '../utils/indianTime'
import { logger } from '../utils/logger'

export async function runInvoiceStatusUpdate(): Promise<void> {
  const today = todayIST()

  // 1. Mark due invoices as overdue (past due date, grace period respected)
  const overdueResult = await prisma.invoice.updateMany({
    where: { status: 'due', dueDate: { lt: today } },
    data: { status: 'overdue', updatedAt: new Date() },
  })
  logger.info(`Invoice status update: ${overdueResult.count} invoices marked overdue`)

  // 2. Apply late fees to newly overdue invoices based on branch settings
  // Find all overdue invoices that don't yet have a late fee applied today
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'overdue',
      lateFee: 0, // only apply once (first time going overdue)
    },
    include: {
      student: {
        select: {
          room: {
            select: {
              branchId: true,
            },
          },
        },
      },
    },
    take: 500, // process in batches
  })

  let lateFeeApplied = 0
  for (const invoice of overdueInvoices) {
    try {
      const branchId = invoice.student?.room?.branchId
      if (!branchId) continue

      const settings = await prisma.settings.findUnique({
        where: { branchId },
        select: { lateFeeType: true, lateFeeAmount: true, gracePeriodDays: true },
      })
      if (!settings) continue

      const graceDays = settings.gracePeriodDays ?? 0
      const graceCutoff = new Date(invoice.dueDate)
      graceCutoff.setDate(graceCutoff.getDate() + graceDays)

      // Only apply late fee after grace period
      if (today <= graceCutoff) continue

      const lateFeeAmt = settings.lateFeeType === 'percentage'
        ? Math.round(Number(invoice.totalAmount) * (Number(settings.lateFeeAmount) / 100))
        : Number(settings.lateFeeAmount ?? 0)

      if (lateFeeAmt <= 0) continue

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lateFee: lateFeeAmt,
          totalAmount: { increment: lateFeeAmt },
          balance: { increment: lateFeeAmt },
          updatedAt: new Date(),
        },
      })
      lateFeeApplied++
    } catch (err) {
      logger.error(`Late fee application failed for invoice ${invoice.id}:`, err)
    }
  }

  if (lateFeeApplied > 0) {
    logger.info(`Late fees applied to ${lateFeeApplied} invoices`)
  }
}
