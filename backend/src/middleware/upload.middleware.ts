// File upload is handled via Supabase Storage signed URLs.
// This middleware validates upload metadata before issuing a signed URL.
import { Request, Response, NextFunction } from 'express'
import { ApiError } from './error.middleware'

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE_MB = 10

export function validateUploadRequest(req: Request, _res: Response, next: NextFunction): void {
  const { fileName, fileSize, mimeType } = req.body as {
    fileName?: string
    fileSize?: number
    mimeType?: string
  }

  if (!fileName) {
    return next(new ApiError(400, 'fileName is required'))
  }

  if (fileSize && fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return next(new ApiError(400, `File size must be under ${MAX_FILE_SIZE_MB}MB`))
  }

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return next(new ApiError(400, `File type ${mimeType} is not allowed`))
  }

  next()
}
