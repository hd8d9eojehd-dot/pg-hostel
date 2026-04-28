import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'

// Student portal — get home page data (all in one call for performance)
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

// Student portal — get own profile
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

// Student portal — get own invoices
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

// Student portal — get own complaints
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

// Student portal — get own outpasses
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

// Student portal — get notices
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

// Student portal — get today's food menu
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

// Parent portal — get child info
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

// Student portal — get full fee structure (all semesters)
export async function getMyFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        room: {
          include: { branch: true },
        },
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

    // Fee per semester based on rent package
    let feePerSem = 0
    if (rentPackage === 'semester') feePerSem = Number(room?.semesterRent ?? 0)
    else if (rentPackage === 'monthly') feePerSem = Number(room?.monthlyRent ?? 0) * 6
    else if (rentPackage === 'annual') feePerSem = Number(room?.annualRent ?? 0) / 2

    // Map invoices to semesters (by semesterNumber if set, else by order)
    const rentInvoices = student.invoices.filter(i => i.type === 'rent')

    // Build semester rows
    const semesters = Array.from({ length: totalSems }, (_, i) => {
      const sem = i + 1
      // Find invoice for this semester
      const invoice = rentInvoices.find(inv => {
        const invSem = (inv as { semesterNumber?: number }).semesterNumber
        if (invSem) return invSem === sem
        return rentInvoices.indexOf(inv) === i
      })

      let status: 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming' | 'current'
      if (invoice) {
        status = invoice.status as 'paid' | 'partial' | 'due' | 'overdue'
      } else if (sem < currentSem) {
        status = 'paid'
      } else if (sem === currentSem) {
        status = 'current'
      } else {
        status = 'upcoming'
      }

      // For current sem with no invoice: balance = feePerSem (needs to be paid)
      const paidAmount = invoice ? Number(invoice.paidAmount) : (sem < currentSem ? feePerSem : 0)
      // Upcoming sems have balance=0 (not due yet), current sem without invoice has balance=feePerSem
      const balance = invoice
        ? Number(invoice.balance)
        : (sem < currentSem ? 0 : sem === currentSem ? feePerSem : 0)

      return {
        sem,
        feeAmount: feePerSem,
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
        // Flag: can pay even without invoice (admin will create invoice on payment)
        canPayWithoutInvoice: !invoice && sem === currentSem && feePerSem > 0,
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

    const totalCourseFee = feePerSem * totalSems
    const totalPaid = semesters.reduce((s, r) => s + r.paidAmount, 0)
    // Only count actual due/overdue/partial balances, NOT upcoming sems
    const totalDue = semesters
      .filter(r => ['due', 'overdue', 'partial', 'current'].includes(r.status))
      .reduce((s, r) => s + r.balance, 0)
      + otherInvoices.filter(i => ['due', 'overdue', 'partial'].includes(i.status))
          .reduce((s, i) => s + i.balance, 0)

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
          depositAmount: Number(student.depositAmount),
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
          depositAmount: Number(student.depositAmount),
        },
      },
    })
  } catch (err) { next(err) }
}


export async function submitPaymentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id
    const { invoiceId, amount, transactionRef, paymentMode, semNumber } = req.body as {
      invoiceId?: string; amount: number; transactionRef: string; paymentMode: string; semNumber?: number
    }

    if (!amount || !transactionRef) throw new ApiError(400, 'amount, transactionRef required')
    if (amount <= 0) throw new ApiError(400, 'Amount must be positive')

    // Normalize UTR — trim and uppercase for consistent comparison
    const normalizedUtr = transactionRef.trim().toUpperCase()
    if (normalizedUtr.length < 6) throw new ApiError(400, 'UTR must be at least 6 characters')

    // ── UTR DEDUPLICATION CHECK ──
    // Check if this UTR was already used AND verified (approved by admin)
    const verifiedPayment = await prisma.payment.findFirst({
      where: {
        transactionRef: { equals: normalizedUtr, mode: 'insensitive' },
        utrVerified: true,
      },
      select: { id: true, studentId: true, amount: true, paidDate: true },
    })
    if (verifiedPayment) {
      throw new ApiError(409, `This UTR has already been used for a verified payment. Each UTR can only be used once.`)
    }

    // Check if same UTR is pending (not yet verified/rejected) by ANOTHER student
    const pendingByOther = await prisma.payment.findFirst({
      where: {
        transactionRef: { equals: normalizedUtr, mode: 'insensitive' },
        utrVerified: false,
        utrRejected: false,
        studentId: { not: studentId },
      },
    })
    if (pendingByOther) {
      throw new ApiError(409, 'This UTR is already submitted by another student. Please check your UTR number.')
    }

    // Check if this student already submitted this UTR (pending)
    const ownPending = await prisma.payment.findFirst({
      where: {
        transactionRef: { equals: normalizedUtr, mode: 'insensitive' },
        studentId,
        utrVerified: false,
        utrRejected: false,
      },
    })
    if (ownPending) {
      throw new ApiError(409, 'You already submitted this UTR. Please wait for admin verification.')
    }

    let targetInvoiceId = invoiceId

    // Auto-create invoice if semNumber provided without invoiceId
    if (!targetInvoiceId && semNumber) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, include: { room: true } })
      if (!student) throw new ApiError(404, 'Student not found')

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

    if (!targetInvoiceId) throw new ApiError(400, 'invoiceId or semNumber required')

    const invoice = await prisma.invoice.findUnique({
      where: { id: targetInvoiceId },
      select: { id: true, studentId: true, balance: true, status: true, totalAmount: true },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    if (invoice.studentId !== studentId) throw new ApiError(403, 'Not your invoice')
    if (invoice.status === 'paid') throw new ApiError(400, 'Invoice already paid')
    if (amount > Number(invoice.balance) + 0.01) throw new ApiError(400, `Amount ₹${amount} exceeds balance ₹${invoice.balance}`)

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
          notes: 'PENDING_VERIFICATION — submitted by student via portal',
        },
      })
      // Mark invoice as partial (pending verification)
      const newPaid = Math.min(amount, Number(invoice.balance))
      const newBalance = Math.max(0, Number(invoice.balance) - newPaid)
      await tx.invoice.update({
        where: { id: targetInvoiceId! },
        data: {
          paidAmount: { increment: newPaid },
          balance: newBalance,
          status: 'partial', // stays partial until admin verifies
          updatedAt: new Date(),
        },
      })
    })

    // Notify admin via WhatsApp (non-blocking)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true, studentId: true, room: { select: { branch: { select: { contactPrimary: true } } } } },
    })
    if (student) {
      const { sendWhatsAppMessage } = await import('../config/whatsapp')
      const adminMobile = student.room?.branch?.contactPrimary
      if (adminMobile) {
        sendWhatsAppMessage(adminMobile,
          `💰 *Payment Verification Required*\n\nStudent: ${student.name} (${student.studentId})\nAmount: ₹${amount}\nUTR: ${normalizedUtr}\nMode: ${paymentMode.toUpperCase()}\n\nPlease verify in admin portal.`
        ).catch(() => {})
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
      select: { id: true, semester: true },
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

    const { generateInvoiceNumber } = await import('../utils/studentId')
    const invoiceNumber = await generateInvoiceNumber()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const invoice = await prisma.invoice.create({
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
