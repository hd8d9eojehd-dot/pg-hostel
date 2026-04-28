import { isWhatsAppReady } from '../config/whatsapp'
import { prisma } from '../config/prisma'
import { logger } from '../utils/logger'

function toWaId(mobile: string): string {
  const cleaned = mobile.replace(/\D/g, '')
  const withCountry = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  return `${withCountry}@c.us`
}

interface SendMessageOptions {
  mobile: string
  message: string
  studentId?: string
  templateName?: string
}

export async function sendWhatsAppMessage(opts: SendMessageOptions): Promise<void> {
  const { mobile, message, studentId, templateName = 'custom' } = opts

  const log = await prisma.whatsappLog.create({
    data: {
      recipientMobile: mobile,
      studentId: studentId ?? null,
      templateName,
      messageBody: message,
      status: 'queued',
    },
  })

  if (!isWhatsAppReady()) {
    logger.warn(`WhatsApp not ready. Message queued for ${mobile}`)
    await prisma.whatsappLog.update({
      where: { id: log.id },
      data: { status: 'failed', errorMessage: 'WhatsApp client not ready' },
    })
    return
  }

  try {
    const { getWhatsAppClient } = await import('../config/whatsapp')
    const client = getWhatsAppClient() as { sendMessage: (id: string, msg: string) => Promise<{ id: { id: string } }> }
    const waId = toWaId(mobile)
    const sentMsg = await client.sendMessage(waId, message)
    await prisma.whatsappLog.update({
      where: { id: log.id },
      data: { status: 'sent', waMessageId: sentMsg.id.id },
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error(`WhatsApp send failed to ${mobile}:`, errMsg)
    await prisma.whatsappLog.update({
      where: { id: log.id },
      data: { status: 'failed', errorMessage: errMsg },
    })
  }
}

export async function sendBulkWhatsApp(
  messages: SendMessageOptions[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (const msg of messages) {
    try {
      await sendWhatsAppMessage(msg)
      sent++
      await new Promise(r => setTimeout(r, 2000))
    } catch {
      failed++
    }
  }
  return { sent, failed }
}

export const templates = {
  admissionWelcome: (data: {
    name: string; pgName: string; studentId: string
    password: string; portalUrl: string; roomNumber: string; bedLabel: string
  }) =>
    `🏠 *Welcome to ${data.pgName}!*\n\nDear ${data.name},\n\nYour admission is confirmed.\n\n*Student ID:* ${data.studentId}\n*Room:* ${data.roomNumber}, Bed ${data.bedLabel}\n*Portal:* ${data.portalUrl}\n*Password:* ${data.password}\n\n_Please login and change your password on first login._\n\nWelcome! 🎓`,

  rentReminder7: (data: { name: string; amount: string; dueDate: string; studentId: string; pgName: string }) =>
    `📅 *Rent Reminder*\n\nDear ${data.name} (${data.studentId}),\n\nYour rent of *₹${data.amount}* is due on *${data.dueDate}* (7 days remaining).\n\nLogin to portal to pay online.\n\n_${data.pgName}_`,

  rentReminder3: (data: { name: string; amount: string; dueDate: string; pgName: string }) =>
    `⏰ *Urgent: Rent Due in 3 Days*\n\nDear ${data.name},\n\nRent of *₹${data.amount}* due on *${data.dueDate}*.\n\nPlease pay now to avoid late fee.\n\n_${data.pgName}_`,

  rentOverdue: (data: { name: string; amount: string; dueDate: string; studentId: string; pgName: string }) =>
    `🔴 *Payment Overdue*\n\nDear ${data.name} (${data.studentId}),\n\nYour payment of *₹${data.amount}* was due on ${data.dueDate} and is now *overdue*.\n\nPlease pay immediately or contact admin.\n\n_${data.pgName}_`,

  paymentConfirmed: (data: { name: string; amount: string; date: string; mode: string; receiptNumber: string; pgName: string }) =>
    `✅ *Payment Received*\n\nDear ${data.name},\n\n₹${data.amount} received on ${data.date} via ${data.mode}.\n*Receipt:* ${data.receiptNumber}\n\nThank you! 🙏\n_${data.pgName}_`,

  complaintResolved: (data: { name: string; complaintId: string; category: string; note: string; pgName: string }) =>
    `✅ *Complaint Resolved*\n\nDear ${data.name},\n\nYour complaint #${data.complaintId} (${data.category}) has been *resolved*.\n\n_Note: ${data.note}_\n\n_${data.pgName}_`,

  stayExpiry: (data: { name: string; endDate: string; pgName: string }) =>
    `📅 *Stay Expiry Alert*\n\nDear ${data.name},\n\nYour stay at *${data.pgName}* expires on *${data.endDate}*.\n\nPlease contact admin for renewal options. 🏠`,

  noticeAlert: (data: { title: string; description: string; date: string; pgName: string }) =>
    `📢 *${data.pgName} Notice*\n\n*${data.title}*\n\n${data.description}\n\n_Posted: ${data.date}_`,

  outpassStatus: (data: { name: string; dates: string; status: string; note?: string; pgName: string }) =>
    `🚪 *Outpass ${data.status}*\n\nDear ${data.name},\n\nYour outpass request for ${data.dates} has been *${data.status}*.${data.note ? `\n\n_Note: ${data.note}_` : ''}\n\n_${data.pgName}_`,
}
