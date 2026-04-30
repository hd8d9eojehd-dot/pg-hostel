import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import {
  notifyUtrSubmittedAdmin,
  notifyOnlinePaymentRequest,
} from '../services/notification.service'
import { env } from '../config/env'

// Student portal â€” get home page data (all in one call for performance)
export async function getHomeData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id
    const today = new Date()

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        room: { include: { floor: true, branch: true } },
        bed: true,
      },
    })
    if (!student) throw new ApiError(404, 'Student not found')

    const branchId = student.room?.branchId

    const [invoices, notices, foodData] = await Promise.all([
      prisma.invoice.findMany({
        where: { studentId, status: { in: ['due', 'overdue', 'partial'] } },
        select: { id: true, invoiceNumber: true, status: true, balance: true, dueDate: true, totalAmount: true, type: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.notice.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, description: true, priority: true, category: true, publishedAt: true },
      }),
      branchId ? Promise.all([
        prisma.foodMenu.findMany({
          where: { branchId, month: today.getMonth() + 1, year: today.getFullYear(), dayOfMonth: today.getDate() },
          orderBy: { mealType: 'asc' },
        }),
        prisma.mealTimings.findUnique({ where: { branchId } }),
      ]) : [[], null],
    ])

    res.json({
      success: true,
      data: {
        profile: student,
        branch: student.room?.branch,
        pendingInvoices: invoices,
        notices,
        food: { menu: foodData[0], timings: foodData[1] },
      },
    })
  } catch (err) { next(err) }
}

// Student portal â€” get own profile
export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user!.id },
      include: {
        room: { include: { floor: true, branch: true } },
        bed: true,
        parent: true,
      },
    })
    if (!student) throw new ApiError(404, 'Student not found')
    res.json({ success: true, data: student })
  } catch (err) {
    next(err)
  }
}

// Student portal â€” get own invoices
export async function getMyInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { studentId: req.user!.id },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: invoices })
  } catch (err) {
    next(err)
  }
}

// Student portal â€” get own complaints
export async function getMyComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { studentId: req.user!.id },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: complaints })
  } catch (err) {
    next(err)
  }
}

// Student portal â€” get own outpasses
export async function getMyOutpasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const outpasses = await prisma.outpass.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: outpasses })
  } catch (err) {
    next(err)
  }
}

// Student portal â€” get notices
export async function getPublishedNotices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notices = await prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    })
    res.json({ success: true, data: notices })
  } catch (err) {
    next(err)
  }
}

// Student portal â€” get today's food menu
export async function getMyFoodMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user!.id },
      select: { roomId: true },
    })
    if (!student?.roomId) {
      res.json({ success: true, data: { menu: [], timings: null } })
      return
    }

    const room = await prisma.room.findUnique({
      where: { id: student.roomId },
      select: { branchId: true },
    })
    if (!room) {
      res.json({ success: true, data: { menu: [], timings: null } })
      return
    }

    const today = new Date()
    const month = parseInt((req.query['month'] as string) ?? String(today.getMonth() + 1))
    const year = parseInt((req.query['year'] as string) ?? String(today.getFullYear()))
    const viewType = (req.query['view'] as string) ?? 'today'

    const [menu, timings] = await Promise.all([
      prisma.foodMenu.findMany({
        where: {
          branchId: room.branchId,
          month,
          year,
          ...(viewType === 'today' && { dayOfMonth: today.getDate() }),
        },
        orderBy: [{ dayOfMonth: 'asc' }, { mealType: 'asc' }],
      }),
      prisma.mealTimings.findUnique({ where: { branchId: room.branchId } }),
    ])

    res.json({ success: true, data: { menu, timings } })
  } catch (err) {
    next(err)
  }
}

// Parent portal â€” get child info
export async function getChildInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parent = await prisma.parent.findUnique({
      where: { id: req.user!.id },
      include: {
        student: {
          include: {
            room: { include: { floor: true } },
            bed: true,
            invoices: { where: { status: { in: ['due', 'overdue'] } } },
          },
        },
      },
    })
    if (!parent) throw new ApiError(404, 'Parent not found')
    res.json({ success: true, data: parent.student })
  } catch (err) {
    next(err)
  }
}

