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

export const studentRouter = Router()

// Public QR verification — no auth required, accessible via Google scan
studentRouter.get('/verify-qr', verifyQr)

studentRouter.get('/stats', requireAdmin, getStudentStats)
studentRouter.get('/course-groups', requireAdmin, getCourseGroups)
studentRouter.post('/bulk-advance-semester', requireAdmin, bulkAdvanceSemester)
studentRouter.get('/', requireAdmin, getStudents)
studentRouter.post('/', requireAdmin, validate(CreateStudentSchema), createStudent)
studentRouter.get('/:id', requireAdmin, getStudentById)
studentRouter.patch('/:id', requireAdmin, validate(UpdateStudentSchema), updateStudent)
studentRouter.delete('/:id', requireAdmin, validate(DeleteStudentSchema), deleteStudentPermanently)
studentRouter.post('/:id/renew', requireAdmin, validate(RenewStudentSchema), renewStudent)
studentRouter.post('/:id/shift-room', requireAdmin, validate(ShiftRoomSchema), shiftRoom)
studentRouter.post('/:id/extend-stay', requireAdmin, validate(ExtendStaySchema), extendStay)
studentRouter.post('/:id/vacate', requireAdmin, validate(VacateStudentSchema), vacateStudent)
studentRouter.get('/:id/id-card', requireAdmin, downloadIdCard)
