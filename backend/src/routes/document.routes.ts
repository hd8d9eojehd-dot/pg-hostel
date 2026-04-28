import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import {
  uploadAvatar, getUploadSignedUrl, saveDocument, getDocuments,
  verifyDocument, rejectDocument, deleteDocument, uploadDocumentBase64,
} from '../controllers/document.controller'

export const documentRouter = Router()

documentRouter.post('/upload-avatar', uploadAvatar)
documentRouter.post('/upload-url', getUploadSignedUrl)
documentRouter.post('/upload', uploadDocumentBase64)
documentRouter.post('/', saveDocument)
documentRouter.get('/student/:studentId', requireAdmin, getDocuments)
documentRouter.get('/my', getDocuments)
documentRouter.post('/:id/verify', requireAdmin, verifyDocument)
documentRouter.post('/:id/reject', requireAdmin, rejectDocument)
documentRouter.delete('/:id', deleteDocument)