// Student portal â€” get full fee structure (all semesters)
export async function getMyFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        room: { include: { branch: true } },
        invoices: {
          include: { payments: { orderBy: { createdAt: 'desc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!student) throw new ApiError(404, 'Student not found')

    const room = student.room
    const totalSems = (student as { totalSemesters?: number }).totalSemesters ?? 8
    const currentSem = student.semester ?? 1
    const rentPackage = student.rentPackage
    const depositAmount = Number(student.depositAmount ?? 5000)

    // Fee per semester based on rent package
    let feePerSem = 0
    if (rentPackage === 'semester') feePerSem = Number(room?.semesterRent ?? 0)
    else if (rentPackage === 'monthly') feePerSem = Number(room?.monthlyRent ?? 0) * 6
    else if (rentPackage === 'annual') feePerSem = Number(room?.annualRent ?? 0) / 2

    // Sem 1 always includes deposit
    const sem1Total = feePerSem + depositAmount

    // Map invoices to semesters by semesterNumber
    const rentInvoices = student.invoices.filter(i => i.type === 'rent')

    // Build semester rows
    const semesters = Array.from({ length: totalSems }, (_, i) => {
      const sem = i + 1
      const isFirstSem = sem === 1

      // Find invoice for this semester â€” by semesterNumber first, then by order
      const invoice = rentInvoices.find(inv => {
        const invSem = (inv as { semesterNumber?: number }).semesterNumber
        if (invSem) return invSem === sem
        return rentInvoices.indexOf(inv) === i
      })

      // The expected fee for this sem (sem 1 includes deposit)
      const expectedFee = isFirstSem ? sem1Total : feePerSem

      let status: 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming' | 'current'
      if (invoice) {
        status = invoice.status as 'paid' | 'partial' | 'due' | 'overdue'
      } else if (sem < currentSem) {
        // No invoice for past sem — show as 'no_record' but treat as paid for summary
        status = 'paid'
      } else if (sem === currentSem) {
        status = 'current'
      } else {
        status = 'upcoming'
      }

      const paidAmount = invoice ? Number(invoice.paidAmount) : (sem < currentSem ? expectedFee : 0)
      const balance = invoice ? Number(invoice.balance) : (sem < currentSem ? 0 : expectedFee)

      return {
        sem,
        feeAmount: expectedFee,
        status,
        invoice: invoice ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: Number(invoice.totalAmount),
          paidAmount,
          balance,
          dueDate: invoice.dueDate,
          lateFee: Number(invoice.lateFee ?? 0),
          payments: invoice.payments.map(p => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            amount: Number(p.amount),
            paymentMode: p.paymentMode,
            transactionRef: p.transactionRef,
            paidDate: p.paidDate,
          })),
        } : null,
        paidAmount,
        balance,
        canPayWithoutInvoice: !invoice && sem === currentSem && expectedFee > 0,
      }
    })

    // Other (non-rent) invoices
    const otherInvoices = student.invoices
      .filter(i => i.type !== 'rent')
      .map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        type: i.type,
        description: i.description,
        totalAmount: Number(i.totalAmount),
        paidAmount: Number(i.paidAmount),
        balance: Number(i.balance),
        status: i.status,
        dueDate: i.dueDate,
        lateFee: Number(i.lateFee ?? 0),
        payments: i.payments.map(p => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: Number(p.amount),
          paymentMode: p.paymentMode,
          transactionRef: p.transactionRef,
          paidDate: p.paidDate,
        })),
      }))

    // Total course fee = sem1 (with deposit) + remaining sems
    // sem1Total already includes deposit, so: sem1Total + (totalSems-1) * feePerSem
    const totalCourseFee = sem1Total + feePerSem * (totalSems - 1)

    // totalPaid = sum of actual payments recorded (not estimated)
    const allPayments = await prisma.payment.findMany({
      where: {
        studentId,
        utrRejected: false,
        // Only count verified payments (cash/online auto-verified, UTR must be verified)
        OR: [
          { paymentMode: 'cash' },
          { paymentMode: 'online', utrVerified: true },
          { paymentMode: 'upi', utrVerified: true },
          { paymentMode: 'bank_transfer', utrVerified: true },
        ],
      },
      select: { amount: true },
    })
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0)

    // totalDue = sum of all open invoice balances
    const totalDue = semesters
      .filter(r => ['due', 'overdue', 'partial', 'current'].includes(r.status))
      .reduce((s, r) => s + r.balance, 0)
      + otherInvoices.filter(i => ['due', 'overdue', 'partial'].includes(i.status))
          .reduce((s, i) => s + i.balance, 0)

    // Auto-renew: if stay expired but current sem fee is paid, mark student active
    const stayExpired = new Date(student.stayEndDate) < new Date()
    if (stayExpired && student.status === 'active') {
      const currentSemRow = semesters.find(s => s.sem === currentSem)
      if (currentSemRow?.status === 'paid') {
        // Stay is expired but fee is paid â€” extend stay by one semester period
        const newEndDate = new Date(student.stayEndDate)
        newEndDate.setMonth(newEndDate.getMonth() + 6) // extend 6 months
        await prisma.student.update({
          where: { id: studentId },
          data: { stayEndDate: newEndDate, updatedAt: new Date() },
        }).catch(() => {})
      }
    }

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          studentId: student.studentId,
          course: student.course,
          branch: student.branch,
          currentSem,
          totalSems,
          rentPackage,
          feePerSem,
          depositAmount,
          joiningDate: student.joiningDate,
          stayEndDate: student.stayEndDate,
        },
        room: room ? {
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          pgName: room.branch?.name ?? 'PG Hostel',
        } : null,
        semesters,
        otherInvoices,
        summary: {
          totalCourseFee,
          totalPaid,
          totalDue,
          depositAmount,
        },
      },
    })
  } catch (err) { next(err) }
}

