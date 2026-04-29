import { sendWhatsAppMessage, templates } from './whatsapp.service'
import { env } from '../config/env'
import { formatIST } from '../utils/indianTime'
import { prisma } from '../config/prisma'

// ── Helper: fetch PG details for a student ────────────────────────────────
async function getPgDetails(studentId: string): Promise<{
  pgName: string
  pgAddress?: string
  pgContact?: string
  roomNumber?: string
}> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        room: {
          select: {
            roomNumber: true,
            branch: {
              select: { name: true, address: true, city: true, state: true, contactPrimary: true },
            },
          },
        },
      },
    })
    const branch = student?.room?.branch
    const addressParts = [branch?.address, branch?.city, branch?.state].filter(Boolean)
    return {
      pgName: branch?.name ?? env.PG_NAME,
      pgAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      pgContact: branch?.contactPrimary ?? undefined,
      roomNumber: student?.room?.roomNumber ?? undefined,
    }
  } catch {
    return { pgName: env.PG_NAME }
  }
}

// ── Helper: fetch PG details by branchId ─────────────────────────────────
async function getPgDetailsByBranch(branchId: string): Promise<{
  pgName: string
  pgAddress?: string
  pgContact?: string
}> {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true, address: true, city: true, state: true, contactPrimary: true },
    })
    const addressParts = [branch?.address, branch?.city, branch?.state].filter(Boolean)
    return {
      pgName: branch?.name ?? env.PG_NAME,
      pgAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      pgContact: branch?.contactPrimary ?? undefined,
    }
  } catch {
    return { pgName: env.PG_NAME }
  }
}

// ── ADMISSION ─────────────────────────────────────────────────────────────
export async function notifyAdmission(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  fatherMobile?: string
  password: string
  roomNumber: string
  bedLabel: string
  joiningDate?: string
  branchId?: string
}): Promise<void> {
  const pg = data.branchId
    ? await getPgDetailsByBranch(data.branchId)
    : { pgName: env.PG_NAME }

  const studentMsg = templates.admissionWelcome({
    name: data.studentName,
    pgName: pg.pgName,
    pgAddress: pg.pgAddress,
    pgContact: pg.pgContact,
    studentId: data.studentId,
    password: data.password,
    portalUrl: env.STUDENT_PORTAL_URL,
    roomNumber: data.roomNumber,
    bedLabel: data.bedLabel,
    joiningDate: data.joiningDate,
  })

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: studentMsg,
    studentId: data.studentDbId,
    templateName: 'ADMISSION_WELCOME',
  })

  if (data.fatherMobile && data.fatherMobile !== data.mobile) {
    const parentMsg = templates.admissionWelcomeParent({
      studentName: data.studentName,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      studentId: data.studentId,
      password: data.password,
      portalUrl: env.STUDENT_PORTAL_URL,
      roomNumber: data.roomNumber,
      bedLabel: data.bedLabel,
      joiningDate: data.joiningDate,
    })
    await sendWhatsAppMessage({
      mobile: data.fatherMobile,
      message: parentMsg,
      studentId: data.studentDbId,
      templateName: 'ADMISSION_WELCOME_PARENT',
    })
  }
}

// ── PAYMENT CONFIRMED (admin records cash / UTR verified) ─────────────────
export async function notifyPaymentConfirmed(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  amount: number
  paymentMode: string
  receiptNumber: string
  paidDate: Date
  description?: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.paymentConfirmed({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      amount: data.amount.toLocaleString('en-IN'),
      date: formatIST(data.paidDate),
      mode: data.paymentMode.replace(/_/g, ' '),
      receiptNumber: data.receiptNumber,
      description: data.description,
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: 'PAYMENT_CONFIRMED',
  })
}

// ── UTR SUBMITTED — notify admin ──────────────────────────────────────────
export async function notifyUtrSubmittedAdmin(data: {
  studentDbId: string
  studentName: string
  studentId: string
  adminMobile: string
  amount: number
  utr: string
  paymentMode: string
  invoiceDescription?: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.adminMobile,
    message: templates.utrSubmittedAdmin({
      studentName: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      amount: data.amount.toLocaleString('en-IN'),
      utr: data.utr,
      mode: data.paymentMode,
      invoiceDescription: data.invoiceDescription,
      adminPortalUrl: env.ADMIN_PORTAL_URL,
    }),
    templateName: 'UTR_SUBMITTED_ADMIN',
  })
}

