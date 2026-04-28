import { sendWhatsAppMessage, templates } from './whatsapp.service'
import { env } from '../config/env'
import { formatIST } from '../utils/indianTime'

export async function notifyAdmission(data: {
  studentName: string
  studentId: string
  mobile: string
  tempPassword: string
  roomNumber: string
  bedLabel: string
}): Promise<void> {
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.admissionWelcome({
      name: data.studentName,
      pgName: env.PG_NAME,
      studentId: data.studentId,
      password: data.tempPassword,
      portalUrl: env.STUDENT_PORTAL_URL,
      roomNumber: data.roomNumber,
      bedLabel: data.bedLabel,
    }),
    templateName: 'ADMISSION_WELCOME',
  })
}

export async function notifyPaymentConfirmed(data: {
  studentName: string
  mobile: string
  amount: number
  paymentMode: string
  receiptNumber: string
  paidDate: Date
}): Promise<void> {
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.paymentConfirmed({
      name: data.studentName,
      amount: data.amount.toLocaleString('en-IN'),
      date: formatIST(data.paidDate),
      mode: data.paymentMode.replace('_', ' '),
      receiptNumber: data.receiptNumber,
      pgName: env.PG_NAME,
    }),
    templateName: 'PAYMENT_CONFIRMED',
  })
}

export async function notifyComplaintResolved(data: {
  studentName: string
  mobile: string
  complaintNumber: string
  category: string
  resolutionNote: string
}): Promise<void> {
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.complaintResolved({
      name: data.studentName,
      complaintId: data.complaintNumber,
      category: data.category,
      note: data.resolutionNote,
      pgName: env.PG_NAME,
    }),
    templateName: 'COMPLAINT_RESOLVED',
  })
}

export async function notifyOutpassStatus(data: {
  studentName: string
  mobile: string
  fromDate: Date
  toDate: Date
  status: string
  note?: string
}): Promise<void> {
  const dates = `${formatIST(data.fromDate)} to ${formatIST(data.toDate)}`
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.outpassStatus({
      name: data.studentName,
      dates,
      status: data.status,
      note: data.note,
      pgName: env.PG_NAME,
    }),
    templateName: `OUTPASS_${data.status.toUpperCase()}`,
  })
}

export async function notifyStayExpiry(data: {
  studentName: string
  mobile: string
  endDate: Date
}): Promise<void> {
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.stayExpiry({
      name: data.studentName,
      endDate: formatIST(data.endDate),
      pgName: env.PG_NAME,
    }),
    templateName: 'STAY_EXPIRY',
  })
}

export async function notifyNotice(data: {
  mobile: string
  title: string
  description: string
  date: Date
}): Promise<void> {
  await sendWhatsAppMessage({
    mobile: data.mobile,
    message: templates.noticeAlert({
      title: data.title,
      description: data.description,
      date: formatIST(data.date),
      pgName: env.PG_NAME,
    }),
    templateName: 'NOTICE_ALERT',
  })
}