export async function submitPaymentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id
    const { invoiceId, amount, transactionRef, paymentMode, semNumber, requiresApproval } = req.body as {
      invoiceId?: string; amount: number; transactionRef?: string; paymentMode: string
      semNumber?: number; requiresApproval?: boolean
    }

    if (!amount || amount <= 0) throw new ApiError(400, 'Amount must be positive')

    // â”€â”€ ONLINE PAYMENT REQUEST (no UTR â€” just requesting admin approval) â”€â”€
    if (requiresApproval || paymentMode === 'online') {
      let targetInvoiceId = invoiceId

      // Auto-create invoice if semNumber provided without invoiceId
      if (!targetInvoiceId && semNumber) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, include: { room: true } })
      if (!student) throw new ApiError(404, 'Student not found')

      const existing = await prisma.invoice.findFirst({
        where: { studentId, type: 'rent', semesterNumber: semNumber },
      })
      if (existing) {
        targetInvoiceId = existing.id
      } else {
        const { generateInvoiceNumber } = await import('../utils/studentId')
        const invoiceNumber = await generateInvoiceNumber()
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 7)
        const newInvoice = await prisma.invoice.create({
          data: {
            studentId,
            invoiceNumber,
            type: 'rent',
            description: `Semester ${semNumber} fee`,
            amount,
            totalAmount: amount,
            balance: amount,
            dueDate,
            status: 'due',
            semesterNumber: semNumber,
          },
        })
        targetInvoiceId = newInvoice.id
      }
    }

    if (!targetInvoiceId) throw new ApiError(400, 'invoiceId or semNumber required')

    const invoice = await prisma.invoice.findUnique({
      where: { id: targetInvoiceId },
      select: { id: true, studentId: true, balance: true, status: true },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    if (invoice.studentId !== studentId) throw new ApiError(403, 'Not your invoice')
    if (invoice.status === 'paid') throw new ApiError(400, 'Invoice already paid')

    // Notify admin via WhatsApp with full context (non-blocking)
    const studentForNotify = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true, name: true, studentId: true,
        room: { select: { roomNumber: true, branch: { select: { contactPrimary: true } } } },
      },
    })
    if (studentForNotify) {
      const adminMobile = studentForNotify.room?.branch?.contactPrimary
      if (adminMobile) {
        const invDesc = targetInvoiceId
          ? await prisma.invoice.findUnique({ where: { id: targetInvoiceId }, select: { description: true, type: true } })
          : null
        notifyOnlinePaymentRequest({
          studentDbId: studentForNotify.id,
          studentName: studentForNotify.name,
          studentId: studentForNotify.studentId,
          adminMobile,
          amount,
          invoiceDescription: invDesc?.description ?? invDesc?.type,
        }).catch(() => {})
      }
    }

      res.json({
        success: true,
        message: 'Payment request submitted. Admin will approve and notify you via WhatsApp.',
        data: { invoiceId: targetInvoiceId, status: 'pending_approval' },
      })
      return
    }

    // â”€â”€ UTR PAYMENT (UPI/Bank transfer) â”€â”€
    if (!transactionRef) throw new ApiError(400, 'transactionRef required for UPI/bank payments')

    const normalizedUtr = transactionRef.trim().toUpperCase()
    if (normalizedUtr.length < 6) throw new ApiError(400, 'UTR must be at least 6 characters')

    // UTR deduplication check
    const verifiedPayment = await prisma.payment.findFirst({
      where: { transactionRef: { equals: normalizedUtr, mode: 'insensitive' }, utrVerified: true },
      select: { id: true },
    })
    if (verifiedPayment) throw new ApiError(409, 'This UTR has already been used for a verified payment.')

    const pendingByOther = await prisma.payment.findFirst({
      where: {
        transactionRef: { equals: normalizedUtr, mode: 'insensitive' },
        utrVerified: false, utrRejected: false,
        studentId: { not: studentId },
      },
    })
    if (pendingByOther) throw new ApiError(409, 'This UTR is already submitted by another student.')

    const ownPending = await prisma.payment.findFirst({
      where: {
        transactionRef: { equals: normalizedUtr, mode: 'insensitive' },
        studentId, utrVerified: false, utrRejected: false,
      },
    })
    if (ownPending) throw new ApiError(409, 'You already submitted this UTR. Please wait for admin verification.')

    let targetInvoiceId = invoiceId

    if (!targetInvoiceId && semNumber) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, include: { room: true } })
      if (!student) throw new ApiError(404, 'Student not found')

      // Calculate correct amount for this semester (sem 1 includes deposit)
      let feePerSem = 0
      if (student.rentPackage === 'semester') feePerSem = Number(student.room?.semesterRent ?? 0)
      else if (student.rentPackage === 'monthly') feePerSem = Number(student.room?.monthlyRent ?? 0) * 6
      else if (student.rentPackage === 'annual') feePerSem = Number(student.room?.annualRent ?? 0) / 2
      const depositAmt = Number(student.depositAmount ?? 5000)
      const semInvoiceAmount = semNumber === 1 ? feePerSem + depositAmt : feePerSem

      const { generateInvoiceNumber } = await import('../utils/studentId')
      const invoiceNumber = await generateInvoiceNumber()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)
      const newInvoice = await prisma.invoice.create({
        data: {
          studentId, invoiceNumber, type: 'rent',
          description: semNumber === 1
            ? `Semester 1 fee + Security deposit (Rs.${depositAmt})`
            : `Semester ${semNumber} fee`,
          amount: semInvoiceAmount, totalAmount: semInvoiceAmount, balance: semInvoiceAmount,
          dueDate, status: 'due', semesterNumber: semNumber,
        },
      })
      targetInvoiceId = newInvoice.id
    }

    if (!targetInvoiceId) throw new ApiError(400, 'invoiceId or semNumber required')

    const invoice = await prisma.invoice.findUnique({
      where: { id: targetInvoiceId },
      select: { id: true, studentId: true, balance: true, status: true, totalAmount: true },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    if (invoice.studentId !== studentId) throw new ApiError(403, 'Not your invoice')
    if (invoice.status === 'paid') throw new ApiError(400, 'Invoice already paid')

    // Overpayment: if paying more than balance, carry excess to next sem or warn if last sem
    const invoiceBalance = Number(invoice.balance)
    if (amount > invoiceBalance + 0.01) {
      const stu = await prisma.student.findUnique({ where: { id: studentId }, select: { semester: true, totalSemesters: true } })
      const totalSems = (stu as { totalSemesters?: number })?.totalSemesters ?? 8
      const invSemNum = (invoice as { semesterNumber?: number }).semesterNumber ?? (stu?.semester ?? 1)
      if (invSemNum >= totalSems) {
        throw new ApiError(400, 'This is your last semester. Please pay the exact amount: Rs.' + invoiceBalance.toLocaleString('en-IN'))
      }
      // Allow overpayment -- excess will be credited to next sem
    }

    const { generateReceiptNumber } = await import('../utils/studentId')
    const receiptNumber = await generateReceiptNumber()

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId: targetInvoiceId!,
          studentId,
          receiptNumber,
          amount,
          paymentMode: paymentMode === 'upi' ? 'upi' : 'bank_transfer',
          transactionRef: normalizedUtr,
          utrVerified: false,
          utrRejected: false,
          paidDate: new Date(),
          notes: 'PENDING_VERIFICATION - submitted by student via portal',
        },
      })
      // ⚠️ DO NOT update invoice balance here — only update after admin verifies
      // Invoice stays as 'due' until admin verifies the UTR
      // This prevents showing fee as paid before verification
    })

    // Notify admin via WhatsApp with full context (non-blocking)
    const studentForUtr = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true, name: true, studentId: true,
        room: { select: { roomNumber: true, branch: { select: { contactPrimary: true } } } },
      },
    })
    if (studentForUtr) {
      const adminMobile = studentForUtr.room?.branch?.contactPrimary
      if (adminMobile) {
        notifyUtrSubmittedAdmin({
          studentDbId: studentForUtr.id,
          studentName: studentForUtr.name,
          studentId: studentForUtr.studentId,
          adminMobile,
          amount,
          utr: normalizedUtr,
          paymentMode,
        }).catch(() => {})
      }
    }

    res.json({
      success: true,
      message: 'Payment submitted for verification. Admin will confirm within 24 hours.',
      data: { receiptNumber, utrStatus: 'pending' },
    })
  } catch (err) { next(err) }
}

