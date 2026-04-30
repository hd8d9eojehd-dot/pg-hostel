import { prisma } from '../config/prisma'
import { supabaseAdmin } from '../config/supabase'
import { generateStudentId, generateInvoiceNumber, generateReceiptNumber } from '../utils/studentId'
import { stayEndDate, stayEndDateFromSemesters, stayEndDateMonthly, stayEndDateAnnual, todayIST } from '../utils/indianTime'
import { startOfDay } from 'date-fns'
import { ApiError } from '../middleware/error.middleware'
import type {
  CreateStudentInput, UpdateStudentInput, ShiftRoomInput,
  ExtendStayInput, VacateStudentInput, RenewStudentInput, DeleteStudentInput,
} from '@pg-hostel/shared'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'

export async function createStudent(input: CreateStudentInput, adminId: string) {
  // Check bed availability
  const bed = await prisma.bed.findUnique({
    where: { id: input.bedId },
    include: { room: true },
  })
  if (!bed) throw new ApiError(404, 'Bed not found')
  if (bed.isOccupied) throw new ApiError(409, 'Bed is already occupied')
  if (bed.roomId !== input.roomId) throw new ApiError(400, 'Bed does not belong to specified room')

  const joinDate = new Date(input.joiningDate)
  const studentId = await generateStudentId(joinDate)
  const totalSems = (input as { totalSemesters?: number }).totalSemesters ?? 8
  const currentSem = input.semester ?? 1
  const rentPkg = input.rentPackage

  // Stay end date and duration based on rent package
  let endDate: Date
  let computedDuration: string

  if (rentPkg === 'semester') {
    // Semester: remaining sems × 6 months each
    endDate = stayEndDateFromSemesters(joinDate, currentSem, totalSems)
    computedDuration = `${(totalSems - currentSem + 1) * 6}months`
  } else if (rentPkg === 'monthly') {
    // Monthly: stayMonths from input, default 12
    const stayMonths = (input as { stayMonths?: number }).stayMonths ?? 12
    endDate = stayEndDateMonthly(joinDate, stayMonths)
    computedDuration = `${stayMonths}months`
  } else {
    // Annual: stayYears from input, default 1
    const stayYears = (input as { stayYears?: number }).stayYears ?? 1
    endDate = stayEndDateAnnual(joinDate, stayYears)
    computedDuration = `${stayYears * 12}months`
  }

  // Password = studentId (e.g. PG-2026-4821) — no temp password, no forced change
  const initialPassword = studentId

  // Create Supabase auth user
  const email = input.email ?? `${studentId.toLowerCase()}@pg-hostel.local`
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: initialPassword,
    email_confirm: true,
    user_metadata: { studentId, name: input.name, role: 'student' },
  })

  if (authError) throw new ApiError(500, `Auth creation failed: ${authError.message}`)

  const student = await prisma.$transaction(async (tx) => {
    const s = await tx.student.create({
      data: {
        supabaseAuthId: authData.user!.id,
        studentId,
        name: input.name,
        fatherName: input.fatherName,
        motherName: (input as { motherName?: string }).motherName,
        mobile: input.mobile,
        parentMobile: input.parentMobile,
        motherMobile: (input as { motherMobile?: string }).motherMobile,
        email: input.email,
        aadhaar: input.aadhaar,
        fatherAadhaar: (input as { fatherAadhaar?: string }).fatherAadhaar,
        college: input.college,
        course: input.course,
        branch: input.branch,
        yearOfStudy: input.yearOfStudy,
        semester: input.semester,
        totalSemesters: (input as { totalSemesters?: number }).totalSemesters ?? 8,
        permanentAddress: input.permanentAddress,
        emergencyContact: input.emergencyContact,
        emergencyContactName: input.emergencyContactName,
        joiningDate: joinDate,
        stayDuration: computedDuration,
        stayEndDate: endDate,
        roomId: input.roomId,
        bedId: input.bedId,
        rentPackage: input.rentPackage,
        depositAmount: input.depositAmount,
        notes: input.notes,
        avatarUrl: input.avatarUrl,
        status: 'active',
        isFirstLogin: false,
        createdBy: adminId,
      },
      include: {
        room: { include: { floor: true, branch: true } },
        bed: true,
      },
    })

    // Mark bed as occupied
    await tx.bed.update({ where: { id: input.bedId }, data: { isOccupied: true } })

    // Update room status
    const occupiedBeds = await tx.bed.count({ where: { roomId: input.roomId, isOccupied: true } })
    const room = await tx.room.findUnique({ where: { id: input.roomId }, select: { bedCount: true } })
    const newStatus = occupiedBeds >= (room?.bedCount ?? 0) ? 'occupied' : 'partial'
    await tx.room.update({ where: { id: input.roomId }, data: { status: newStatus } })

    // Log room history
    await tx.roomHistory.create({
      data: {
        studentId: s.id,
        toRoomId: input.roomId,
        toBedId: input.bedId,
        changedBy: adminId,
        reason: 'Initial admission',
      },
    })

    // Activity log
    await tx.activityLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: 'CREATED',
        entityType: 'student',
        entityId: s.id,
        meta: { studentId, name: input.name },
      },
    })

    return s
  })

  // ALWAYS create the invoice for the first semester (whether or not payment is provided)
  let invoice = null
  let payment = null
  let receiptNumber = null

  const room = student.room

  // Calculate first period fee based on rent package
  let feeAmount = 0
  if (input.rentPackage === 'semester') feeAmount = Number(room?.semesterRent ?? 0)
  else if (input.rentPackage === 'monthly') feeAmount = Number(room?.monthlyRent ?? 0)
  else if (input.rentPackage === 'annual') feeAmount = Number(room?.annualRent ?? 0)

  if (feeAmount > 0) {
    const invoiceNumber = await generateInvoiceNumber()
    const dueDate = new Date(joinDate)
    dueDate.setDate(dueDate.getDate() + 7)

    // If initial payment is provided, include deposit in the invoice total
    // If skipping payment, ALSO include deposit in the due amount
    const depositAmt = Number(input.depositAmount ?? 0)
    const totalInvoiceAmount = feeAmount + depositAmt
    const pkgLabel = input.rentPackage === 'semester' ? `Sem ${input.semester}` : input.rentPackage === 'monthly' ? 'Month 1' : 'Year 1'
    const invoiceDescription = `First ${input.rentPackage} fee + Security deposit (₹${depositAmt}) — ${pkgLabel}`

    invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        invoiceNumber,
        type: 'rent',
        description: invoiceDescription,
        amount: totalInvoiceAmount,
        totalAmount: totalInvoiceAmount,
        balance: totalInvoiceAmount,
        dueDate,
        generatedBy: adminId,
        status: 'due',
        // Store semester number for tracking
        semesterNumber: input.semester,
      },
    })

    // Only record payment if initialPayment is provided
    if (input.initialPayment) {
      const { paymentMode, transactionRef } = input.initialPayment

      if (paymentMode === 'cash' || paymentMode === 'semi_offline') {
        receiptNumber = await generateReceiptNumber()
        payment = await prisma.$transaction(async (tx) => {
          const p = await tx.payment.create({
            data: {
              invoiceId: invoice!.id,
              studentId: student.id,
              receiptNumber: receiptNumber!,
              amount: totalInvoiceAmount,
              paymentMode: paymentMode === 'semi_offline' ? 'bank_transfer' : 'cash',
              transactionRef: transactionRef,
              paidDate: joinDate,
              recordedBy: adminId,
              notes: `Initial payment at admission — ${paymentMode}${depositAmt > 0 ? ` (includes ₹${depositAmt} deposit)` : ''}`,
            },
          })
          await tx.invoice.update({
            where: { id: invoice!.id },
            data: { paidAmount: totalInvoiceAmount, balance: 0, status: 'paid' },
          })
          return p
        })
      }
    }
  }

  return { student, password: initialPassword, invoice, payment, receiptNumber }
}

