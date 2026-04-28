import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateNoticeSchema, UpdateNoticeSchema } from '@pg-hostel/shared'
import {
  createNotice, getNotices, getNoticeById, updateNotice,
  publishNotice, sendNoticeWhatsApp, deleteNotice,
} from '../controllers/notice.controller'

export const noticeRouter = Router()

noticeRouter.get('/', getNotices)
noticeRouter.post('/', requireAdmin, validate(CreateNoticeSchema), createNotice)
noticeRouter.get('/:id', getNoticeById)
noticeRouter.patch('/:id', requireAdmin, validate(UpdateNoticeSchema), updateNotice)
noticeRouter.post('/:id/publish', requireAdmin, publishNotice)
noticeRouter.post('/:id/whatsapp', requireAdmin, sendNoticeWhatsApp)
noticeRouter.delete('/:id', requireAdmin, deleteNotice)
