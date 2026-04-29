import cron from 'node-cron'
import { logger } from '../utils/logger'
import { runRentReminders } from './rentReminder.job'
import { runInvoiceStatusUpdate } from './invoiceStatus.job'
import { runStayExpiryAlerts } from './stayExpiry.job'
import { runMonthlyInvoiceGeneration } from './monthlyInvoice.job'
import { runDuePaymentNotifications } from './dueNotification.job'

export function registerAllJobs(): void {
  // Daily 9:00 AM IST — rent reminders + invoice status
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Running daily morning jobs...')
    await runRentReminders().catch(e => logger.error('rentReminders failed:', e))
    await runInvoiceStatusUpdate().catch(e => logger.error('invoiceStatus failed:', e))
    await runStayExpiryAlerts().catch(e => logger.error('stayExpiry failed:', e))
  }, { timezone: 'Asia/Kolkata' })

  // Daily 6:00 PM IST — due payment notifications to students
  cron.schedule('0 18 * * *', async () => {
    logger.info('🔔 Running evening due payment notifications...')
    await runDuePaymentNotifications().catch(e => logger.error('dueNotifications failed:', e))
  }, { timezone: 'Asia/Kolkata' })

  // Monthly: 1st of each month at 8:00 AM IST
  cron.schedule('0 8 1 * *', async () => {
    logger.info('📅 Running monthly invoice generation...')
    await runMonthlyInvoiceGeneration().catch(e => logger.error('monthlyInvoice failed:', e))
  }, { timezone: 'Asia/Kolkata' })

  logger.info('✅ All cron jobs registered (timezone: Asia/Kolkata)')
}