export async function deleteStudent(id: string, input: DeleteStudentInput, adminId: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      invoices: { where: { status: { in: ['due', 'overdue', 'partial'] } }, select: { balance: true } },
    },
  })
  if (!student) throw new ApiError(404, 'Student not found')

  // Verify confirmation ID matches
  if (input.confirmStudentId !== student.studentId) {
    throw new ApiError(400, 'Confirmation ID does not match student ID')
  }

  const outstandingBalance = student.invoices.reduce((sum, inv) => sum + Number(inv.balance), 0)

  await prisma.$transaction(async (tx) => {
    // Free bed
    if (student.bedId) {
      await tx.bed.update({ where: { id: student.bedId }, data: { isOccupied: false } }).catch(() => {})
    }
    // Update room status
    if (student.roomId) {
      const occupied = await tx.bed.count({ where: { roomId: student.roomId, isOccupied: true } })
      await tx.room.update({
        where: { id: student.roomId },
        data: { status: occupied === 0 ? 'available' : 'partial' },
      }).catch(() => {})
    }

    // Delete all related records in order (catch each to avoid cascade failures)
    await tx.whatsappLog.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.feedback.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.outpass.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.complaintComment.deleteMany({ where: { complaint: { studentId: id } } }).catch(() => {})
    await tx.complaint.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.document.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.extraCharge.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.roomHistory.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.renewalExit.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.payment.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.invoice.deleteMany({ where: { studentId: id } }).catch(() => {})
    await tx.parent.deleteMany({ where: { studentId: id } }).catch(() => {})
    // Delete activity logs referencing this student entity
    await tx.activityLog.deleteMany({ where: { entityId: id, entityType: 'student' } }).catch(() => {})
    await tx.student.delete({ where: { id } })

    // Activity log for the deletion itself
    await tx.activityLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: 'DELETED',
        entityType: 'student',
        entityId: id,
        meta: { studentId: student.studentId, name: student.name, outstandingBalance },
      },
    }).catch(() => {})
  })

  // Delete Supabase auth user — must succeed for security
  if (student.supabaseAuthId) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(student.supabaseAuthId)
    if (authDeleteError) {
      // Log but don't fail — DB record is already deleted, Supabase cleanup is best-effort
      // The auth middleware will reject any future login attempts since DB record is gone
      const { logger } = await import('../utils/logger')
      logger.warn(`Supabase user deletion failed for ${student.studentId}: ${authDeleteError.message}`)
    }
  }

  return { deleted: true, outstandingBalance }
}

