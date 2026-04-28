import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import {
  occupancyReport, revenueReport, defaultersReport,
  stayExpiryReport, complaintReport, studentReport,
  exportOccupancyCSV, exportRevenueCSV, exportDefaultersCSV, exportStudentsCSV,
} from '../controllers/report.controller'

export const reportRouter = Router()

reportRouter.get('/occupancy', requireAdmin, occupancyReport)
reportRouter.get('/occupancy/export', requireAdmin, exportOccupancyCSV)
reportRouter.get('/revenue', requireAdmin, revenueReport)
reportRouter.get('/revenue/export', requireAdmin, exportRevenueCSV)
reportRouter.get('/defaulters', requireAdmin, defaultersReport)
reportRouter.get('/defaulters/export', requireAdmin, exportDefaultersCSV)
reportRouter.get('/stay-expiry', requireAdmin, stayExpiryReport)
reportRouter.get('/complaints', requireAdmin, complaintReport)
reportRouter.get('/students', requireAdmin, studentReport)
reportRouter.get('/students/export', requireAdmin, exportStudentsCSV)
