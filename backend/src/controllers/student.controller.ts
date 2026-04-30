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
    const { student, password, invoice, payment, receiptNumber } = result

    // PERF FIX: Invalidate student list and stats caches after admission
    const { invalidateCache } = await import('../middleware/cache.middleware')
    await Promise.all([
      invalidateCache('cache:students:list:*'),
      invalidateCache('cache:students:stats'),
      invalidateCache('cache:students:course-groups'),
      invalidateCache('cache:rooms:*'),
      invalidateCache('cache:dashboard:*'),
    ]).catch(() => {})

    // Send WhatsApp welcome message to student and father
    if (student.room && student.bed) {
      notifyAdmission({
        studentDbId: student.id,
        studentName: student.name,
        studentId: student.studentId,
        mobile: student.mobile,
        fatherMobile: student.parentMobile ?? undefined,
        password,
        roomNumber: student.room.roomNumber,
        bedLabel: student.bed.bedLabel,
        joiningDate: student.joiningDate
          ? new Date(student.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : undefined,
        branchId: (student.room as { branchId?: string }).branchId,
      }).catch(() => { /* non-blocking */ })
    }

    res.status(201).json({
      success: true,
      message: 'Student admitted successfully',
      data: { student, password, invoice, payment, receiptNumber },
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
    // PERF FIX: Invalidate all related caches after permanent delete
    const { invalidateCache } = await import('../middleware/cache.middleware')
    await Promise.all([
      invalidateCache(`cache:students:${req.params['id']!}`),
      invalidateCache('cache:students:list:*'),
      invalidateCache('cache:students:stats'),
      invalidateCache('cache:rooms:*'),
      invalidateCache('cache:dashboard:*'),
      invalidateCache(`cache:portal:*`),
    ]).catch(() => {})
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

    // QR encodes a SHORT URL with just the studentId - keeps QR simple and scannable by any lens
    // The verify endpoint does a live DB lookup, no JWT needed
    const qrPayload = student.studentId  // e.g. "PG-2026-0001" - very short, easy to scan

    // Valid until = stay end date (matches what's shown on the card)
    const validUntil = student.stayEndDate

    res.json({
      success: true,
      data: {
        studentId: student.studentId,
        name: student.name,
        branch: student.branch ?? '',
        course: student.course ?? '',
        college: student.college ?? '',
        currentSem: student.semester ?? 1,
        totalSems: (student as { totalSemesters?: number }).totalSemesters ?? 8,
        joiningDate: student.joiningDate,
        stayEndDate: student.stayEndDate,
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
    // Accept either ?token=PG-2026-0001 (new short format) or legacy JWT
    const { token } = req.query as { token: string }
    if (!token) throw new ApiError(400, 'Token required')

    // Determine if this is a plain studentId (short) or a JWT (long, contains dots)
    const isJwt = token.includes('.')
    let lookupStudentId: string

    if (isJwt) {
      // Legacy JWT path - still support old QR codes
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>
        lookupStudentId = decoded['studentId'] as string
      } catch {
        if (req.headers.accept?.includes('text/html')) {
          res.setHeader('Content-Type', 'text/html')
          res.send(`<!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:40px">
            <h2 style="color:#ef4444">âŒ Invalid or Expired QR Code</h2>
            <p>This QR code has expired. Please ask the student to refresh their ID card.</p>
          </body></html>`)
          return
        }
        res.status(401).json({ success: false, error: 'Invalid or expired QR code' })
        return
      }
    } else {
      // New short format - plain studentId like "PG-2026-0001"
      lookupStudentId = token
    }

    // Live DB lookup - always fresh data
    const student = await prisma.student.findUnique({
      where: { studentId: lookupStudentId },
      include: {
        invoices: { where: { status: { in: ['due', 'overdue', 'partial'] } }, select: { status: true, balance: true } },
        room: { include: { branch: true } },
        bed: { select: { bedLabel: true } },
      },
    })

    if (!student) {
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html')
        res.send(`<!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:40px"><h2 style="color:#ef4444">Student not found</h2><p>This student ID is not registered in the system.</p></body></html>`)
        return
      }
      throw new ApiError(404, 'Student not found')
    }

    // Show vacated students clearly — they are no longer residents
    if (student.status === 'vacated') {
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html')
        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Student Vacated</title>
        <style>body{font-family:-apple-system,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
        .card{background:white;border-radius:16px;overflow:hidden;max-width:400px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.12)}
        .header{background:linear-gradient(135deg,#dc2626,#b91c1c);padding:20px;color:white}
        .body{padding:20px}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
        .label{color:#64748b}.value{font-weight:600;color:#1e293b}
        .badge{display:inline-flex;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:600;background:#fee2e2;color:#dc2626}
        .footer{padding:12px 20px;background:#f8fafc;font-size:11px;color:#94a3b8;text-align:center}</style></head>
        <body><div class="card">
        <div class="header"><h1 style="font-size:13px;opacity:.8;text-transform:uppercase;letter-spacing:1px">Student ID Verification</h1>
        <h2 style="font-size:20px;font-weight:700;margin-top:4px">${student.room?.branch?.name ?? env.PG_NAME}</h2></div>
        <div class="body">
        <div style="text-align:center;padding:16px 0">
          <div style="font-size:48px;margin-bottom:8px">🚪</div>
          <p style="font-size:18px;font-weight:700;color:#1e293b">${student.name}</p>
          <p style="font-family:monospace;font-size:13px;color:#4f46e5;margin-top:4px">${student.studentId}</p>
        </div>
        <div class="row"><span class="label">Status</span><span class="badge">Vacated</span></div>
        <div class="row"><span class="label">Last Stay Until</span><span class="value">${new Date(student.stayEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-top:16px;font-size:13px;color:#991b1b">
          ⚠️ This student has vacated and is no longer a resident.
        </div></div>
        <div class="footer">Verified · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · ${student.room?.branch?.name ?? env.PG_NAME}</div>
        </div></body></html>`)
        return
      }
      res.json({ success: true, data: { studentId: student.studentId, name: student.name, status: 'vacated', verified: true } })
      return
    }

    const openInvoices = student.invoices ?? []
    const totalDue = openInvoices.reduce((s, i) => s + Number(i.balance), 0)
    const hasOverdue = openInvoices.some(i => i.status === 'overdue')
    const liveFeeStatus = hasOverdue ? 'overdue' : openInvoices.length > 0 ? 'due' : 'paid'
    const feeColor = liveFeeStatus === 'paid' ? '#059669' : liveFeeStatus === 'overdue' ? '#dc2626' : '#d97706'
    const hostelName = student.room?.branch?.name ?? env.PG_NAME
    const stayEnd = new Date(student.stayEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

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
  .header h1 { font-size: 13px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .body { padding: 20px; }
  .top { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
  .avatar { width: 72px; height: 72px; border-radius: 12px; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #4f46e5; flex-shrink: 0; overflow: hidden; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .info .name { font-size: 20px; font-weight: 700; color: #1e293b; }
  .info .id { font-family: monospace; font-size: 13px; color: #4f46e5; font-weight: 600; margin-top: 2px; }
  .info .sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: #64748b; }
  .value { font-weight: 600; color: #1e293b; }
  .fee-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; background: ${liveFeeStatus === 'paid' ? '#d1fae5' : liveFeeStatus === 'overdue' ? '#fee2e2' : '#fef3c7'}; color: ${feeColor}; }
  .verified { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-top: 16px; font-size: 13px; color: #166534; }
  .footer { padding: 12px 20px; background: #f8fafc; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Student ID Verification</h1>
    <h2>${hostelName}</h2>
  </div>
  <div class="body">
    <div class="top">
      <div class="avatar">${student.avatarUrl ? `<img src="${student.avatarUrl}" alt="${student.name}" onerror="this.style.display='none';this.parentElement.textContent='${student.name.charAt(0)}'" />` : student.name.charAt(0)}</div>
      <div class="info">
        <div class="name">${student.name}</div>
        <div class="id">${student.studentId}</div>
        ${student.college ? `<div class="sub">${student.college}</div>` : ''}
        ${student.course || student.branch ? `<div class="sub">${[student.course, student.branch].filter(Boolean).join(' . ')}</div>` : ''}
      </div>
    </div>
    <div class="row"><span class="label">Room / Bed</span><span class="value">${student.room?.roomNumber ?? '-'} / Bed ${student.bed?.bedLabel ?? '-'}</span></div>
    <div class="row"><span class="label">Stay Valid Until</span><span class="value">${stayEnd}</span></div>
    <div class="row"><span class="label">Status</span><span class="value">${student.status}</span></div>
    <div class="row"><span class="label">Fee Status</span><span class="fee-badge">${liveFeeStatus === 'paid' ? '[OK] Paid' : liveFeeStatus === 'overdue' ? '[!] Overdue' : '[...] Due'}</span></div>
    ${totalDue > 0 ? `<div class="row"><span class="label">Amount Due</span><span class="value" style="color:#dc2626">Rs.${totalDue.toLocaleString('en-IN')}</span></div>` : ''}
    <div class="verified">[OK] Verified - Live data as of ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
  </div>
  <div class="footer">Scan QR for live updates . ${hostelName}</div>
</div>
</body>
</html>`)
      return
    }

    res.json({
      success: true,
      data: {
        studentId: student.studentId,
        name: student.name,
        branch: student.branch,
        course: student.course,
        college: student.college,
        roomNumber: student.room?.roomNumber,
        bedLabel: student.bed?.bedLabel,
        feeStatus: liveFeeStatus,
        totalDue,
        stayEndDate: student.stayEndDate,
        hostelName,
        verified: true,
      },
    })
  } catch (err) {
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
    const { createInvoiceForNewSem, ...updateData } = req.body as UpdateStudentInput & { createInvoiceForNewSem?: boolean }

    // ── Semester change validation ──────────────────────────────────────────
    if (updateData.semester !== undefined) {
      const currentStudent = await prisma.student.findUnique({
        where: { id: req.params['id']! },
        select: { semester: true, totalSemesters: true, updatedAt: true },
      })
      if (!currentStudent) throw new ApiError(404, 'Student not found')

      const currentSem = currentStudent.semester ?? 1
      const newSem = updateData.semester
      const totalSems = (currentStudent as { totalSemesters?: number }).totalSemesters ?? 8

      // Only allow 1 semester forward
      if (newSem !== currentSem + 1) {
        throw new ApiError(400, `Semester can only advance by 1 at a time (${currentSem} → ${currentSem + 1}). Cannot set to ${newSem}.`)
      }
      if (newSem > totalSems) {
        throw new ApiError(400, `Cannot advance beyond total semesters (${totalSems})`)
      }

      // Min 3 months, max 7 months since last update
      const lastUpdate = new Date(currentStudent.updatedAt)
      const now = new Date()
      const monthsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsSinceUpdate < 3) {
        throw new ApiError(400, `Semester can only be changed after 3 months. Last changed ${Math.floor(monthsSinceUpdate * 30)} days ago.`)
      }
      if (monthsSinceUpdate > 7) {
        // Allow but log — admin may be catching up
      }
    }

    const student = await studentService.updateStudent(req.params['id']!, updateData as UpdateStudentInput)

    // If semester changed and createInvoiceForNewSem flag is set, create a new invoice
    if (createInvoiceForNewSem && updateData.semester) {
      const newSem = updateData.semester
      const fullStudent = await prisma.student.findUnique({
        where: { id: req.params['id']! },
        select: {
          id: true, rentPackage: true, depositAmount: true, joiningDate: true, totalSemesters: true,
          room: { select: { semesterRent: true, monthlyRent: true, annualRent: true } },
        },
      })

      if (fullStudent) {
        // Recalculate stayEndDate based on new semester
        const { stayEndDateFromSemesters } = await import('../utils/indianTime')
        const totalSems = (fullStudent as { totalSemesters?: number }).totalSemesters ?? 8
        const newEndDate = stayEndDateFromSemesters(new Date(fullStudent.joiningDate), newSem, totalSems)
        const newDuration = `${(totalSems - newSem + 1) * 6}months`

        await prisma.student.update({
          where: { id: req.params['id']! },
          data: {
            stayEndDate: newEndDate,
            stayDuration: newDuration,
            updatedAt: new Date(),
          },
        })

        // Create invoice for new semester if room exists
        if (fullStudent.room) {
          let feePerSem = 0
          if (fullStudent.rentPackage === 'semester') feePerSem = Number(fullStudent.room.semesterRent ?? 0)
          else if (fullStudent.rentPackage === 'monthly') feePerSem = Number(fullStudent.room.monthlyRent ?? 0)
          else if (fullStudent.rentPackage === 'annual') feePerSem = Number(fullStudent.room.annualRent ?? 0)

          if (feePerSem > 0) {
            const existing = await prisma.invoice.findFirst({
              where: { studentId: req.params['id']!, type: 'rent', semesterNumber: newSem },
            })

            if (!existing) {
              const { generateInvoiceNumber } = await import('../utils/studentId')
              const invoiceNumber = await generateInvoiceNumber()
              const dueDate = new Date()
              dueDate.setDate(dueDate.getDate() + 7)

              await prisma.invoice.create({
                data: {
                  studentId: req.params['id']!,
                  invoiceNumber,
                  type: 'rent',
                  description: `Semester ${newSem} fee`,
                  amount: feePerSem,
                  totalAmount: feePerSem,
                  balance: feePerSem,
                  dueDate,
                  status: 'due',
                  semesterNumber: newSem,
                  generatedBy: req.user!.id,
                },
              })
            }
          }
        }
      }
    }

    // PERF FIX: Invalidate student caches after update
    const { invalidateCache } = await import('../middleware/cache.middleware')
    await Promise.all([
      invalidateCache(`cache:students:${req.params['id']!}`),
      invalidateCache('cache:students:list:*'),
      invalidateCache('cache:dashboard:*'),
      invalidateCache(`cache:portal:*`),
    ]).catch(() => {})

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
    // PERF FIX: Invalidate all student and room caches after vacate
    const { invalidateCache } = await import('../middleware/cache.middleware')
    await Promise.all([
      invalidateCache(`cache:students:${req.params['id']!}`),
      invalidateCache('cache:students:list:*'),
      invalidateCache('cache:students:stats'),
      invalidateCache('cache:rooms:*'),
      invalidateCache('cache:dashboard:*'),
    ]).catch(() => {})
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

// ── GET /students/course-groups — group active students by course+branch+currentSem ──
export async function getCourseGroups(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const students = await prisma.student.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        studentId: true,
        course: true,
        branch: true,
        semester: true,
        totalSemesters: true,
      },
    })

    // Group by course + branch
    const groupMap = new Map<string, {
      course: string
      branch: string
      currentSem: number
      totalSems: number
      studentCount: number
      students: Array<{ id: string; name: string; studentId: string; semester: number }>
    }>()

    for (const s of students) {
      const course = s.course ?? 'Unknown'
      const branch = s.branch ?? ''
      const sem = s.semester ?? 1
      const totalSems = (s as { totalSemesters?: number }).totalSemesters ?? 8
      const key = `${course}||${branch}`

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          course,
          branch,
          currentSem: sem,
          totalSems,
          studentCount: 0,
          students: [],
        })
      }

      const group = groupMap.get(key)!
      group.studentCount++
      group.students.push({ id: s.id, name: s.name, studentId: s.studentId, semester: sem })

      // Use the most common semester as the group's currentSem
      // (or the minimum — whichever makes more sense for bulk advance)
      // We use minimum so we don't skip anyone
      if (sem < group.currentSem) group.currentSem = sem
    }

    const groups = Array.from(groupMap.values())
      .filter(g => g.studentCount > 0)
      .sort((a, b) => a.course.localeCompare(b.course))

    res.json({ success: true, data: groups })
  } catch (err) {
    next(err)
  }
}

// ── POST /students/bulk-advance-semester — advance all students in a course group ──
export async function bulkAdvanceSemester(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { course, branch, currentSem, newSem } = req.body as {
      course: string
      branch: string
      currentSem: number
      newSem: number
    }
    const adminId = req.user!.id

    if (!course || !newSem || newSem <= currentSem) {
      throw new ApiError(400, 'course, currentSem, and newSem (> currentSem) are required')
    }

    // Only allow 1 semester forward at a time
    if (newSem !== currentSem + 1) {
      throw new ApiError(400, `Bulk advance only allows 1 semester at a time (${currentSem} → ${currentSem + 1}). Cannot set to ${newSem}.`)
    }

    // Find all active students in this course+branch at currentSem
    const students = await prisma.student.findMany({
      where: {
        status: 'active',
        course: { equals: course, mode: 'insensitive' },
        branch: branch ? { equals: branch, mode: 'insensitive' } : undefined,
        semester: currentSem,
      },
      select: {
        id: true,
        name: true,
        studentId: true,
        semester: true,
        totalSemesters: true,
        rentPackage: true,
        depositAmount: true,
        joiningDate: true,
        room: {
          select: {
            id: true,
            semesterRent: true,
            monthlyRent: true,
            annualRent: true,
            branchId: true,
          },
        },
      },
    })

    if (students.length === 0) {
      throw new ApiError(404, `No active students found in ${course} ${branch} at Sem ${currentSem}`)
    }

    let updated = 0
    let invoicesCreated = 0

    // PERF FIX: Batch all student updates in a single transaction instead of N sequential queries
    const studentUpdates: Array<{ id: string; newStayEnd: Date; newDuration: string }> = []
    const invoicesToCreate: Array<{
      studentId: string; invoiceNumber: string; feePerSem: number; newSem: number
    }> = []

    // Pre-compute all updates
    for (const student of students) {
      const { stayEndDateFromSemesters } = await import('../utils/indianTime')
      const totalSems = (student as { totalSemesters?: number }).totalSemesters ?? 8
      const newStayEnd = stayEndDateFromSemesters(new Date((student as { joiningDate: Date }).joiningDate), newSem, totalSems)
      const newDuration = `${(totalSems - newSem + 1) * 6}months`
      studentUpdates.push({ id: student.id, newStayEnd, newDuration })

      // Calculate fee
      let feePerSem = 0
      const room = student.room
      if (room && student.rentPackage === 'semester') {
        feePerSem = Number(room.semesterRent ?? 0)
      } else if (room && student.rentPackage === 'monthly') {
        feePerSem = Number(room.monthlyRent ?? 0)
      } else if (room && student.rentPackage === 'annual') {
        feePerSem = Number(room.annualRent ?? 0)
      }

      if (feePerSem > 0) {
        const { generateInvoiceNumber } = await import('../utils/studentId')
        const invoiceNumber = await generateInvoiceNumber()
        invoicesToCreate.push({ studentId: student.id, invoiceNumber, feePerSem, newSem })
      }
    }

    // PERF FIX: Check existing invoices in one batch query
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        type: 'rent',
        semesterNumber: newSem,
      },
      select: { studentId: true },
    })
    const studentsWithInvoice = new Set(existingInvoices.map(i => i.studentId))

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    // PERF FIX: Execute all updates in a single transaction
    await prisma.$transaction(async (tx) => {
      // Batch update all students
      for (const upd of studentUpdates) {
        await tx.student.update({
          where: { id: upd.id },
          data: { semester: newSem, stayEndDate: upd.newStayEnd, stayDuration: upd.newDuration, updatedAt: new Date() },
        })
        updated++
      }

      // Batch create invoices for students that don't have one yet
      for (const inv of invoicesToCreate) {
        if (!studentsWithInvoice.has(inv.studentId)) {
          await tx.invoice.create({
            data: {
              studentId: inv.studentId,
              invoiceNumber: inv.invoiceNumber,
              type: 'rent',
              description: `Semester ${inv.newSem} fee`,
              amount: inv.feePerSem,
              totalAmount: inv.feePerSem,
              balance: inv.feePerSem,
              dueDate,
              status: 'due',
              semesterNumber: inv.newSem,
              generatedBy: adminId,
            },
          })
          invoicesCreated++
        }
      }

      // Batch activity logs
      await tx.activityLog.createMany({
        data: students.map(s => ({
          actorId: adminId,
          actorType: 'admin',
          action: 'UPDATED',
          entityType: 'student',
          entityId: s.id,
          meta: { action: 'semester_advanced', from: currentSem, to: newSem, course, branch },
        })),
        skipDuplicates: true,
      })
    })

    res.json({
      success: true,
      message: `Semester advanced from ${currentSem} to ${newSem} for ${updated} students. ${invoicesCreated} new invoices created.`,
      data: { updated, invoicesCreated, total: students.length },
    })
  } catch (err) {
    next(err)
  }
}