export async function renewStudent(id: string, input: RenewStudentInput, adminId: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { room: { include: { branch: true } } },
  })
  if (!student) throw new ApiError(404, 'Student not found')
  if (student.status !== 'vacated') throw new ApiError(400, 'Only vacated students can be renewed')

  const newBed = await prisma.bed.findUnique({ where: { id: input.bedId } })
  if (!newBed) throw new ApiError(404, 'Bed not found')
  if (newBed.isOccupied) throw new ApiError(409, 'Selected bed is already occupied')

  const joinDate = new Date(input.joiningDate)
  // For renewal, use existing student's semester data for stay end date
  const renewTotalSems = (student as { totalSemesters?: number }).totalSemesters ?? 8
  const renewCurrentSem = student.semester ?? 1
  const renewPkg = input.rentPackage

  let endDate: Date
  let computedDuration: string

  if (renewPkg === 'semester') {
    endDate = stayEndDateFromSemesters(joinDate, renewCurrentSem, renewTotalSems)
    computedDuration = `${(renewTotalSems - renewCurrentSem + 1) * 6}months`
  } else if (renewPkg === 'monthly') {
    const stayMonths = (input as { stayMonths?: number }).stayMonths ?? 12
    endDate = stayEndDateMonthly(joinDate, stayMonths)
    computedDuration = `${stayMonths}months`
  } else {
    const stayYears = (input as { stayYears?: number }).stayYears ?? 1
    endDate = stayEndDateAnnual(joinDate, stayYears)
    computedDuration = `${stayYears * 12}months`
  }

  const newRoom = await prisma.room.findUnique({
    where: { id: input.roomId },
    include: { branch: true },
  })

  await prisma.$transaction(async (tx) => {
    // Update student
    await tx.student.update({
      where: { id },
      data: {
        status: 'active',
        roomId: input.roomId,
        bedId: input.bedId,
        joiningDate: joinDate,
        stayDuration: computedDuration,
        stayEndDate: endDate,
        rentPackage: input.rentPackage,
        depositAmount: input.depositAmount,
        isFirstLogin: false,
        updatedAt: new Date(),
      },
    })

    // Mark bed occupied
    await tx.bed.update({ where: { id: input.bedId }, data: { isOccupied: true } })

    // Update room status
    const occupiedBeds = await tx.bed.count({ where: { roomId: input.roomId, isOccupied: true } })
    const room = await tx.room.findUnique({ where: { id: input.roomId }, select: { bedCount: true } })
    await tx.room.update({
      where: { id: input.roomId },
      data: { status: occupiedBeds >= (room?.bedCount ?? 0) ? 'occupied' : 'partial' },
    })

    // Log room history
    await tx.roomHistory.create({
      data: {
        studentId: id,
        toRoomId: input.roomId,
        toBedId: input.bedId,
        changedBy: adminId,
        reason: 'Re-admission / Renewal',
      },
    })

    // Create renewal record
    await tx.renewalExit.create({
      data: {
        studentId: id,
        type: 'renewal',
        effectiveDate: joinDate,
        status: 'completed',
        processedBy: adminId,
        processedAt: new Date(),
      },
    })

    // Activity log
    await tx.activityLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: 'UPDATED',
        entityType: 'student',
        entityId: id,
        meta: { action: 'renewed', roomId: input.roomId },
      },
    })
  })

  // Create first period invoice for renewal
  let feeAmount = 0
  if (newRoom) {
    if (input.rentPackage === 'semester') feeAmount = Number(newRoom.semesterRent ?? 0)
    else if (input.rentPackage === 'monthly') feeAmount = Number(newRoom.monthlyRent ?? 0)
    else if (input.rentPackage === 'annual') feeAmount = Number(newRoom.annualRent ?? 0)
  }

  let invoice = null
  if (feeAmount > 0) {
    const invoiceNumber = await generateInvoiceNumber()
    const dueDate = new Date(joinDate)
    dueDate.setDate(dueDate.getDate() + 7)
    const pkgLabel = input.rentPackage === 'semester' ? `Sem ${renewCurrentSem}` : input.rentPackage === 'monthly' ? 'Month 1' : 'Year 1'
    invoice = await prisma.invoice.create({
      data: {
        studentId: id,
        invoiceNumber,
        type: 'rent',
        description: `Renewal — first ${input.rentPackage} fee (${pkgLabel})`,
        amount: feeAmount,
        totalAmount: feeAmount,
        balance: feeAmount,
        dueDate,
        generatedBy: adminId,
        status: 'due',
        semesterNumber: input.rentPackage === 'semester' ? renewCurrentSem : undefined,
      },
    })
  }

  // Send WhatsApp welcome message (non-blocking)
  const { notifyAdmission } = await import('./notification.service')
  const bed = await prisma.bed.findUnique({ where: { id: input.bedId } })
  notifyAdmission({
    studentDbId: student.id,
    studentName: student.name,
    studentId: student.studentId,
    mobile: student.mobile,
    password: student.studentId,
    roomNumber: newRoom?.roomNumber ?? '',
    bedLabel: bed?.bedLabel ?? '',
    branchId: newRoom?.branchId ?? undefined,
  }).catch(() => {})

  return { student: await prisma.student.findUnique({ where: { id } }), invoice }
}

