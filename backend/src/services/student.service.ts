import { prisma } from '../config/prisma'
import { supabaseAdmin } from '../config/supabase'
import { generateStudentId, generateInvoiceNumber, generateReceiptNumber } from '../utils/studentId'
import { stayEndDate, todayIST } from '../utils/indianTime'
import { startOfDay } from 'date-fns'
import { generateTempPassword } from '../utils/hash'
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

  const tempPassword = generateTempPassword()
  const joinDate = new Date(input.joiningDate)
  const studentId = await generateStudentId(joinDate)
  const endDate = stayEndDate(joinDate, input.stayDuration)

  // Create Supabase auth user
  const email = input.email ?? `${studentId.toLowerCase()}@pg-hostel.local`
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
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
        stayDuration: input.stayDuration,
        stayEndDate: endDate,
        roomId: input.roomId,
        bedId: input.bedId,
        rentPackage: input.rentPackage,
        depositAmount: input.depositAmount,
        notes: input.notes,
        avatarUrl: input.avatarUrl,
        status: 'active',
        isFirstLogin: true,
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

  // Handle initial payment if provided
  let invoice = null
  let payment = null
  let receiptNumber = null

  if (input.initialPayment) {
    const { paymentMode, transactionRef } = input.initialPayment
    const room = student.room
    const branch = room?.branch

    // Calculate first period fee
    let feeAmount = 0
    if (input.rentPackage === 'semester') feeAmount = Number(room?.semesterRent ?? 0)
    else if (input.rentPackage === 'monthly') feeAmount = Number(room?.monthlyRent ?? 0) * 6
    else if (input.rentPackage === 'annual') feeAmount = Number(room?.annualRent ?? 0)

    if (feeAmount > 0) {
      const invoiceNumber = await generateInvoiceNumber()
      const dueDate = new Date(joinDate)
      dueDate.setDate(dueDate.getDate() + 7)

      invoice = await prisma.invoice.create({
        data: {
          studentId: student.id,
          invoiceNumber,
          type: 'rent',
          description: `First ${input.rentPackage} fee — ${input.rentPackage === 'semester' ? `Sem ${input.semester}` : 'Period 1'}`,
          amount: feeAmount,
          totalAmount: feeAmount,
          balance: feeAmount,
          dueDate,
          generatedBy: adminId,
          status: 'due',
        },
      })

      if (paymentMode === 'cash' || paymentMode === 'semi_offline') {
        receiptNumber = await generateReceiptNumber()
        payment = await prisma.$transaction(async (tx) => {
          const p = await tx.payment.create({
            data: {
              invoiceId: invoice!.id,
              studentId: student.id,
              receiptNumber: receiptNumber!,
              amount: feeAmount,
              paymentMode: paymentMode === 'semi_offline' ? 'bank_transfer' : 'cash',
              transactionRef: transactionRef,
              paidDate: joinDate,
              recordedBy: adminId,
              notes: `Initial payment at admission — ${paymentMode}`,
            },
          })
          await tx.invoice.update({
            where: { id: invoice!.id },
            data: { paidAmount: feeAmount, balance: 0, status: 'paid' },
          })
          return p
        })
      }
    }
  }

  return { student, tempPassword, invoice, payment, receiptNumber }
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

    // Delete all related records in order
    await tx.whatsappLog.deleteMany({ where: { studentId: id } })
    await tx.feedback.deleteMany({ where: { studentId: id } })
    await tx.outpass.deleteMany({ where: { studentId: id } })
    await tx.complaintComment.deleteMany({ where: { complaint: { studentId: id } } })
    await tx.complaint.deleteMany({ where: { studentId: id } })
    await tx.document.deleteMany({ where: { studentId: id } })
    await tx.extraCharge.deleteMany({ where: { studentId: id } })
    await tx.roomHistory.deleteMany({ where: { studentId: id } })
    await tx.renewalExit.deleteMany({ where: { studentId: id } })
    await tx.payment.deleteMany({ where: { studentId: id } })
    await tx.invoice.deleteMany({ where: { studentId: id } })
    await tx.parent.deleteMany({ where: { studentId: id } })
    await tx.student.delete({ where: { id } })

    // Activity log
    await tx.activityLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: 'DELETED',
        entityType: 'student',
        entityId: id,
        meta: { studentId: student.studentId, name: student.name, outstandingBalance },
      },
    })
  })

  // Delete Supabase auth user
  if (student.supabaseAuthId) {
    await supabaseAdmin.auth.admin.deleteUser(student.supabaseAuthId).catch(() => {})
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
  const endDate = stayEndDate(joinDate, input.stayDuration)

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
        stayDuration: input.stayDuration,
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

  // Create first period invoice
  let feeAmount = 0
  if (newRoom) {
    if (input.rentPackage === 'semester') feeAmount = Number(newRoom.semesterRent ?? 0)
    else if (input.rentPackage === 'monthly') feeAmount = Number(newRoom.monthlyRent ?? 0) * 6
    else if (input.rentPackage === 'annual') feeAmount = Number(newRoom.annualRent ?? 0)
  }

  let invoice = null
  if (feeAmount > 0) {
    const invoiceNumber = await generateInvoiceNumber()
    const dueDate = new Date(joinDate)
    dueDate.setDate(dueDate.getDate() + 7)
    invoice = await prisma.invoice.create({
      data: {
        studentId: id,
        invoiceNumber,
        type: 'rent',
        description: `Renewal — first ${input.rentPackage} fee`,
        amount: feeAmount,
        totalAmount: feeAmount,
        balance: feeAmount,
        dueDate,
        generatedBy: adminId,
        status: 'due',
      },
    })
  }

  // Send WhatsApp welcome message (non-blocking)
  const { notifyAdmission } = await import('./notification.service')
  const bed = await prisma.bed.findUnique({ where: { id: input.bedId } })
  notifyAdmission({
    studentName: student.name,
    studentId: student.studentId,
    mobile: student.mobile,
    tempPassword: '(use existing password)',
    roomNumber: newRoom?.roomNumber ?? '',
    bedLabel: bed?.bedLabel ?? '',
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

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
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

  const filtered = query.feeStatus
    ? studentsWithFee.filter(s => s.feeStatus === query.feeStatus)
    : studentsWithFee

  return { students: filtered, pagination: getPaginationMeta(total, page, limit) }
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
    select: { id: true, bedId: true, roomId: true, status: true },
  })
  if (!student) throw new ApiError(404, 'Student not found')
  if (student.status === 'vacated') throw new ApiError(400, 'Student already vacated')

  await prisma.$transaction(async (tx) => {
    if (student.bedId) {
      await tx.bed.update({ where: { id: student.bedId }, data: { isOccupied: false } })
    }
    if (student.roomId) {
      const occupied = await tx.bed.count({ where: { roomId: student.roomId, isOccupied: true } })
      await tx.room.update({
        where: { id: student.roomId },
        data: { status: occupied === 0 ? 'available' : 'partial' },
      })
    }
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
}
