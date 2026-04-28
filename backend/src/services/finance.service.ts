import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { generateInvoiceNumber, generateReceiptNumber } from '../utils/studentId'
import { todayIST } from '../utils/indianTime'
import type { CreateInvoiceInput, RecordPaymentInput, WaiveInvoiceInput } from '@pg-hostel/shared'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'

export async function createInvoice(input: CreateInvoiceInput, adminId: string) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } })
  if (!student) throw new ApiError(404, 'Student not found')

  const invoiceNumber = await generateInvoiceNumber()
  const totalAmount = input.amount + (input.lateFee ?? 0) - (input.discount ?? 0)

  return prisma.invoice.create({
    data: {
      studentId: input.studentId,
      invoiceNumber,
      type: input.type,
      description: input.description,
      amount: input.amount,
      lateFee: input.lateFee ?? 0,
      discount: input.discount ?? 0,
      totalAmount,
      balance: totalAmount,
      dueDate: new Date(input.dueDate),
      notes: input.notes,
      generatedBy: adminId,
      status: 'due',
    },
  })
}

export async function recordPayment(input: RecordPaymentInput, adminId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: { id: true, totalAmount: true, paidAmount: true, balance: true, status: true, studentId: true },
  })
  if (!invoice) throw new ApiError(404, 'Invoice not found')
  if (invoice.status === 'paid') throw new ApiError(400, 'Invoice is already fully paid')
  if (invoice.status === 'waived') throw new ApiError(400, 'Invoice has been waived')

  const balance = Number(invoice.balance)
  // Allow partial payments — just ensure amount > 0 and not exceeding balance
  if (input.amount <= 0) throw new ApiError(400, 'Payment amount must be greater than 0')
  if (input.amount > balance + 0.01) {
    throw new ApiError(400, `Payment amount (₹${input.amount}) exceeds balance (₹${balance.toFixed(2)})`)
  }

  const receiptNumber = await generateReceiptNumber()

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        studentId: input.studentId,
        receiptNumber,
        amount: input.amount,
        paymentMode: input.paymentMode,
        transactionRef: input.transactionRef,
        paidDate: new Date(input.paidDate),
        recordedBy: adminId,
        notes: input.notes,
      },
    })

    const newPaid = Number(invoice.paidAmount) + input.amount
    const newBalance = Number(invoice.totalAmount) - newPaid
    const newStatus = newBalance <= 0.01 ? 'paid' : 'partial'

    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: { paidAmount: newPaid, balance: Math.max(0, newBalance), status: newStatus, updatedAt: new Date() },
    })

    return payment
  })
}

export async function getInvoices(query: {
  page?: string; limit?: string; studentId?: string; status?: string; type?: string
}) {
  const { page, limit } = getPaginationParams(query)
  const skip = getSkip(page, limit)

  const where: Record<string, unknown> = {}
  if (query.studentId) where['studentId'] = query.studentId
  if (query.status) where['status'] = query.status
  if (query.type) where['type'] = query.type

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, studentId: true, mobile: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.invoice.count({ where }),
  ])

  return { invoices, pagination: getPaginationMeta(total, page, limit) }
}

export async function waiveInvoice(id: string, input: WaiveInvoiceInput, adminId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) throw new ApiError(404, 'Invoice not found')
  if (invoice.status === 'paid') throw new ApiError(400, 'Cannot waive a paid invoice')

  const waiveAmount = input.waiveAmount ?? Number(invoice.balance)

  return prisma.invoice.update({
    where: { id },
    data: {
      status: 'waived',
      discount: Number(invoice.discount) + waiveAmount,
      balance: Math.max(0, Number(invoice.balance) - waiveAmount),
      notes: `${invoice.notes ?? ''}\nWaived: ${input.reason} (by admin ${adminId})`.trim(),
      updatedAt: new Date(),
    },
  })
}

export async function getDefaulters(branchId?: string) {
  const where: Record<string, unknown> = { status: { in: ['due', 'overdue'] } }
  if (branchId) {
    where['student'] = { room: { branchId } }
  }

  return prisma.invoice.findMany({
    where,
    include: {
      student: {
        select: {
          name: true, studentId: true, mobile: true, parentMobile: true,
          room: { select: { roomNumber: true } },
          bed: { select: { bedLabel: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

export async function getFinanceSummary(branchId?: string) {
  const today = todayIST()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const studentFilter = branchId ? { student: { room: { branchId } } } : {}

  const [totalCollected, totalPending, thisMonthCollected, overdueCount] = await Promise.all([
    prisma.payment.aggregate({
      where: studentFilter,
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { ...studentFilter, status: { in: ['due', 'overdue', 'partial'] } },
      _sum: { balance: true },
    }),
    prisma.payment.aggregate({
      where: { ...studentFilter, paidDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.invoice.count({
      where: { ...studentFilter, status: 'overdue' },
    }),
  ])

  return {
    totalCollected: Number(totalCollected._sum.amount ?? 0),
    totalPending: Number(totalPending._sum.balance ?? 0),
    thisMonthCollected: Number(thisMonthCollected._sum.amount ?? 0),
    overdueCount,
  }
}
