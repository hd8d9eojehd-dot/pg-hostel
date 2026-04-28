import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../middleware/error.middleware'
import { getPublicUrl, BUCKETS } from '../services/storage.service'
import { supabaseAdmin } from '../config/supabase'
import { env } from '../config/env'
export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, fileBase64, fileName, mimeType } = req.body as {
      studentId: string; fileBase64: string; fileName: string; mimeType: string
    }

    if (!fileBase64 || !fileName) throw new ApiError(400, 'fileBase64 and fileName required')

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (mimeType && !allowedTypes.includes(mimeType)) throw new ApiError(422, 'Only JPEG, PNG, WebP allowed')

    const buffer = Buffer.from(fileBase64, 'base64')
    if (buffer.length > 5 * 1024 * 1024) throw new ApiError(422, 'File too large (max 5MB)')

    const ext = fileName.split('.').pop() ?? 'jpg'
    const path = studentId !== 'temp' ? `${studentId}/avatar.${ext}` : `temp/${Date.now()}.${ext}`

    let publicUrl: string

    // Use direct REST API to bypass RLS issues with SDK
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = BUCKETS.AVATARS

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': mimeType ?? 'image/jpeg',
        'x-upsert': 'true',
      },
      body: buffer,
    })

    if (uploadRes.ok) {
      publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
    } else {
      // Fallback: store as data URL in DB
      publicUrl = `data:${mimeType ?? 'image/jpeg'};base64,${fileBase64}`
    }

    if (studentId && studentId !== 'temp') {
      await prisma.student.update({ where: { id: studentId }, data: { avatarUrl: publicUrl } }).catch(() => {})
    }

    res.json({ success: true, data: { url: publicUrl, path } })
  } catch (err) {
    next(err)
  }
}

export async function getUploadSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, type, fileName } = req.body as { studentId: string; type: string; fileName: string }
    const path = `${studentId}/${type}/${Date.now()}-${fileName}`
    // Return a simple path — client will upload directly via base64
    res.json({ success: true, data: { path } })
  } catch (err) {
    next(err)
  }
}

export async function saveDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, type, label, fileUrl, fileName, fileSize } = req.body as {
      studentId: string; type: string; label?: string
      fileUrl: string; fileName?: string; fileSize?: number
    }

    const doc = await prisma.document.create({
      data: { studentId, type, label, fileUrl, fileName, fileSize },
    })

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = req.params['studentId'] ?? req.user?.id
    const docs = await prisma.document.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    })
    res.json({ success: true, data: docs })
  } catch (err) {
    next(err)
  }
}

export async function verifyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params['id']! },
      data: { isVerified: true, verifiedBy: req.user!.id, verifiedAt: new Date(), rejectionNote: null },
    })
    res.json({ success: true, message: 'Document verified', data: doc })
  } catch (err) {
    next(err)
  }
}

export async function rejectDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body as { reason: string }
    const doc = await prisma.document.update({
      where: { id: req.params['id']! },
      data: { isVerified: false, rejectionNote: reason, verifiedBy: req.user!.id, verifiedAt: new Date() },
    })
    res.json({ success: true, message: 'Document rejected', data: doc })
  } catch (err) {
    next(err)
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.document.delete({ where: { id: req.params['id']! } })
    res.json({ success: true, message: 'Document deleted' })
  } catch (err) {
    next(err)
  }
}

// Upload document directly via base64 (student portal)
export async function uploadDocumentBase64(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!
    const { type, label, fileBase64, fileName, mimeType, fileSize } = req.body as {
      type: string; label?: string; fileBase64: string; fileName: string; mimeType?: string; fileSize?: number
    }

    if (!fileBase64 || !fileName || !type) throw new ApiError(400, 'type, fileBase64, fileName required')

    const buffer = Buffer.from(fileBase64, 'base64')
    if (buffer.length > 10 * 1024 * 1024) throw new ApiError(422, 'File too large (max 10MB)')

    const studentId = user.type === 'student' ? user.id : (req.body as { studentId?: string }).studentId
    if (!studentId) throw new ApiError(400, 'studentId required')

    const ext = fileName.split('.').pop() ?? 'pdf'
    const path = `${studentId}/${type}/${Date.now()}.${ext}`

    let fileUrl: string

    // Try Supabase storage first
    await supabaseAdmin.storage.createBucket(BUCKETS.DOCS, { public: true }).catch(() => {})
    const { error } = await supabaseAdmin.storage
      .from(BUCKETS.DOCS)
      .upload(path, buffer, { contentType: mimeType ?? 'application/octet-stream', upsert: false })

    if (error) {
      // Fallback: store as data URL
      fileUrl = `data:${mimeType ?? 'application/octet-stream'};base64,${fileBase64}`
    } else {
      const { data: urlData } = supabaseAdmin.storage.from(BUCKETS.DOCS).getPublicUrl(path)
      fileUrl = urlData.publicUrl
    }

    const doc = await prisma.document.create({
      data: {
        studentId,
        type,
        label: label ?? type,
        fileUrl,
        fileName,
        fileSize: fileSize ?? buffer.length,
      },
    })

    res.status(201).json({ success: true, data: { ...doc, url: fileUrl } })
  } catch (err) {
    next(err)
  }
}
