import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateOutpassSchema, ApproveOutpassSchema, RejectOutpassSchema } from '@pg-hostel/shared'
import {
  createOutpass, getOutpasses, getOutpassById,
  approveOutpass, rejectOutpass, confirmReturn,
} from '../controllers/outpass.controller'

export const outpassRouter = Router()

outpassRouter.get('/', getOutpasses)
outpassRouter.post('/', validate(CreateOutpassSchema), createOutpass)
outpassRouter.get('/:id', getOutpassById)
outpassRouter.post('/:id/approve', requireAdmin, validate(ApproveOutpassSchema), approveOutpass)
outpassRouter.post('/:id/reject', requireAdmin, validate(RejectOutpassSchema), rejectOutpass)
outpassRouter.post('/:id/return', requireAdmin, confirmReturn)
