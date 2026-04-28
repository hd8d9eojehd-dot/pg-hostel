import { Router } from 'express'
import { requireRole } from '../middleware/role.middleware'
import {
  getHomeData, getMyProfile, getMyInvoices, getMyComplaints,
  getMyOutpasses, getPublishedNotices, getMyFoodMenu, getChildInfo,
  submitPaymentRequest, getMyFeeStructure, createSemInvoice, getMyPendingPayments,
} from '../controllers/portal.controller'
import { getIdCardData } from '../controllers/student.controller'

export const portalRouter = Router()

// ─── Student routes ───────────────────────────────────────
portalRouter.get('/home', requireRole('student'), getHomeData)
portalRouter.get('/id-card', requireRole('student'), getIdCardData)
portalRouter.get('/profile', requireRole('student'), getMyProfile)
portalRouter.get('/invoices', requireRole('student'), getMyInvoices)
portalRouter.get('/fee-structure', requireRole('student'), getMyFeeStructure)
portalRouter.get('/complaints', requireRole('student'), getMyComplaints)
portalRouter.get('/outpasses', requireRole('student'), getMyOutpasses)
portalRouter.get('/notices', requireRole('student', 'parent'), getPublishedNotices)
portalRouter.get('/food', requireRole('student'), getMyFoodMenu)
portalRouter.post('/payment-request', requireRole('student'), submitPaymentRequest)
portalRouter.post('/create-sem-invoice', requireRole('student'), createSemInvoice)
portalRouter.get('/my-payments', requireRole('student'), getMyPendingPayments)

// ─── Parent routes ────────────────────────────────────────
portalRouter.get('/child', requireRole('parent'), getChildInfo)
