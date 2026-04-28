import { z } from 'zod'
import { INVOICE_TYPE, PAYMENT_MODE } from '../constants/status.constants'

export const CreateInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(INVOICE_TYPE),
  description: z.string().min(3).max(500).trim(),
  amount: z.number().positive().max(9999999),
  discount: z.number().min(0).default(0),
  lateFee: z.number().min(0).default(0),
  dueDate: z.string().date(),
  notes: z.string().max(500).optional(),
})
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>

export const RecordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMode: z.enum(PAYMENT_MODE),
  transactionRef: z.string().max(100).optional(),
  paidDate: z.string().date(),
  notes: z.string().max(500).optional(),
})
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>

export const WaiveInvoiceSchema = z.object({
  reason: z.string().min(5).max(500).trim(),
  waiveAmount: z.number().positive().optional(),
})
export type WaiveInvoiceInput = z.infer<typeof WaiveInvoiceSchema>

export const UpdateInvoiceSchema = z.object({
  description: z.string().min(3).max(500).optional(),
  amount: z.number().positive().optional(),
  discount: z.number().min(0).optional(),
  lateFee: z.number().min(0).optional(),
  dueDate: z.string().date().optional(),
  notes: z.string().max(500).optional(),
})
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>
