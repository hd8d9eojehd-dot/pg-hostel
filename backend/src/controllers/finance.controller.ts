import { Request, Response, NextFunction } from 'express'
import * as financeService from '../services/finance.service'
import { generateReceiptPdf } from '../services/pdf.service'
import {
  notifyPaymentConfirmed,
  notifyUtrVerified,
  notifyUtrRejected,
} from '../services/notification.service'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { env } from '../config/env'
import type { CreateInvoiceInput, RecordPaymentInput, WaiveInvoiceInput } from '@pg-hostel/shared'

export async function addLateFeeToInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { lateFee } = req.body as { lateFee: number }
    if (!lateFee || lateFee <= 0) throw new ApiError(400, 'lateFee must be positive')
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    const newTotal = Number(invoice.totalAmount) + lateFee
    const newBalance = Number(invoice.balance) + lateFee
    const updated = await prisma.invoice.update({
      where: { id },
      data: { lateFee: Number(invoice.lateFee) + lateFee, totalAmount: newTotal, balance: newBalance, updatedAt: new Date() },
    })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

export async function createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await financeService.createInvoice(req.body as CreateInvoiceInput, req.user!.id)
    res.status(201).json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}

export async function getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await financeService.getInvoices(req.query as Record<string, string>)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params['id']! },
      include: {
        student: { select: { name: true, studentId: true, mobile: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    res.json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}

export async function recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payment = await financeService.recordPayment(req.body as RecordPaymentInput, req.user!.id)

    // Notify student with full context
    const student = await prisma.student.findUnique({
      where: { id: (req.body as RecordPaymentInput).studentId },
      select: { id: true, name: true, studentId: true, mobile: true },
    })
    // Fetch invoice description for context
    const invoice = await prisma.invoice.findUnique({
      where: { id: (req.body as RecordPaymentInput).invoiceId },
      select: { description: true, type: true },
    })
    if (student) {
      notifyPaymentConfirmed({
        studentDbId: student.id,
        studentName: student.name,
        studentId: student.studentId,
        mobile: student.mobile,
        amount: (req.body as RecordPaymentInput).amount,
        paymentMode: (req.body as RecordPaymentInput).paymentMode,
        receiptNumber: payment.receiptNumber,
        paidDate: payment.paidDate,
        description: invoice?.description ?? invoice?.type,
      }).catch(() => { /* non-blocking */ })
    }

    res.status(201).json({ success: true, message: 'Payment recorded', data: payment })
  } catch (err) {
    next(err)
  }
}

export async function waiveInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await financeService.waiveInvoice(req.params['id']!, req.body as WaiveInvoiceInput, req.user!.id)
    res.json({ success: true, message: 'Invoice waived', data: invoice })
  } catch (err) {
    next(err)
  }
}

export async function getDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const defaulters = await financeService.getDefaulters(req.query['branchId'] as string)
    res.json({ success: true, data: defaulters })
  } catch (err) {
    next(err)
  }
}

export async function getFinanceSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await financeService.getFinanceSummary(req.query['branchId'] as string)
    res.json({ success: true, data: summary })
  } catch (err) {
    next(err)
  }
}

