import { Request, Response, NextFunction } from 'express'
import { initiatePayment, verifyCashfreeWebhook, processSuccessfulPayment } from '../services/payment.service'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export async function initiateOnlinePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { invoiceId, returnUrl } = req.body as { invoiceId: string; returnUrl: string }
    const user = req.user!

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: { select: { name: true, mobile: true } } },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    if (invoice.status === 'paid') throw new ApiError(400, 'Invoice already paid')

    const result = await initiatePayment({
      invoiceId,
      studentId: invoice.studentId,
      amount: Number(invoice.balance),
      studentName: invoice.student.name,
      studentMobile: invoice.student.mobile,
      returnUrl,
    })

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function cashfreeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-webhook-signature'] as string
    const timestamp = req.headers['x-webhook-timestamp'] as string
    const payload = JSON.stringify(req.body)

    if (!verifyCashfreeWebhook(payload, timestamp, signature)) {
      logger.warn('Invalid Cashfree webhook signature')
      res.status(400).json({ success: false, error: 'Invalid signature' })
      return
    }

    const { data } = req.body as {
      data: {
        order: { order_id: string; order_tags: { invoice_id: string; student_id: string } }
        payment: { cf_payment_id: string; payment_amount: number; payment_status: string }
      }
    }

    if (data.payment.payment_status === 'SUCCESS') {
      const receiptNumber = await processSuccessfulPayment({
        orderId: data.order.order_id,
        paymentId: String(data.payment.cf_payment_id),
        invoiceId: data.order.order_tags.invoice_id,
        studentId: data.order.order_tags.student_id,
        amount: data.payment.payment_amount,
      })
      logger.info(`Payment processed: ${receiptNumber}`)
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.query['studentId'] as string ?? req.user?.id
    const payments = await prisma.payment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { type: true, description: true } } },
    })
    res.json({ success: true, data: payments })
  } catch (err) {
    next(err)
  }
}

export async function verifyPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.body as { orderId: string }
    if (!orderId) throw new ApiError(400, 'orderId required')

    // Find payment by cashfree order ID
    const payment = await prisma.payment.findFirst({
      where: { cashfreeOrderId: orderId },
      include: { invoice: { select: { type: true, description: true, balance: true } } },
    })

    if (payment) {
      res.json({
        success: true,
        data: {
          success: true,
          receiptNumber: payment.receiptNumber,
          amount: Number(payment.amount),
          paymentMode: payment.paymentMode,
          transactionRef: payment.transactionRef,
          cashfreePaymentId: payment.cashfreePaymentId,
          message: 'Payment verified',
        },
      })
      return
    }

    // Payment not yet recorded — check Cashfree directly and process if paid
    try {
      const { Cashfree } = await import('cashfree-pg')
      const orderRes = await Cashfree.PGFetchOrder('2023-08-01', orderId)
      const orderStatus = orderRes.data?.order_status
      const orderTags = orderRes.data?.order_tags as { invoice_id?: string; student_id?: string } | undefined

      if (orderStatus === 'PAID' && orderTags?.invoice_id && orderTags?.student_id) {
        // Process payment now (webhook may have been delayed)
        try {
          const paymentsData = orderRes.data as { payments?: Array<{ cf_payment_id: string; payment_amount: number }> }
          const cfPayment = paymentsData?.payments?.[0]
          if (cfPayment) {
            const receiptNumber = await processSuccessfulPayment({
              orderId,
              paymentId: String(cfPayment.cf_payment_id),
              invoiceId: orderTags.invoice_id,
              studentId: orderTags.student_id,
              amount: cfPayment.payment_amount,
            })
            res.json({ success: true, data: { success: true, receiptNumber, message: 'Payment confirmed and recorded' } })
            return
          }
        } catch { /* fall through */ }
        res.json({ success: true, data: { success: true, message: 'Payment confirmed. Receipt generating...' } })
      } else {
        res.json({ success: true, data: { success: false, message: `Payment status: ${orderStatus ?? 'unknown'}` } })
      }
    } catch {
      res.json({ success: true, data: { success: false, message: 'Could not verify. Please contact admin.' } })
    }
  } catch (err) { next(err) }
}
