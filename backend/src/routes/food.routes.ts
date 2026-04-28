import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { UpsertFoodMenuSchema, UpdateMealTimingsSchema } from '@pg-hostel/shared'
import { getFoodMenu, getWeeklyMenu, copyWeekToRange, applyWeeklyTemplate, upsertFoodMenu, deleteFoodMenu, getMealTimings, updateMealTimings, getTodayMenu } from '../controllers/food.controller'

export const foodRouter = Router()

foodRouter.get('/today', getTodayMenu)
foodRouter.get('/menu', getFoodMenu)
foodRouter.get('/weekly', getWeeklyMenu)
foodRouter.post('/menu', requireAdmin, validate(UpsertFoodMenuSchema), upsertFoodMenu)
foodRouter.delete('/menu/:id', requireAdmin, deleteFoodMenu)
foodRouter.post('/copy-week', requireAdmin, copyWeekToRange)
foodRouter.post('/apply-template', requireAdmin, applyWeeklyTemplate)  // No schema validation — custom body
foodRouter.get('/timings', getMealTimings)
foodRouter.post('/timings', requireAdmin, validate(UpdateMealTimingsSchema), updateMealTimings)
