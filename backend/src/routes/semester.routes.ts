import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { getSemesterPeriods, createSemesterPeriod, updateSemesterPeriod, triggerSemHolidayOutpasses } from '../controllers/semester.controller'

export const semesterRouter = Router()

semesterRouter.get('/', requireAdmin, getSemesterPeriods)
semesterRouter.post('/', requireAdmin, createSemesterPeriod)
semesterRouter.patch('/:id', requireAdmin, updateSemesterPeriod)
semesterRouter.post('/:id/trigger-outpasses', requireAdmin, triggerSemHolidayOutpasses)
