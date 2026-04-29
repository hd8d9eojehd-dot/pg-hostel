import { prisma } from '../config/prisma'

export async function generateStudentId(joiningDate?: Date): Promise<string> {
  const year = (joiningDate ?? new Date()).getFullYear()
  const prefix = `PG-${year}-`

  // Generate a random 4-digit number (1000-9999) that is unique for this year
  let attempts = 0
  while (attempts < 100) {
    const rand = Math.floor(1000 + Math.random() * 9000) // 1000–9999
    const candidate = `${prefix}${rand}`
    const existing = await prisma.student.findFirst({
      where: { studentId: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    attempts++
  }
  // Fallback: sequential if random exhausted (extremely unlikely)
  const last = await prisma.student.findFirst({
    where: { studentId: { startsWith: prefix } },
    orderBy: { studentId: 'desc' },
    select: { studentId: true },
  })
  const seq = last ? parseInt(last.studentId.split('-')[2] ?? '1000', 10) + 1 : 1000
  return `${prefix}${seq}`
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const seq = last ? parseInt(last.invoiceNumber.split('-')[2] ?? '0', 10) + 1 : 1
  return `${prefix}${seq.toString().padStart(4, '0')}`
}

export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `REC-${year}-`
  const last = await prisma.payment.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  })
  const seq = last ? parseInt(last.receiptNumber.split('-')[2] ?? '0', 10) + 1 : 1
  return `${prefix}${seq.toString().padStart(4, '0')}`
}

export async function generateComplaintNumber(): Promise<string> {
  const count = await prisma.complaint.count()
  return `CMP-${(count + 1).toString().padStart(4, '0')}`
}

export async function generateOutpassNumber(): Promise<string> {
  const count = await prisma.outpass.count()
  return `OPX-${(count + 1).toString().padStart(4, '0')}`
}
