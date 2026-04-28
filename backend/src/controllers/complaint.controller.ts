import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { generateComplaintNumber } from '../utils/studentId'
import { notifyComplaintResolved } from '../services/notification.service'
import { getPaginationParams, getPaginationMeta, getSkip } from '../utils/pagination'
import type { CreateComplaintInput, UpdateComplaintInput, AddCommentInput } from '@pg-hostel/shared'

export async function createComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!
    const input = req.body as CreateComplaintInput

    const student = await prisma.student.findUnique({
      where: { id: user.id },
      select: { id: true, roomId: true, status: true },
    })
    if (!student || !student.roomId) throw new ApiError(400, 'Student has no room assigned')

    const complaintNumber = await generateComplaintNumber()
    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        studentId: student.id,
        roomId: student.roomId,
        category: input.category,
        description: input.description,
        priority: input.priority ?? 'medium',
        photoUrl: input.photoUrl,
        status: 'new',
      },
    })

    res.status(201).json({ success: true, message: 'Complaint submitted', data: complaint })
  } catch (err) {
    next(err)
  }
}

export async function getComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const skip = getSkip(page, limit)
    const where: Record<string, unknown> = {}

    if (req.query['status']) where['status'] = req.query['status']
    if (req.query['category']) where['category'] = req.query['category']
    if (req.query['priority']) where['priority'] = req.query['priority']
    if (req.query['studentId']) where['studentId'] = req.query['studentId']
    if (req.user?.type === 'student') where['studentId'] = req.user.id

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true, studentId: true } },
          room: { select: { roomNumber: true } },
          assignedAdmin: { select: { name: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ])

    res.json({ success: true, data: complaints, pagination: getPaginationMeta(total, page, limit) })
  } catch (err) {
    next(err)
  }
}

export async function getComplaintById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params['id']! },
      include: {
        student: { select: { name: true, studentId: true, mobile: true } },
        room: { select: { roomNumber: true } },
        assignedAdmin: { select: { name: true } },
        resolvedByAdmin: { select: { name: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!complaint) throw new ApiError(404, 'Complaint not found')
    res.json({ success: true, data: complaint })
  } catch (err) {
    next(err)
  }
}

export async function updateComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as UpdateComplaintInput
    const complaint = await prisma.complaint.findUnique({ where: { id: req.params['id']! } })
    if (!complaint) throw new ApiError(404, 'Complaint not found')

    const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() }
    if (input.status === 'resolved') {
      updateData['resolvedBy'] = req.user!.id
      updateData['resolvedAt'] = new Date()
    }

    const updated = await prisma.complaint.update({
      where: { id: req.params['id']! },
      data: updateData,
      include: { student: { select: { name: true, mobile: true } } },
    })

    // Notify student on resolve
    if (input.status === 'resolved' && updated.student) {
      notifyComplaintResolved({
        studentName: updated.student.name,
        mobile: updated.student.mobile,
        complaintNumber: updated.complaintNumber,
        category: updated.category,
        resolutionNote: input.resolutionNote ?? 'Issue resolved',
      }).catch(() => { /* non-blocking */ })
    }

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { comment } = req.body as AddCommentInput
    const user = req.user!

    const complaint = await prisma.complaint.findUnique({ where: { id: req.params['id']! } })
    if (!complaint) throw new ApiError(404, 'Complaint not found')

    const newComment = await prisma.complaintComment.create({
      data: {
        complaintId: req.params['id']!,
        authorId: user.id,
        authorType: user.type === 'admin' ? 'admin' : 'student',
        comment,
      },
    })

    res.status(201).json({ success: true, data: newComment })
  } catch (err) {
    next(err)
  }
}

export async function getComplaintMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total, byStatus, byCategory] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.groupBy({ by: ['status'], _count: true }),
      prisma.complaint.groupBy({ by: ['category'], _count: true }),
    ])
    res.json({ success: true, data: { total, byStatus, byCategory } })
  } catch (err) {
    next(err)
  }
}

export async function getComplaintPhotoUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileName, fileBase64, mimeType } = req.body as { fileName: string; fileBase64?: string; mimeType?: string }
    const user = req.user!
    const path = `complaints/${user.id}/${Date.now()}-${fileName}`

    const { supabaseAdmin } = await import('../config/supabase')
    const { env } = await import('../config/env')

    // If base64 provided, upload directly
    if (fileBase64) {
      const buffer = Buffer.from(fileBase64, 'base64')
      const { error } = await supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET_COMPLAINTS)
        .upload(path, buffer, { contentType: mimeType ?? 'image/jpeg', upsert: true })
      if (error) throw new Error(error.message)
      const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET_COMPLAINTS}/${path}`
      res.json({ success: true, data: { publicUrl, path } })
      return
    }

    // Otherwise return signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET_COMPLAINTS)
      .createSignedUploadUrl(path)

    if (error) throw new Error(error.message)

    const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET_COMPLAINTS}/${path}`
    res.json({ success: true, data: { uploadUrl: data.signedUrl, publicUrl, path } })
  } catch (err) {
    next(err)
  }
}

export async function deleteComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string }
    const complaint = await prisma.complaint.findUnique({ where: { id } })
    if (!complaint) throw new ApiError(404, 'Complaint not found')
    // Only allow delete if resolved or closed
    if (!['resolved', 'closed'].includes(complaint.status)) {
      throw new ApiError(400, 'Only resolved or closed complaints can be deleted')
    }
    await prisma.complaintComment.deleteMany({ where: { complaintId: id } })
    await prisma.complaint.delete({ where: { id } })
    res.json({ success: true, message: 'Complaint deleted' })
  } catch (err) { next(err) }
}

export async function bulkDeleteComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ids } = req.body as { ids: string[] }
    if (!ids?.length) throw new ApiError(400, 'ids array required')
    // Only delete resolved/closed
    const complaints = await prisma.complaint.findMany({
      where: { id: { in: ids }, status: { in: ['resolved', 'closed'] } },
      select: { id: true },
    })
    const validIds = complaints.map(c => c.id)
    if (!validIds.length) throw new ApiError(400, 'No resolved/closed complaints found in selection')
    await prisma.complaintComment.deleteMany({ where: { complaintId: { in: validIds } } })
    await prisma.complaint.deleteMany({ where: { id: { in: validIds } } })
    res.json({ success: true, message: `Deleted ${validIds.length} complaint(s)` })
  } catch (err) { next(err) }
}