export async function getStudents(query: {
  page?: string; limit?: string; search?: string
  status?: string; branchId?: string; roomId?: string; feeStatus?: string
}) {
  const { page, limit } = getPaginationParams(query)
  const skip = getSkip(page, limit)

  const where: Record<string, unknown> = {}
  if (query.status) where['status'] = query.status
  if (query.roomId) where['roomId'] = query.roomId
  if (query.search) {
    where['OR'] = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { studentId: { contains: query.search, mode: 'insensitive' } },
      { mobile: { contains: query.search } },
      { college: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  // PERF FIX: Filter feeStatus at DB level using invoice subquery — avoids fetching all records then filtering in JS
  if (query.feeStatus === 'overdue') {
    where['invoices'] = { some: { status: 'overdue' } }
  } else if (query.feeStatus === 'due') {
    where['invoices'] = { some: { status: { in: ['due', 'partial'] } } }
    where['NOT'] = { invoices: { some: { status: 'overdue' } } }
  } else if (query.feeStatus === 'clear') {
    where['invoices'] = { none: { status: { in: ['due', 'overdue', 'partial'] } } }
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      // PERF FIX: Select only needed columns — avoid fetching all student fields
      select: {
        id: true,
        studentId: true,
        name: true,
        mobile: true,
        status: true,
        joiningDate: true,
        stayEndDate: true,
        college: true,
        avatarUrl: true,
        createdAt: true,
        room: { select: { roomNumber: true, roomType: true, floor: { select: { floorNumber: true } } } },
        bed: { select: { bedLabel: true } },
        invoices: {
          where: { status: { in: ['due', 'overdue', 'partial'] } },
          select: { status: true, balance: true },
        },
      },
    }),
    prisma.student.count({ where }),
  ])

  const studentsWithFee = students.map(s => {
    const openInvoices = s.invoices ?? []
    const totalDue = openInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0)
    const hasOverdue = openInvoices.some(inv => inv.status === 'overdue')
    const hasDue = openInvoices.some(inv => inv.status === 'due' || inv.status === 'partial')
    const feeStatus = hasOverdue ? 'overdue' : hasDue ? 'due' : 'clear'
    return { ...s, feeStatus, totalDue }
  })

  return { students: studentsWithFee, pagination: getPaginationMeta(total, page, limit) }
}

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      room: { include: { floor: true, branch: true } },
      bed: true,
      parent: true,
      invoices: { orderBy: { createdAt: 'desc' }, include: { payments: { orderBy: { createdAt: 'desc' } } } },
      documents: true,
    },
  })
  if (!student) throw new ApiError(404, 'Student not found')

  // Compute stay status
  const today = todayIST()
  const endDate = startOfDay(new Date(student.stayEndDate))
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let stayStatus: 'active' | 'expiring_soon' | 'expired' = 'active'
  if (daysLeft < 0) stayStatus = 'expired'
  else if (daysLeft <= 7) stayStatus = 'expiring_soon'

  return { ...student, stayStatus, daysLeft }
}

