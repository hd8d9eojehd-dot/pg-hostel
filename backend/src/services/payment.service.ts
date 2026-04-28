import { Cashfree } from 'cashfree-pg'
import crypto from 'crypto'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { generateReceiptNumber } from '../utils/studentId'

export interface InitiatePaymentInput {
  invoiceId: string
  studentId: string
  amount: number
  studentName: string
  studentMobile: string
  returnUrl: string
}

export async function initiatePayment(input: InitiatePaymentInput) {
  const orderId = `PG-${Date.now()}-${input.invoiceId.slice(0, 8)}`

  const orderRequest = {
    order_id: orderId,
    order_amount: input.amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: input.studentId,
      customer_name: input.studentName,
      customer_phone: input.studentMobile,
    },
    order_meta: {
      return_url: `${input.returnUrl}?order_id={order_id}&status={payment_status}`,
      notify_url: `${env.RECEIPT_BASE_URL.replace('/api/v1/finance/receipts', '')}/api/v1/payment/webhook`,
    },
    order_tags: {
      invoice_id: input.invoiceId,
      student_id: input.studentId,
    },
  }

  const response = await Cashfree.PGCreateOrder('2023-08-01', orderRequest)
  return {
    orderId,
    paymentSessionId: response.data?.payment_session_id,
    orderStatus: response.data?.order_status,
  }
}

export function verifyCashfreeWebhook(
  payload: string,
  timestamp: string,
  signature: string
): boolean {
  const signedPayload = `${timestamp}${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', env.CASHFREE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('base64')
  return expectedSignature === signature
}

export async function processSuccessfulPayment(data: {
  orderId: string
  paymentId: string
  invoiceId: string
  studentId: string
  amount: number
}): Promise<string> {
  const receiptNumber = await generateReceiptNumber()

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: data.invoiceId,
        studentId: data.studentId,
        receiptNumber,
        amount: data.amount,
        paymentMode: 'online',
        transactionRef: data.paymentId,
        utrVerified: true, // online payments are auto-verified
        paidDate: new Date(),
        cashfreeOrderId: data.orderId,
        cashfreePaymentId: data.paymentId,
        cashfreeStatus: 'SUCCESS',
        notes: `Cashfree payment verified. Order: ${data.orderId}`,
      },
    })

    const invoice = await tx.invoice.findUnique({
      where: { id: data.invoiceId },
      select: { totalAmount: true, paidAmount: true },
    })

    if (invoice) {
      const newPaid = Number(invoice.paidAmount) + data.amount
      const newBalance = Number(invoice.totalAmount) - newPaid
      const newStatus = newBalance <= 0 ? 'paid' : 'partial'
      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: { paidAmount: newPaid, balance: Math.max(0, newBalance), status: newStatus, updatedAt: new Date() },
      })
    }
  })

  // Notify student via WhatsApp (non-blocking)
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    select: { name: true, mobile: true },
  })
  if (student) {
    const { sendWhatsAppMessage } = await import('../config/whatsapp')
    sendWhatsAppMessage(
      student.mobile,
      `✅ *Payment Successful!*\n\nAmount: ₹${data.amount.toLocaleString('en-IN')}\nReceipt: ${receiptNumber}\nPayment ID: ${data.paymentId}\n\nThank you, ${student.name}! 🙏`
    ).catch(() => {})
  }

  return receiptNumber
}
