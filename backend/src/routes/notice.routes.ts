import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateNoticeSchema, UpdateNoticeSchema } from '@pg-hostel/shared'
import {
  createNotice, getNotices, getNoticeById, updateNotice,
  publishNotice, sendNoticeWhatsApp, deleteNotice,
} from '../controllers/notice.controller'
import { cacheResponse } from '../middleware/cache.middleware'

export const noticeRouter = Router()

// PERF FIX: Cache notice list for 2 minutes — changes only when admin publishes
noticeRouter.get('/', cacheResponse(120, req => `cache:notices:list:${req.query['branchId'] ?? 'all'}`), getNotices)
noticeRouter.post('/', requireAdmin, validate(CreateNoticeSchema), createNotice)
// PERF FIX: Cache individual notice for 5 minutes
noticeRouter.get('/:id', cacheResponse(300, req => `cache:notices:${req.params['id']}`), getNoticeById)
noticeRouter.patch('/:id', requireAdmin, validate(UpdateNoticeSchema), updateNotice)
noticeRouter.post('/:id/publish', requireAdmin, publishNotice)
noticeRouter.post('/:id/whatsapp', requireAdmin, sendNoticeWhatsApp)
noticeRouter.delete('/:id', requireAdmin, deleteNotice)
