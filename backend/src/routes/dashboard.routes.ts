import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { getDashboardStats, getOccupancyChart } from '../controllers/dashboard.controller'
import { getActivityLogs } from '../services/activityLog.service'
import { getPaginationParams, getPaginationMeta } from '../utils/pagination'
import { Request, Response, NextFunction } from 'express'
// PERF FIX: Cache dashboard stats — they're expensive (13 queries) and change slowly
import { cacheResponse } from '../middleware/cache.middleware'

export const dashboardRouter = Router()

// PERF FIX: Cache dashboard stats for 30s per user — avoids 13 DB queries on every page load
dashboardRouter.get('/stats', requireAdmin, cacheResponse(30, req => `cache:dashboard:stats:${req.user?.branchId ?? 'all'}`), getDashboardStats)
// PERF FIX: Cache occupancy chart for 60s — room status changes infrequently
dashboardRouter.get('/occupancy', requireAdmin, cacheResponse(60, req => `cache:dashboard:occupancy:${req.user?.branchId ?? 'all'}`), getOccupancyChart)
dashboardRouter.get('/activity', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const { action } = req.query as Record<string, string>
    const result = await getActivityLogs({ page, limit, action: action || undefined })
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})
