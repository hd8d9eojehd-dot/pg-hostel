import { Cashfree } from 'cashfree-pg'
import crypto from 'crypto'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { generateReceiptNumber } from '../utils/studentId'
import { logger } from '../utils/logger'

export interface InitiatePaymentInput {
  invoiceId: string
  studentId: string
  amount: number
  studentName: string
  studentMobile: string
  returnUrl: string
}

export async function initiatePayment(input: InitiatePaymentInput) {
  try {
    const orderId = `PG-${Date.now()}-${input.invoiceId.slice(0, 8)}`

    // Always use production backend URL for webhook (Vercel deployment)
    const notifyUrl = 'https://backend-sim2435s-projects.vercel.app/api/v1/payment/webhook'

    // Sanitize phone — Cashfree requires exactly 10 digits
    const cleanPhone = input.studentMobile.replace(/\D/g, '').replace(/^91/, '').slice(-10)
    const phone = cleanPhone.length === 10 ? cleanPhone : '9999999999'

    logger.info(`Initiating Cashfree payment: orderId=${orderId}, amount=${input.amount}`)

    const orderRequest = {
      order_id: orderId,
      order_amount: Math.round(input.amount * 100) / 100,
      order_currency: 'INR',
      order_note: 'PG Hostel Fee Payment',
      customer_details: {
        customer_id: input.studentId.slice(0, 50), // max 50 chars
        customer_name: input.studentName.slice(0, 100),
        customer_phone: phone,
      },
      order_meta: {
        return_url: `${input.returnUrl}?order_id={order_id}&status={payment_status}`,
        notify_url: notifyUrl,
      },
      order_tags: {
        invoice_id: input.invoiceId,
        student_id: input.studentId,
      },
    }

    const response = await Cashfree.PGCreateOrder('2023-08-01', orderRequest)
    logger.info(`Cashfree order created: ${orderId}, session=${response.data?.payment_session_id}`)

    if (!response.data?.payment_session_id) {
      const errMsg = (response.data as Record<string, unknown>)?.message as string
        ?? (response.data as Record<string, unknown>)?.error as string
        ?? 'Cashfree did not return a payment session. Check credentials and amount.'
      logger.error('Cashfree order creation failed — no session ID', response.data)
      throw new Error(errMsg)
    }

    return {
      orderId,
      paymentSessionId: response.data.payment_session_id,
      orderStatus: response.data.order_status,
    }
  } catch (err) {
    logger.error('initiatePayment failed:', {
      error: (err as Error).message,
      invoiceId: input.invoiceId,
      amount: input.amount,
    })
    throw err
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

  // Notify student via WhatsApp with full context (non-blocking)
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    select: { id: true, name: true, studentId: true, mobile: true },
  })
  // Fetch invoice description
  const invoice = await prisma.invoice.findUnique({
    where: { id: data.invoiceId },
    select: { description: true, type: true },
  })
  if (student) {
    const { notifyOnlinePaymentSuccess } = await import('./notification.service')
    notifyOnlinePaymentSuccess({
      studentDbId: student.id,
      studentName: student.name,
      studentId: student.studentId,
      mobile: student.mobile,
      amount: data.amount,
      receiptNumber,
      paymentId: data.paymentId,
      description: invoice?.description ?? invoice?.type,
    }).catch(() => {})
  }

  return receiptNumber
}
