import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateInvoiceSchema, RecordPaymentSchema, WaiveInvoiceSchema } from '@pg-hostel/shared'
import {
  createInvoice, getInvoices, getInvoiceById, recordPayment,
  waiveInvoice, getDefaulters, getFinanceSummary, downloadReceipt,
  verifyReceipt, getStudentInvoices, addLateFeeToInvoice,
  verifyUtrPayment, rejectUtrPayment, getPendingUtrPayments,
} from '../controllers/finance.controller'
import { createExtraCharge, getExtraCharges } from '../controllers/extraCharge.controller'

export const financeRouter = Router()

financeRouter.get('/summary', requireAdmin, getFinanceSummary)
financeRouter.get('/defaulters', requireAdmin, getDefaulters)
financeRouter.get('/receipts/verify/:receiptNumber', verifyReceipt)
financeRouter.get('/receipts/:receiptNumber', downloadReceipt)
financeRouter.get('/payments/:paymentId/receipt', async (req, res, next) => {
  // Redirect to receipt by payment ID
  try {
    const { prisma } = await import('../config/prisma')
    const payment = await prisma.payment.findUnique({ where: { id: req.params['paymentId'] }, select: { receiptNumber: true } })
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return }
    res.redirect(`/api/v1/finance/receipts/${payment.receiptNumber}`)
  } catch (err) { next(err) }
})
financeRouter.get('/invoices', requireAdmin, getInvoices)
financeRouter.post('/invoices', requireAdmin, validate(CreateInvoiceSchema), createInvoice)
financeRouter.get('/invoices/:id', requireAdmin, getInvoiceById)
financeRouter.post('/invoices/:id/waive', requireAdmin, validate(WaiveInvoiceSchema), waiveInvoice)
financeRouter.patch('/invoices/:id/add-late-fee', requireAdmin, addLateFeeToInvoice)
financeRouter.post('/payments', requireAdmin, validate(RecordPaymentSchema), recordPayment)
financeRouter.post('/payments/:id/verify-utr', requireAdmin, verifyUtrPayment)
financeRouter.post('/payments/:id/reject-utr', requireAdmin, rejectUtrPayment)
financeRouter.get('/payments/pending-utr', requireAdmin, getPendingUtrPayments)
financeRouter.get('/extra-charges', requireAdmin, getExtraCharges)
financeRouter.post('/extra-charges', requireAdmin, createExtraCharge)
financeRouter.get('/student/:studentId', requireAdmin, getStudentInvoices)