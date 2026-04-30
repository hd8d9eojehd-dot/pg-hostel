import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import {
  CreateStudentSchema, UpdateStudentSchema, ShiftRoomSchema,
  ExtendStaySchema, VacateStudentSchema, RenewStudentSchema, DeleteStudentSchema,
} from '@pg-hostel/shared'
import {
  createStudent, getStudents, getStudentById, updateStudent,
  shiftRoom, extendStay, vacateStudent, downloadIdCard, getStudentStats,
  deleteStudentPermanently, renewStudent, verifyQr,
  getCourseGroups, bulkAdvanceSemester,
} from '../controllers/student.controller'
// PERF FIX: Cache stable student list and stats
import { cacheResponse } from '../middleware/cache.middleware'

export const studentRouter = Router()

// Public QR verification — no auth required, accessible via Google scan
studentRouter.get('/verify-qr', verifyQr)

// PERF FIX: Cache stats for 60s — counts change infrequently
studentRouter.get('/stats', requireAdmin, cacheResponse(60, () => 'cache:students:stats'), getStudentStats)
// PERF FIX: Cache course groups for 60s — used by semester advance panel
studentRouter.get('/course-groups', requireAdmin, cacheResponse(60, () => 'cache:students:course-groups'), getCourseGroups)
studentRouter.post('/bulk-advance-semester', requireAdmin, bulkAdvanceSemester)
// PERF FIX: Cache student list for 30s per query — paginated, filtered
studentRouter.get('/', requireAdmin, cacheResponse(30, req => {
  const { search, status, feeStatus, page, limit } = req.query as Record<string, string>
  return `cache:students:list:${status ?? ''}:${feeStatus ?? ''}:${search ?? ''}:${page ?? 1}:${limit ?? 20}`
}), getStudents)
studentRouter.post('/', requireAdmin, validate(CreateStudentSchema), createStudent)
// PERF FIX: Cache individual student for 30s — detail page loads
studentRouter.get('/:id', requireAdmin, cacheResponse(30, req => `cache:students:${req.params['id']}`), getStudentById)
studentRouter.patch('/:id', requireAdmin, validate(UpdateStudentSchema), updateStudent)
studentRouter.delete('/:id', requireAdmin, validate(DeleteStudentSchema), deleteStudentPermanently)
studentRouter.post('/:id/renew', requireAdmin, validate(RenewStudentSchema), renewStudent)
studentRouter.post('/:id/shift-room', requireAdmin, validate(ShiftRoomSchema), shiftRoom)
studentRouter.post('/:id/extend-stay', requireAdmin, validate(ExtendStaySchema), extendStay)
studentRouter.post('/:id/vacate', requireAdmin, validate(VacateStudentSchema), vacateStudent)
studentRouter.get('/:id/id-card', requireAdmin, downloadIdCard)