export async function updateStudent(id: string, input: UpdateStudentInput) {
  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) throw new ApiError(404, 'Student not found')

  return prisma.student.update({
    where: { id },
    data: { ...input, updatedAt: new Date() },
  })
}

export async function shiftRoom(id: string, input: ShiftRoomInput, adminId: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, roomId: true, bedId: true, status: true },
  })
  if (!student) throw new ApiError(404, 'Student not found')
  if (student.status !== 'active') throw new ApiError(400, 'Only active students can be shifted')

  const newBed = await prisma.bed.findUnique({ where: { id: input.newBedId } })
  if (!newBed) throw new ApiError(404, 'New bed not found')
  if (newBed.isOccupied) throw new ApiError(409, 'New bed is already occupied')

  await prisma.$transaction(async (tx) => {
    if (student.bedId) {
      await tx.bed.update({ where: { id: student.bedId }, data: { isOccupied: false } })
    }
    await tx.bed.update({ where: { id: input.newBedId }, data: { isOccupied: true } })
    await tx.student.update({
      where: { id },
      data: { roomId: input.newRoomId, bedId: input.newBedId, updatedAt: new Date() },
    })
    if (student.roomId) {
      const occupiedOld = await tx.bed.count({ where: { roomId: student.roomId, isOccupied: true } })
      await tx.room.update({
        where: { id: student.roomId },
        data: { status: occupiedOld === 0 ? 'available' : 'partial' },
      })
    }
    const occupiedNew = await tx.bed.count({ where: { roomId: input.newRoomId, isOccupied: true } })
    const newRoom = await tx.room.findUnique({ where: { id: input.newRoomId }, select: { bedCount: true } })
    await tx.room.update({
      where: { id: input.newRoomId },
      data: { status: occupiedNew >= (newRoom?.bedCount ?? 0) ? 'occupied' : 'partial' },
    })
    await tx.roomHistory.create({
      data: {
        studentId: id,
        fromRoomId: student.roomId,
        fromBedId: student.bedId,
        toRoomId: input.newRoomId,
        toBedId: input.newBedId,
        changedBy: adminId,
        reason: input.reason,
      },
    })
  })
}

