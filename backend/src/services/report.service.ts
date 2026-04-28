import { prisma } from '../config/prisma'
import { todayIST, formatIST } from '../utils/indianTime'

// Convert array of objects to CSV string
export function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const headerRow = headers.join(',')
  const dataRows = rows.map(row => headers.map(h => escape(row[h])).join(','))
  return [headerRow, ...dataRows].join('\n')
}

export async function getOccupancyReportData() {
  const rooms = await prisma.room.findMany({
    include: {
      beds: {
        include: {
          student: { select: { name: true, studentId: true, status: true } },
        },
      },
      floor: { select: { floorNumber: true, floorName: true } },
      branch: { select: { name: true } },
    },
    orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }],
  })

  const rows = rooms.flatMap(room =>
    room.beds.map(bed => ({
      branch: room.branch.name,
      floor: room.floor.floorName ?? `Floor ${room.floor.floorNumber}`,
      room: room.roomNumber,
      type: room.roomType,
      bed: bed.bedLabel,
      occupied: bed.isOccupied ? 'Yes' : 'No',
      student_name: bed.student?.name ?? '',
      student_id: bed.student?.studentId ?? '',
      status: room.status,
    }))
  )

  return { rows, headers: ['branch', 'floor', 'room', 'type', 'bed', 'occupied', 'student_name', 'student_id', 'status'] }
}

export async function getRevenueReportData(month: number, year: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)

  const payments = await prisma.payment.findMany({
    where: { paidDate: { gte: start, lte: end } },
    include: {
      student: { select: { name: true, studentId: true } },
      invoice: { select: { type: true, description: true } },
    },
    orderBy: { paidDate: 'asc' },
  })

  const rows = payments.map(p => ({
    receipt_number: p.receiptNumber,
    student_name: p.student.name,
    student_id: p.student.studentId,
    invoice_type: p.invoice.type,
    description: p.invoice.description ?? '',
    amount: Number(p.amount),
    payment_mode: p.paymentMode,
    transaction_ref: p.transactionRef ?? '',
    paid_date: formatIST(p.paidDate),
  }))

  return {
    rows,
    headers: ['receipt_number', 'student_name', 'student_id', 'invoice_type', 'description', 'amount', 'payment_mode', 'transaction_ref', 'paid_date'],
  }
}

export async function getDefaultersReportData() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ['overdue', 'due'] } },
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

  const rows = invoices.map(inv => ({
    student_name: inv.student.name,
    student_id: inv.student.studentId,
    mobile: inv.student.mobile,
    parent_mobile: inv.student.parentMobile ?? '',
    room: inv.student.room?.roomNumber ?? '',
    bed: inv.student.bed?.bedLabel ?? '',
    invoice_number: inv.invoiceNumber,
    type: inv.type,
    total_amount: Number(inv.totalAmount),
    balance: Number(inv.balance),
    due_date: formatIST(inv.dueDate),
    status: inv.status,
  }))

  return {
    rows,
    headers: ['student_name', 'student_id', 'mobile', 'parent_mobile', 'room', 'bed', 'invoice_number', 'type', 'total_amount', 'balance', 'due_date', 'status'],
  }
}

export async function getStudentReportData() {
  const students = await prisma.student.findMany({
    include: {
      room: { select: { roomNumber: true, roomType: true } },
      bed: { select: { bedLabel: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = students.map(s => ({
    student_id: s.studentId,
    name: s.name,
    mobile: s.mobile,
    email: s.email ?? '',
    college: s.college ?? '',
    course: s.course ?? '',
    room: s.room?.roomNumber ?? '',
    bed: s.bed?.bedLabel ?? '',
    joining_date: formatIST(s.joiningDate),
    stay_end_date: formatIST(s.stayEndDate),
    rent_package: s.rentPackage,
    deposit: Number(s.depositAmount),
    status: s.status,
  }))

  return {
    rows,
    headers: ['student_id', 'name', 'mobile', 'email', 'college', 'course', 'room', 'bed', 'joining_date', 'stay_end_date', 'rent_package', 'deposit', 'status'],
  }
}
