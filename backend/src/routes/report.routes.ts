import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import {
  occupancyReport, revenueReport, defaultersReport,
  stayExpiryReport, complaintReport, studentReport,
  exportOccupancyCSV, exportRevenueCSV, exportDefaultersCSV, exportStudentsCSV,
} from '../controllers/report.controller'
// PERF FIX: Cache report data — expensive queries, changes slowly
import { cacheResponse } from '../middleware/cache.middleware'

export const reportRouter = Router()

// PERF FIX: Cache reports for 2 minutes — they're expensive aggregations
reportRouter.get('/occupancy', requireAdmin, cacheResponse(120, () => 'cache:reports:occupancy'), occupancyReport)
reportRouter.get('/occupancy/export', requireAdmin, exportOccupancyCSV)
reportRouter.get('/revenue', requireAdmin, cacheResponse(120, req => `cache:reports:revenue:${req.query['month'] ?? ''}:${req.query['year'] ?? ''}`), revenueReport)
reportRouter.get('/revenue/export', requireAdmin, exportRevenueCSV)
reportRouter.get('/defaulters', requireAdmin, cacheResponse(120, () => 'cache:reports:defaulters'), defaultersReport)
reportRouter.get('/defaulters/export', requireAdmin, exportDefaultersCSV)
reportRouter.get('/stay-expiry', requireAdmin, cacheResponse(120, () => 'cache:reports:stay-expiry'), stayExpiryReport)
reportRouter.get('/complaints', requireAdmin, cacheResponse(120, () => 'cache:reports:complaints'), complaintReport)
reportRouter.get('/students', requireAdmin, cacheResponse(120, () => 'cache:reports:students'), studentReport)
reportRouter.get('/students/export', requireAdmin, exportStudentsCSV)