export async function downloadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { receiptNumber: req.params['receiptNumber']! },
      include: {
        student: {
          include: {
            room: { include: { branch: true } },
            bed: true,
          },
        },
        invoice: true,
      },
    })

    if (!payment) throw new ApiError(404, 'Receipt not found')

    // Only generate receipt for verified/completed payments — not pending UTR
    if ((payment.paymentMode === 'upi' || payment.paymentMode === 'bank_transfer') && !payment.utrVerified) {
      throw new ApiError(400, 'Receipt not available — payment is pending admin verification')
    }

    const branch = payment.student.room?.branch
    const pgName = branch?.name ?? env.PG_NAME
    const pgAddress = branch ? `${branch.address}, ${branch.city ?? ''}, ${branch.state ?? ''}`.trim().replace(/,\s*$/, '') : 'India'
    const pgContact = branch?.contactPrimary ?? '9876543210'
    const signatureUrl = (branch as { signatureUrl?: string })?.signatureUrl ?? undefined

    try {
      const pdf = await generateReceiptPdf({
        receiptNumber: payment.receiptNumber,
        studentName: payment.student.name,
        studentId: payment.student.studentId,
        roomNumber: payment.student.room?.roomNumber ?? 'N/A',
        bedLabel: payment.student.bed?.bedLabel ?? 'N/A',
        amount: Number(payment.amount),
        paymentMode: payment.paymentMode,
        transactionRef: payment.transactionRef ?? undefined,
        utrNumber: payment.transactionRef ?? undefined,
        paidDate: payment.paidDate,
        invoiceDescription: `${payment.invoice.description ?? payment.invoice.type} (${payment.invoice.invoiceNumber})`,
        balance: Number(payment.invoice.balance),
        lateFee: Number(payment.invoice.lateFee ?? 0),
        pgName,
        pgAddress,
        pgContact,
        signatureUrl,
      })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.receiptNumber}.pdf"`)
      res.send(pdf)
    } catch (pdfErr) {
      // Fallback: return HTML receipt if PDF generation fails
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt ${payment.receiptNumber}</title>
      <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;border:2px solid #4f46e5;border-radius:8px}
      h1{color:#4f46e5;text-align:center}table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #eee}
      .total{font-weight:bold;font-size:1.2em;color:#059669}.header{background:#4f46e5;color:white;padding:16px;border-radius:6px;margin-bottom:20px}</style></head>
      <body><div class="header"><h2 style="margin:0;color:white">${pgName}</h2><p style="margin:4px 0;color:rgba(255,255,255,0.8)">${pgAddress} | ${pgContact}</p></div>
      <h1>PAYMENT RECEIPT</h1>
      <p style="text-align:center;font-size:1.1em;color:#4f46e5">Receipt No: <strong>${payment.receiptNumber}</strong></p>
      <table>
        <tr><td>Student Name</td><td><strong>${payment.student.name}</strong></td></tr>
        <tr><td>Student ID</td><td>${payment.student.studentId}</td></tr>
        <tr><td>Room / Bed</td><td>${payment.student.room?.roomNumber ?? 'N/A'} / ${payment.student.bed?.bedLabel ?? 'N/A'}</td></tr>
        <tr><td>Description</td><td>${payment.invoice.description ?? payment.invoice.type}</td></tr>
        <tr><td>Payment Mode</td><td>${payment.paymentMode.replace('_', ' ').toUpperCase()}</td></tr>
        ${payment.transactionRef ? `<tr><td>Reference</td><td>${payment.transactionRef}</td></tr>` : ''}
        <tr><td>Date</td><td>${new Date(payment.paidDate).toLocaleDateString('en-IN')}</td></tr>
        <tr><td class="total">Amount Paid</td><td class="total">₹${Number(payment.amount).toLocaleString('en-IN')}</td></tr>
        <tr><td>Balance</td><td>₹${Number(payment.invoice.balance).toLocaleString('en-IN')}</td></tr>
      </table>
      <p style="text-align:center;margin-top:20px;color:#64748b;font-style:italic">Thank you for your payment! 🙏</p>
      </body></html>`
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `inline; filename="receipt-${payment.receiptNumber}.html"`)
      res.send(html)
    }
  } catch (err) {
    next(err)
  }
}

export async function verifyReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { receiptNumber } = req.params as { receiptNumber: string }
    const payment = await prisma.payment.findUnique({
      where: { receiptNumber },
      select: {
        receiptNumber: true,
        amount: true,
        paymentMode: true,
        paidDate: true,
        createdAt: true,
        student: { select: { name: true, studentId: true } },
        invoice: { select: { type: true, description: true } },
      },
    })
    if (!payment) throw new ApiError(404, 'Receipt not found')
    res.json({ success: true, data: payment })
  } catch (err) {
    next(err)
  }
}

export async function getStudentInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params as { studentId: string }
    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: invoices })
  } catch (err) {
    next(err)
  }
}

// Get all pending UTR payments awaiting admin verification
export async function getPendingUtrPayments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        paymentMode: { in: ['upi', 'bank_transfer'] },
        utrVerified: false,
        utrRejected: false,
        notes: { contains: 'PENDING_VERIFICATION' },
      },
      include: {
        student: { select: { name: true, studentId: true, mobile: true, avatarUrl: true } },
        invoice: { select: { invoiceNumber: true, type: true, description: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: payments })
  } catch (err) { next(err) }
}

// Admin verifies a UTR payment — marks as verified, updates invoice to paid
export async function verifyUtrPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const adminId = req.user!.id

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: { select: { id: true, totalAmount: true, paidAmount: true, balance: true, description: true, type: true } },
        student: { select: { id: true, name: true, mobile: true, studentId: true } },
      },
    })
    if (!payment) throw new ApiError(404, 'Payment not found')
    if (payment.utrVerified) throw new ApiError(400, 'Payment already verified')
    if (payment.utrRejected) throw new ApiError(400, 'Payment was rejected — cannot verify')

    await prisma.$transaction(async (tx) => {
      // Mark payment as verified
      await tx.payment.update({
        where: { id },
        data: {
          utrVerified: true,
          recordedBy: adminId,
          notes: `VERIFIED by admin on ${new Date().toLocaleDateString('en-IN')}`,
        },
      })

      // Update invoice — recalculate balance
      const invoice = payment.invoice
      const newPaid = Number(invoice.paidAmount) + Number(payment.amount)
      const newBalance = Math.max(0, Number(invoice.totalAmount) - newPaid)
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          balance: newBalance,
          status: newBalance <= 0.01 ? 'paid' : 'partial',
          updatedAt: new Date(),
        },
      })
    })

    // Notify student via WhatsApp with full context
    notifyUtrVerified({
      studentDbId: payment.student.id ?? payment.studentId,
      studentName: payment.student.name,
      studentId: payment.student.studentId,
      mobile: payment.student.mobile,
      amount: Number(payment.amount),
      utr: payment.transactionRef ?? '',
      receiptNumber: payment.receiptNumber,
      description: payment.invoice?.description ?? payment.invoice?.type,
    }).catch(() => {})

    res.json({ success: true, message: 'Payment verified successfully', data: { receiptNumber: payment.receiptNumber } })
  } catch (err) { next(err) }
}

// Admin rejects a UTR payment — reverses the invoice, notifies student
export async function rejectUtrPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const { reason } = req.body as { reason: string }
    if (!reason) throw new ApiError(400, 'Rejection reason required')

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: { select: { id: true, paidAmount: true, totalAmount: true } },
        student: { select: { id: true, name: true, mobile: true, studentId: true } },
      },
    })
    if (!payment) throw new ApiError(404, 'Payment not found')
    if (payment.utrVerified) throw new ApiError(400, 'Cannot reject a verified payment')
    if (payment.utrRejected) throw new ApiError(400, 'Payment already rejected')

    await prisma.$transaction(async (tx) => {
      // Mark payment as rejected
      await tx.payment.update({
        where: { id },
        data: {
          utrRejected: true,
          utrRejectedReason: reason,
          notes: `REJECTED: ${reason}`,
        },
      })

      // Reverse the invoice — restore balance
      const invoice = payment.invoice
      const restoredPaid = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount))
      const restoredBalance = Number(invoice.totalAmount) - restoredPaid
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: restoredPaid,
          balance: restoredBalance,
          status: restoredBalance > 0 ? 'due' : 'paid',
          updatedAt: new Date(),
        },
      })
    })

    // Notify student via WhatsApp with full context
    notifyUtrRejected({
      studentDbId: payment.student.id ?? payment.studentId,
      studentName: payment.student.name,
      studentId: payment.student.studentId,
      mobile: payment.student.mobile,
      amount: Number(payment.amount),
      utr: payment.transactionRef ?? '',
      reason,
    }).catch(() => {})

    res.json({ success: true, message: 'Payment rejected and invoice restored' })
  } catch (err) { next(err) }
}
