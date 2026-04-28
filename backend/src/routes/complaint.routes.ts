import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateComplaintSchema, UpdateComplaintSchema, AddCommentSchema } from '@pg-hostel/shared'
import {
  createComplaint, getComplaints, getComplaintById,
  updateComplaint, addComment, getComplaintMetrics,
  getComplaintPhotoUploadUrl, deleteComplaint, bulkDeleteComplaints,
} from '../controllers/complaint.controller'

export const complaintRouter = Router()

complaintRouter.get('/metrics', requireAdmin, getComplaintMetrics)
complaintRouter.post('/photo-upload-url', getComplaintPhotoUploadUrl)
complaintRouter.delete('/bulk', requireAdmin, bulkDeleteComplaints)
complaintRouter.get('/', getComplaints)
complaintRouter.post('/', validate(CreateComplaintSchema), createComplaint)
complaintRouter.get('/:id', getComplaintById)
complaintRouter.patch('/:id', requireAdmin, validate(UpdateComplaintSchema), updateComplaint)
complaintRouter.delete('/:id', requireAdmin, deleteComplaint)
complaintRouter.post('/:id/comments', validate(AddCommentSchema), addComment)
