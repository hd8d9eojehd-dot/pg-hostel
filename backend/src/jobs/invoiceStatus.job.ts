import { prisma } from '../config/prisma'
import { todayIST } from '../utils/indianTime'
import { logger } from '../utils/logger'

export async function runInvoiceStatusUpdate(): Promise<void> {
  const today = todayIST()
  const result = await prisma.invoice.updateMany({
    where: { status: 'due', dueDate: { lt: today } },
    data: { status: 'overdue', updatedAt: new Date() },
  })
  logger.info(`Invoice status update: ${result.count} invoices marked overdue`)
}
