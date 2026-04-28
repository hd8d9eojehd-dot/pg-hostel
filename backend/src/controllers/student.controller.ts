import { Request, Response, NextFunction } from 'express'
import * as studentService from '../services/student.service'
import { generateReceiptPdf, generateIdCardPdf } from '../services/pdf.service'
import { notifyAdmission } from '../services/notification.service'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import type { CreateStudentInput, UpdateStudentInput, ShiftRoomInput, ExtendStayInput, VacateStudentInput, RenewStudentInput, DeleteStudentInput } from '@pg-hostel/shared'
import { env } from '../config/env'
import * as crypto from 'crypto'

// Simple JWT-like signing using HMAC-SHA256 (replaces jsonwebtoken dependency)
function signPayload(payload: Record<string, unknown>, secret: string, expiresInSeconds = 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyPayload(token: string, secret: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')
  const [header, body, sig] = parts
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  if (sig !== expected) throw new Error('Invalid signature')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Record<string, unknown>
  if (typeof payload['exp'] === 'number' && payload['exp'] < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
  return payload
}

const jwt = { sign: signPayload, verify: verifyPayload }

export async function createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.createStudent(
      req.body as CreateStudentInput,
      req.user!.id
    )
    const { student, tempPassword, invoice, payment, receiptNumber } = result

    // Send WhatsApp welcome message
    if (student.room && student.bed) {
      notifyAdmission({
        studentName: student.name,
        studentId: student.studentId,
        mobile: student.mobile,
        tempPassword,
        roomNumber: student.room.roomNumber,
        bedLabel: student.bed.bedLabel,
      }).catch(() => { /* non-blocking */ })
    }

    res.status(201).json({
      success: true,
      message: 'Student admitted successfully',
      data: { student, tempPassword, invoice, payment, receiptNumber },
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteStudentPermanently(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.deleteStudent(
      req.params['id']!,
      req.body as DeleteStudentInput,
      req.user!.id
    )
    res.json({ success: true, message: 'Student permanently deleted', data: result })
  } catch (err) {
    next(err)
  }
}

export async function renewStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.renewStudent(
      req.params['id']!,
      req.body as RenewStudentInput,
      req.user!.id
    )
    res.json({ success: true, message: 'Student renewed successfully', data: result })
  } catch (err) {
    next(err)
  }
}

export async function getIdCardData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.user!.id
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        room: { include: { branch: true, floor: true } },
        bed: true,
        invoices: { where: { status: { in: ['due', 'overdue', 'partial'] } }, select: { status: true, balance: true } },
      },
    })
    if (!student) throw new ApiError(404, 'Student not found')

    const openInvoices = student.invoices ?? []
    const totalDue = openInvoices.reduce((s, i) => s + Number(i.balance), 0)
    const hasOverdue = openInvoices.some(i => i.status === 'overdue')
    const feeStatus = hasOverdue ? 'overdue' : openInvoices.length > 0 ? 'due' : 'paid'

    const branch = student.room?.branch
    const hostelName = branch?.name ?? env.PG_NAME

    // Sign QR payload (24h expiry)
    const qrPayload = jwt.sign(
      {
        studentId: student.studentId,
        name: student.name,
        roomNumber: student.room?.roomNumber ?? '',
        bedLabel: student.bed?.bedLabel ?? '',
        branch: student.branch ?? '',
        feeStatus,
        hostelName,
      },
      env.JWT_SECRET
    )

    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)

    res.json({
      success: true,
      data: {
        studentId: student.studentId,
        name: student.name,
        branch: student.branch ?? '',
        college: student.college ?? '',
        roomNumber: student.room?.roomNumber ?? '',
        bedLabel: student.bed?.bedLabel ?? '',
        feeStatus,
        totalDue,
        avatarUrl: student.avatarUrl,
        hostelName,
        qrPayload,
        validUntil: validUntil.toISOString(),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function verifyQr(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query as { token: string }
    if (!token) throw new ApiError(400, 'Token required')

    let decoded: Record<string, unknown>
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>
    } catch {
      // Return HTML error page for browser scans
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html')
        res.send(`<!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:40px">
          <h2 style="color:#ef4444">❌ Invalid or Expired QR Code</h2>
          <p>This QR code has expired or is invalid. Please ask the student to refresh their ID card.</p>
        </body></html>`)
        return
      }
      res.status(401).json({ success: false, error: 'Invalid or expired QR code' })
      return
    }

    // Get live fee status
    const student = await prisma.student.findUnique({
      where: { studentId: decoded['studentId'] as string },
      include: {
        invoices: { where: { status: { in: ['due', 'overdue', 'partial'] } }, select: { status: true, balance: true } },
        room: { select: { roomNumber: true, roomType: true } },
        bed: { select: { bedLabel: true } },
      },
    })

    if (!student) {
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html')
        res.send(`<!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:40px"><h2>Student not found</h2></body></html>`)
        return
      }
      throw new ApiError(404, 'Student not found')
    }

    const openInvoices = student.invoices ?? []
    const totalDue = openInvoices.reduce((s, i) => s + Number(i.balance), 0)
    const hasOverdue = openInvoices.some(i => i.status === 'overdue')
    const liveFeeStatus = hasOverdue ? 'overdue' : openInvoices.length > 0 ? 'due' : 'paid'
    const feeColor = liveFeeStatus === 'paid' ? '#059669' : liveFeeStatus === 'overdue' ? '#dc2626' : '#d97706'

    const responseData = {
      ...decoded,
      feeStatus: liveFeeStatus,
      totalDue,
      roomNumber: student.room?.roomNumber ?? decoded['roomNumber'],
      bedLabel: student.bed?.bedLabel ?? decoded['bedLabel'],
      verified: true,
    }

    // Return HTML page for browser/Google Lens scans
    if (req.headers.accept?.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html')
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student ID - ${student.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .card { background: white; border-radius: 16px; overflow: hidden; max-width: 400px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; color: white; }
  .header h1 { font-size: 14px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .body { padding: 20px; }
  .avatar { width: 72px; height: 72px; border-radius: 50%; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #4f46e5; margin-bottom: 16px; overflow: hidden; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-size: 22px; font-weight: 700; color: #1e293b; }
  .id { font-family: monospace; font-size: 14px; color: #4f46e5; font-weight: 600; margin-top: 4px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: #64748b; }
  .value { font-weight: 600; color: #1e293b; }
  .fee-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background: ${liveFeeStatus === 'paid' ? '#d1fae5' : liveFeeStatus === 'overdue' ? '#fee2e2' : '#fef3c7'}; color: ${feeColor}; }
  .verified { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-top: 16px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #166534; }
  .footer { padding: 12px 20px; background: #f8fafc; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Student ID Card</h1>
    <h2>${decoded['hostelName'] ?? 'PG Hostel'}</h2>
  </div>
  <div class="body">
    <div class="avatar">${student.avatarUrl ? `<img src="${student.avatarUrl}" alt="${student.name}" />` : student.name.charAt(0)}</div>
    <div class="name">${student.name}</div>
    <div class="id">${student.studentId}</div>
    <div style="margin-top: 16px;">
      <div class="row"><span class="label">Branch</span><span class="value">${decoded['branch'] ?? '—'}</span></div>
      <div class="row"><span class="label">Room</span><span class="value">${student.room?.roomNumber ?? '—'} / Bed ${student.bed?.bedLabel ?? '—'}</span></div>
      <div class="row"><span class="label">Fee Status</span><span class="fee-badge">${liveFeeStatus === 'paid' ? '✓ Paid' : liveFeeStatus === 'overdue' ? '⚠ Overdue' : '⏳ Due'}</span></div>
      ${totalDue > 0 ? `<div class="row"><span class="label">Amount Due</span><span class="value" style="color:#dc2626">₹${totalDue.toLocaleString('en-IN')}</span></div>` : ''}
    </div>
    <div class="verified">✅ Verified — Live data as of ${new Date().toLocaleString('en-IN')}</div>
  </div>
  <div class="footer">Valid until ${new Date(decoded['exp'] as number * 1000).toLocaleDateString('en-IN')} · Scan QR for live updates</div>
</div>
</body>
</html>`)
      return
    }

    res.json({ success: true, data: responseData })
  } catch (err) {
    if ((err as { name?: string }).name === 'JsonWebTokenError' || (err as { name?: string }).name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Invalid or expired QR code' })
      return
    }
    next(err)
  }
}

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await studentService.getStudents(req.query as Record<string, string>)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await studentService.getStudentById(req.params['id']!)
    res.json({ success: true, data: student })
  } catch (err) {
    next(err)
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await studentService.updateStudent(req.params['id']!, req.body as UpdateStudentInput)
    res.json({ success: true, message: 'Student updated', data: student })
  } catch (err) {
    next(err)
  }
}

export async function shiftRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await studentService.shiftRoom(req.params['id']!, req.body as ShiftRoomInput, req.user!.id)
    res.json({ success: true, message: 'Room shifted successfully' })
  } catch (err) {
    next(err)
  }
}

export async function extendStay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await studentService.extendStay(req.params['id']!, req.body as ExtendStayInput)
    res.json({ success: true, message: 'Stay extended', data: student })
  } catch (err) {
    next(err)
  }
}

export async function vacateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await studentService.vacateStudent(req.params['id']!, req.body as VacateStudentInput, req.user!.id)
    res.json({ success: true, message: 'Student vacated successfully' })
  } catch (err) {
    next(err)
  }
}

export async function downloadIdCard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params['id']! },
      include: { room: { include: { branch: true } }, bed: true },
    })
    if (!student) throw new ApiError(404, 'Student not found')
    if (!student.room || !student.bed) throw new ApiError(400, 'Student has no room assigned')

    const branch = student.room.branch
    const pdf = await generateIdCardPdf({
      studentName: student.name,
      studentId: student.studentId,
      roomNumber: student.room.roomNumber,
      bedLabel: student.bed.bedLabel,
      college: student.college ?? '',
      course: student.course ?? '',
      validUntil: student.stayEndDate,
      avatarUrl: student.avatarUrl ?? undefined,
      pgName: branch?.name ?? env.PG_NAME,
      pgContact: branch?.contactPrimary ?? '9876543210',
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="id-card-${student.studentId}.pdf"`)
    res.send(pdf)
  } catch (err) {
    next(err)
  }
}

export async function getStudentStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total, active, reserved, pending, vacated] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'active' } }),
      prisma.student.count({ where: { status: 'reserved' } }),
      prisma.student.count({ where: { status: 'pending' } }),
      prisma.student.count({ where: { status: 'vacated' } }),
    ])
    res.json({ success: true, data: { total, active, reserved, pending, vacated } })
  } catch (err) {
    next(err)
  }
}
