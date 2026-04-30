import { Request, Response, NextFunction } from 'express'
import { sendWhatsAppMessage, sendBulkWhatsApp } from '../services/whatsapp.service'
import { isWhatsAppReady, getQrCode, isWhatsAppInitializing } from '../config/whatsapp'
import { prisma } from '../config/prisma'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'

// Get QR from DB (persistent across page refreshes)
async function getStoredQr(): Promise<{ qrDataUrl: string | null; savedAt: string | null }> {
  try {
    const branch = await prisma.branch.findFirst({ select: { id: true } })
    if (!branch) return { qrDataUrl: null, savedAt: null }
    const settings = await prisma.settings.findUnique({ where: { branchId: branch.id }, select: { staffPermissions: true } })
    const perms = (settings?.staffPermissions as Record<string, unknown>) ?? {}
    return {
      qrDataUrl: (perms['whatsappQr'] as string | null) ?? null,
      savedAt: (perms['whatsappQrSavedAt'] as string | null) ?? null,
    }
  } catch {
    return { qrDataUrl: null, savedAt: null }
  }
}

export async function sendSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, message, studentId } = req.body as { mobile: string; message: string; studentId?: string }
    await sendWhatsAppMessage({ mobile, message, studentId, templateName: 'MANUAL' })
    res.json({ success: true, message: 'Message sent' })
  } catch (err) {
    next(err)
  }
}

export async function sendBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { messages, filter } = req.body as {
      messages?: Array<{ mobile: string; message: string; studentId?: string }>
      filter?: { status?: string; floorId?: string; feeStatus?: string; message?: string }
    }

    let finalMessages = messages ?? []

    if (filter && filter.message) {
      const where: Record<string, unknown> = {}
      if (filter.status) where['status'] = filter.status
      if (filter.floorId) where['room'] = { floorId: filter.floorId }

      const students = await prisma.student.findMany({
        where,
        select: { id: true, mobile: true, invoices: { where: { status: { in: ['due', 'overdue', 'partial'] } }, select: { status: true } } },
      })

      let filtered = students
      if (filter.feeStatus === 'overdue') {
        filtered = students.filter(s => s.invoices.some(i => i.status === 'overdue'))
      } else if (filter.feeStatus === 'due') {
        filtered = students.filter(s => s.invoices.length > 0)
      } else if (filter.feeStatus === 'clear') {
        filtered = students.filter(s => s.invoices.length === 0)
      }

      finalMessages = filtered.map(s => ({
        mobile: s.mobile,
        message: filter.message!,
        studentId: s.id,
      }))
    }

    const result = await sendBulkWhatsApp(finalMessages)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function getWhatsAppStatus(_req: Request, res: Response): Promise<void> {
  const ready = isWhatsAppReady()
  // If connected, no need to show QR
  if (ready) {
    res.json({ success: true, data: { ready: true, initializing: false, qrAvailable: false, qrDataUrl: null, savedAt: null } })
    return
  }
  // Read QR from DB — persistent, instant, no Puppeteer wait
  const { qrDataUrl, savedAt } = await getStoredQr()
  res.json({
    success: true,
    data: {
      ready: false,
      initializing: isWhatsAppInitializing(),
      qrAvailable: !!qrDataUrl,
      qrDataUrl,
      savedAt,
      // Also check if runtime QR is available (just generated, not yet saved)
      runtimeQrAvailable: !!getQrCode(),
    },
  })
}

export async function getWhatsAppLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const skip = getSkip(page, limit)
    const { status, startDate, endDate } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (status) where['status'] = status
    if (startDate || endDate) {
      where['sentAt'] = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }

    const [logs, total] = await Promise.all([
      prisma.whatsappLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: { student: { select: { name: true, studentId: true } } },
      }),
      prisma.whatsappLog.count({ where }),
    ])

    res.json({ success: true, data: logs, pagination: getPaginationMeta(total, page, limit) })
  } catch (err) {
    next(err)
  }
}