// ── UTR VERIFIED — notify student ─────────────────────────────────────────
export async function notifyUtrVerified(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  amount: number
  utr: string
  receiptNumber: string
  description?: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.utrVerified({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      amount: data.amount.toLocaleString('en-IN'),
      utr: data.utr,
      receiptNumber: data.receiptNumber,
      description: data.description,
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: 'UTR_VERIFIED',
  })
}

// ── UTR REJECTED — notify student ─────────────────────────────────────────
export async function notifyUtrRejected(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  amount: number
  utr: string
  reason: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.utrRejected({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      amount: data.amount.toLocaleString('en-IN'),
      utr: data.utr,
      reason: data.reason,
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: 'UTR_REJECTED',
  })
}

// ── ONLINE PAYMENT REQUEST — notify admin ─────────────────────────────────
export async function notifyOnlinePaymentRequest(data: {
  studentDbId: string
  studentName: string
  studentId: string
  adminMobile: string
  amount: number
  invoiceDescription?: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.adminMobile,
    message: templates.onlinePaymentRequest({
      studentName: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      amount: data.amount.toLocaleString('en-IN'),
      invoiceDescription: data.invoiceDescription,
      adminPortalUrl: env.ADMIN_PORTAL_URL,
    }),
    templateName: 'ONLINE_PAYMENT_REQUEST_ADMIN',
  })
}

// ── CASHFREE PAYMENT SUCCESS — notify student ─────────────────────────────
export async function notifyOnlinePaymentSuccess(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  amount: number
  receiptNumber: string
  paymentId: string
  description?: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.onlinePaymentSuccess({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      amount: data.amount.toLocaleString('en-IN'),
      receiptNumber: data.receiptNumber,
      paymentId: data.paymentId,
      description: data.description,
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: 'ONLINE_PAYMENT_SUCCESS',
  })
}

// ── COMPLAINT RESOLVED ────────────────────────────────────────────────────
export async function notifyComplaintResolved(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  complaintNumber: string
  category: string
  resolutionNote: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.complaintResolved({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      complaintId: data.complaintNumber,
      category: data.category,
      note: data.resolutionNote,
    }),
    studentId: data.studentDbId,
    templateName: 'COMPLAINT_RESOLVED',
  })
}

// ── OUTPASS STATUS ────────────────────────────────────────────────────────
export async function notifyOutpassStatus(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  fromDate: Date
  toDate: Date
  status: string
  note?: string
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)
  const dates = `${formatIST(data.fromDate)} to ${formatIST(data.toDate)}`

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.outpassStatus({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      dates,
      status: data.status,
      note: data.note,
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: `OUTPASS_${data.status.toUpperCase()}`,
  })
}

// ── STAY EXPIRY ───────────────────────────────────────────────────────────
export async function notifyStayExpiry(data: {
  studentDbId: string
  studentName: string
  studentId: string
  mobile: string
  endDate: Date
}): Promise<void> {
  const pg = await getPgDetails(data.studentDbId)

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.stayExpiry({
      name: data.studentName,
      studentId: data.studentId,
      roomNumber: pg.roomNumber,
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      endDate: formatIST(data.endDate),
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: 'STAY_EXPIRY',
  })
}

// ── NOTICE ALERT ──────────────────────────────────────────────────────────
export async function notifyNotice(data: {
  studentDbId?: string
  mobile: string
  title: string
  description: string
  date: Date
  category?: string
  priority?: string
  branchId?: string
}): Promise<void> {
  const pg = data.branchId
    ? await getPgDetailsByBranch(data.branchId)
    : { pgName: env.PG_NAME }

  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.noticeAlert({
      title: data.title,
      description: data.description,
      date: formatIST(data.date),
      pgName: pg.pgName,
      pgAddress: pg.pgAddress,
      pgContact: pg.pgContact,
      category: data.category,
      priority: data.priority,
      portalUrl: env.STUDENT_PORTAL_URL,
    }),
    studentId: data.studentDbId,
    templateName: 'NOTICE_ALERT',
  })
}

// ── PASSWORD RESET OTP ────────────────────────────────────────────────────
export async function notifyPasswordResetOtp(data: {
  mobile: string
  otp: string
  pgName?: string
  pgContact?: string
}): Promise<void> {
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.passwordResetOtp({
      otp: data.otp,
      pgName: data.pgName ?? env.PG_NAME,
      pgContact: data.pgContact,
    }),
    templateName: 'PASSWORD_RESET_OTP',
  })
}
