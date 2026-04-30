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

// Shared footer
function footer(pgName: string, pgAddress?: string, pgContact?: string): string {
  const lines: string[] = []
  if (pgAddress) lines.push(pgAddress)
  if (pgContact) lines.push(`📞 ${pgContact}`)
  lines.push(`_${pgName}_`)
  return lines.join('\n')
}

// All message templates — NO portal links included
export const templates = {

  admissionWelcome: (data: {
    name: string; pgName: string; pgAddress?: string; pgContact?: string
    studentId: string; password: string; portalUrl: string
    roomNumber: string; bedLabel: string; joiningDate?: string
  }) =>
    `🏠 *Welcome to ${data.pgName}!*\n\n` +
    `Dear *${data.name}*,\n\nYour admission has been confirmed.\n\n` +
    `👤 *Student ID:* ${data.studentId}\n` +
    `🛏️ *Room:* ${data.roomNumber}, Bed ${data.bedLabel}\n` +
    (data.joiningDate ? `📅 *Joining Date:* ${data.joiningDate}\n` : '') +
    `\n🔐 *Login:* ID: ${data.studentId} | Password: ${data.password}\n\n` +
    `Welcome aboard! 🎓\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  admissionWelcomeParent: (data: {
    studentName: string; pgName: string; pgAddress?: string; pgContact?: string
    studentId: string; password: string; portalUrl: string
    roomNumber: string; bedLabel: string; joiningDate?: string
  }) =>
    `🏠 *${data.pgName} — Admission Confirmed*\n\n` +
    `Dear Parent/Guardian,\n\n*${data.studentName}* has been admitted.\n\n` +
    `👤 *Student ID:* ${data.studentId}\n` +
    `🛏️ *Room:* ${data.roomNumber}, Bed ${data.bedLabel}\n` +
    (data.joiningDate ? `📅 *Joining Date:* ${data.joiningDate}\n` : '') +
    `\n🔐 *Login:* ID: ${data.studentId} | Password: ${data.password}\n\n` +
    `Thank you for choosing us! 🙏\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  paymentConfirmed: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; date: string; mode: string
    receiptNumber: string; description?: string; portalUrl?: string
  }) =>
    `✅ *Payment Received — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nPayment recorded successfully.\n\n` +
    `💰 *Amount:* Rs.${data.amount}\n` +
    `📋 *For:* ${data.description ?? 'Fee Payment'}\n` +
    `💳 *Mode:* ${data.mode}\n` +
    `📅 *Date:* ${data.date}\n` +
    `🧾 *Receipt No:* ${data.receiptNumber}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nThank you! 🙏\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  utrSubmittedAdmin: (data: {
    studentName: string; studentId: string; roomNumber?: string
    pgName: string; amount: string; utr: string; mode: string
    invoiceDescription?: string; adminPortalUrl?: string
  }) =>
    `💳 *Payment Verification Required — ${data.pgName}*\n\n` +
    `Student submitted payment for verification.\n\n` +
    `👤 *Student:* ${data.studentName} (${data.studentId})\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `💰 *Amount:* Rs.${data.amount}\n` +
    `📋 *For:* ${data.invoiceDescription ?? 'Fee Payment'}\n` +
    `💳 *Mode:* ${data.mode.toUpperCase()}\n` +
    `🔑 *UTR:* \`${data.utr}\`\n\n` +
    `Please verify in the admin portal.\n\n` +
    `_${data.pgName}_`,

  utrVerified: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; utr: string; receiptNumber: string
    description?: string; portalUrl?: string
  }) =>
    `✅ *Payment Verified — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nPayment verified by admin.\n\n` +
    `💰 *Amount:* Rs.${data.amount}\n` +
    `📋 *For:* ${data.description ?? 'Fee Payment'}\n` +
    `🔑 *UTR:* ${data.utr}\n` +
    `🧾 *Receipt No:* ${data.receiptNumber}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nThank you! 🙏\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  utrRejected: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; utr: string; reason: string; portalUrl?: string
  }) =>
    `❌ *Payment Rejected — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nPayment submission rejected.\n\n` +
    `💰 *Amount:* Rs.${data.amount}\n` +
    `🔑 *UTR:* ${data.utr}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\n⚠️ *Reason:* ${data.reason}\n\n` +
    `Please contact admin or resubmit with correct UTR.\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  onlinePaymentRequest: (data: {
    studentName: string; studentId: string; roomNumber?: string
    pgName: string; amount: string; invoiceDescription?: string; adminPortalUrl?: string
  }) =>
    `🌐 *Online Payment Request — ${data.pgName}*\n\n` +
    `Student initiated online payment.\n\n` +
    `👤 *Student:* ${data.studentName} (${data.studentId})\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `💰 *Amount:* Rs.${data.amount}\n` +
    `📋 *For:* ${data.invoiceDescription ?? 'Fee Payment'}\n` +
    `💳 *Mode:* Online (Cashfree)\n\n` +
    `Payment will be auto-verified on success.\n\n` +
    `_${data.pgName}_`,

  onlinePaymentSuccess: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; receiptNumber: string; paymentId: string
    description?: string; portalUrl?: string
  }) =>
    `✅ *Online Payment Successful — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nOnline payment successful!\n\n` +
    `💰 *Amount:* Rs.${data.amount}\n` +
    `📋 *For:* ${data.description ?? 'Fee Payment'}\n` +
    `🔑 *Payment ID:* ${data.paymentId}\n` +
    `🧾 *Receipt No:* ${data.receiptNumber}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nThank you! 🙏\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  rentReminder7: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; dueDate: string; portalUrl?: string
  }) =>
    `📅 *Fee Reminder — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nFee due in *7 days*.\n\n` +
    `💰 *Amount Due:* Rs.${data.amount}\n` +
    `📅 *Due Date:* ${data.dueDate}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nPlease pay via UPI/Bank Transfer or contact admin.\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  rentReminder3: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; dueDate: string; portalUrl?: string
  }) =>
    `⏰ *Urgent: Fee Due in 3 Days — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nFee due in *3 days*. Pay now to avoid late charges.\n\n` +
    `💰 *Amount Due:* Rs.${data.amount}\n` +
    `📅 *Due Date:* ${data.dueDate}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nPlease pay via UPI/Bank Transfer or contact admin.\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  rentOverdue: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    amount: string; dueDate: string; portalUrl?: string
  }) =>
    `🔴 *Payment Overdue — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nPayment is *overdue*. Pay immediately.\n\n` +
    `💰 *Amount Overdue:* Rs.${data.amount}\n` +
    `📅 *Was Due On:* ${data.dueDate}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nContact admin if you need assistance.\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  complaintResolved: (data: {
    name: string; studentId: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    complaintId: string; category: string; note: string
  }) =>
    `✅ *Complaint Resolved — ${data.pgName}*\n\n` +
    `Dear *${data.name}* (${data.studentId}),\n\nYour complaint has been resolved.\n\n` +
    `🔖 *Complaint ID:* ${data.complaintId}\n` +
    `📂 *Category:* ${data.category}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\n📝 *Resolution Note:*\n${data.note}\n\n` +
    `If the issue persists, please raise a new complaint.\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  stayExpiry: (data: {
    name: string; studentId?: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    endDate: string; portalUrl?: string
  }) =>
    `📅 *Stay Expiry Alert — ${data.pgName}*\n\n` +
    `Dear *${data.name}*${data.studentId ? ` (${data.studentId})` : ''},\n\nYour stay is expiring soon.\n\n` +
    `📅 *Stay Ends On:* ${data.endDate}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    `\nPlease contact admin for renewal options.\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  noticeAlert: (data: {
    title: string; description: string; date: string
    pgName: string; pgAddress?: string; pgContact?: string
    category?: string; priority?: string; portalUrl?: string
  }) =>
    `📢 *Notice — ${data.pgName}*\n\n` +
    (data.priority === 'urgent' ? `🚨 *URGENT*\n\n` : '') +
    `*${data.title}*\n\n${data.description}\n\n` +
    (data.category ? `📂 Category: ${data.category}\n` : '') +
    `📅 Posted: ${data.date}\n\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  outpassStatus: (data: {
    name: string; studentId?: string; roomNumber?: string
    pgName: string; pgAddress?: string; pgContact?: string
    dates: string; status: string; note?: string; portalUrl?: string
  }) =>
    `🚪 *Outpass ${data.status === 'approved' ? 'Approved ✅' : data.status === 'rejected' ? 'Rejected ❌' : data.status} — ${data.pgName}*\n\n` +
    `Dear *${data.name}*${data.studentId ? ` (${data.studentId})` : ''},\n\n` +
    `Your outpass request has been *${data.status}*.\n\n` +
    `📅 *Dates:* ${data.dates}\n` +
    (data.roomNumber ? `🛏️ *Room:* ${data.roomNumber}\n` : '') +
    (data.note ? `\n📝 *Admin Note:* ${data.note}\n` : '') +
    `\n` +
    footer(data.pgName, data.pgAddress, data.pgContact),

  passwordResetOtp: (data: {
    otp: string; pgName: string; pgContact?: string
  }) =>
    `🔐 *Password Reset OTP — ${data.pgName}*\n\n` +
    `Your OTP for password reset is:\n\n*${data.otp}*\n\n` +
    `⏱️ Valid for 5 minutes. Do not share.\n\n` +
    (data.pgContact ? `📞 ${data.pgContact}\n` : '') +
    `_${data.pgName}_`,
}