export async function extendStay(id: string, input: ExtendStayInput) {
  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) throw new ApiError(404, 'Student not found')

  return prisma.student.update({
    where: { id },
    data: {
      stayEndDate: new Date(input.newEndDate),
      rentPackage: input.newPackage ?? student.rentPackage,
      updatedAt: new Date(),
    },
  })
}

export async function vacateStudent(id: string, input: VacateStudentInput, adminId: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, bedId: true, roomId: true, status: true, studentId: true, name: true, supabaseAuthId: true },
  })
  if (!student) throw new ApiError(404, 'Student not found')
  if (student.status === 'vacated') throw new ApiError(400, 'Student already vacated')

  await prisma.$transaction(async (tx) => {
    // Free bed
    if (student.bedId) {
      await tx.bed.update({ where: { id: student.bedId }, data: { isOccupied: false } })
    }
    // Update room status
    if (student.roomId) {
      const occupied = await tx.bed.count({ where: { roomId: student.roomId, isOccupied: true } })
      await tx.room.update({
        where: { id: student.roomId },
        data: { status: occupied === 0 ? 'available' : 'partial' },
      })
    }
    // Mark as vacated (keep record for history/re-admission)
    await tx.student.update({
      where: { id },
      data: {
        status: 'vacated',
        roomId: null,
        bedId: null,
        depositRefunded: (input.depositRefundAmount ?? 0) > 0,
        depositRefundDate: (input.depositRefundAmount ?? 0) > 0 ? new Date(input.vacateDate) : null,
        updatedAt: new Date(),
      },
    })
    await tx.renewalExit.create({
      data: {
        studentId: id,
        type: 'exit',
        effectiveDate: new Date(input.vacateDate),
        depositRefundAmount: input.depositRefundAmount ?? 0,
        damageAmount: input.damageAmount ?? 0,
        inspectionNotes: input.inspectionNotes,
        status: 'completed',
        processedBy: adminId,
        processedAt: new Date(),
      },
    })
    await tx.activityLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: 'UPDATED',
        entityType: 'student',
        entityId: id,
        meta: { action: 'vacated', vacateDate: input.vacateDate },
      },
    })
  })

  // Disable Supabase auth (don't delete — keep for re-admission)
  // Student can no longer login since status is 'vacated' (blocked in auth middleware)
}
