import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { validate } from '../middleware/validate.middleware'
import { UpsertFoodMenuSchema, UpdateMealTimingsSchema } from '@pg-hostel/shared'
import { getFoodMenu, getWeeklyMenu, copyWeekToRange, applyWeeklyTemplate, upsertFoodMenu, deleteFoodMenu, getMealTimings, updateMealTimings, getTodayMenu } from '../controllers/food.controller'
import { cacheResponse } from '../middleware/cache.middleware'

export const foodRouter = Router()

// PERF FIX: Cache today's menu for 10 minutes — changes only when admin updates
foodRouter.get('/today', cacheResponse(600, req => `cache:food:today:${req.query['branchId'] ?? 'all'}`), getTodayMenu)
// PERF FIX: Cache monthly menu for 5 minutes
foodRouter.get('/menu', cacheResponse(300, req => `cache:food:menu:${req.query['branchId'] ?? 'all'}:${req.query['month'] ?? ''}:${req.query['year'] ?? ''}`), getFoodMenu)
foodRouter.get('/weekly', cacheResponse(300, req => `cache:food:weekly:${req.query['branchId'] ?? 'all'}`), getWeeklyMenu)
foodRouter.post('/menu', requireAdmin, validate(UpsertFoodMenuSchema), upsertFoodMenu)
foodRouter.delete('/menu/:id', requireAdmin, deleteFoodMenu)
foodRouter.post('/copy-week', requireAdmin, copyWeekToRange)
foodRouter.post('/apply-template', requireAdmin, applyWeeklyTemplate)
// PERF FIX: Cache meal timings for 10 minutes — rarely changes
foodRouter.get('/timings', cacheResponse(600, req => `cache:food:timings:${req.query['branchId'] ?? 'all'}`), getMealTimings)
foodRouter.post('/timings', requireAdmin, validate(UpdateMealTimingsSchema), updateMealTimings)