// Create invoice for current semester (used before online payment)
export async function createSemInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id
    const { semNumber, amount } = req.body as { semNumber: number; amount: number }

    if (!semNumber || !amount) throw new ApiError(400, 'semNumber and amount required')

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true, semester: true, rentPackage: true, depositAmount: true,
        room: { select: { semesterRent: true, monthlyRent: true, annualRent: true } },
      },
    })
    if (!student) throw new ApiError(404, 'Student not found')

    // Check if invoice already exists for this sem
    const existing = await prisma.invoice.findFirst({
      where: { studentId, type: 'rent', semesterNumber: semNumber },
    })
    if (existing) {
      res.json({ success: true, data: { invoiceId: existing.id } })
      return
    }

    // Calculate correct amount including deposit for sem 1
    let feePerSem = 0
    if (student.rentPackage === 'semester') feePerSem = Number(student.room?.semesterRent ?? 0)
    else if (student.rentPackage === 'monthly') feePerSem = Number(student.room?.monthlyRent ?? 0) * 6
    else if (student.rentPackage === 'annual') feePerSem = Number(student.room?.annualRent ?? 0) / 2
    const depositAmt = Number(student.depositAmount ?? 5000)
    const correctAmount = semNumber === 1 ? feePerSem + depositAmt : feePerSem
    // Use the provided amount if it matches, otherwise use calculated
    const finalAmount = Math.abs(amount - correctAmount) < 1 ? correctAmount : amount

    const { generateInvoiceNumber } = await import('../utils/studentId')
    const invoiceNumber = await generateInvoiceNumber()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const description = semNumber === 1
      ? `Semester 1 fee + Security deposit (₹${depositAmt})`
      : `Semester ${semNumber} fee`

    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        invoiceNumber,
        type: 'rent',
        description,
        amount: finalAmount,
        totalAmount: finalAmount,
        balance: finalAmount,
        dueDate,
        status: 'due',
        semesterNumber: semNumber,
      },
    })

    res.json({ success: true, data: { invoiceId: invoice.id } })
  } catch (err) { next(err) }
}

// Get student's pending UTR payments (for live status updates)
export async function getMyPendingPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id
    const payments = await prisma.payment.findMany({
      where: {
        studentId,
        paymentMode: { in: ['upi', 'bank_transfer'] },
      },
      include: {
        invoice: { select: { invoiceNumber: true, description: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    res.json({ success: true, data: payments })
  } catch (err) { next(err) }
}

// Get UPI/Bank payment details for student portal
export async function getPaymentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user!.id },
      select: { room: { select: { branchId: true } } },
    })
    const branchId = student?.room?.branchId
    if (!branchId) { res.json({ success: true, data: null }); return }

    const settings = await prisma.settings.findUnique({
      where: { branchId },
      select: { staffPermissions: true },
    })
    const perms = (settings?.staffPermissions as Record<string, unknown>) ?? {}
    const paymentDetails = (perms['paymentDetails'] as Record<string, string> | undefined) ?? null
    res.json({ success: true, data: paymentDetails })
  } catch (err) { next(err) }
}
