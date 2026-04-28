import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { getDashboardStats, getOccupancyChart } from '../controllers/dashboard.controller'
import { getActivityLogs } from '../services/activityLog.service'
import { getPaginationParams, getPaginationMeta } from '../utils/pagination'
import { Request, Response, NextFunction } from 'express'

export const dashboardRouter = Router()

dashboardRouter.get('/stats', requireAdmin, getDashboardStats)
dashboardRouter.get('/occupancy', requireAdmin, getOccupancyChart)
dashboardRouter.get('/activity', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = getPaginationParams(req.query)
    const { action, startDate, endDate } = req.query as Record<string, string>
    const result = await getActivityLogs({
      page, limit,
      action: action || undefined,
    })
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})
