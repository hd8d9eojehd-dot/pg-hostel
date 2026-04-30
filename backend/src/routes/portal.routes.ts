import { Router } from 'express'
import { requireRole } from '../middleware/role.middleware'
import {
  getHomeData, getMyProfile, getMyInvoices, getMyComplaints,
  getMyOutpasses, getPublishedNotices, getMyFoodMenu, getChildInfo,
  submitPaymentRequest, getMyFeeStructure, createSemInvoice, getMyPendingPayments,
  getPaymentDetails,
} from '../controllers/portal.controller'
import { getIdCardData } from '../controllers/student.controller'
// PERF FIX: Cache stable portal data
import { cacheResponse } from '../middleware/cache.middleware'

export const portalRouter = Router()

// ─── Student routes ───────────────────────────────────────
// PERF FIX: Cache home data for 30s per student — avoids 3 parallel queries on every page load
portalRouter.get('/home', requireRole('student'), cacheResponse(30, req => `cache:portal:home:${req.user?.id}`), getHomeData)
portalRouter.get('/id-card', requireRole('student'), cacheResponse(60, req => `cache:portal:idcard:${req.user?.id}`), getIdCardData)
// PERF FIX: Cache profile for 60s — changes rarely
portalRouter.get('/profile', requireRole('student'), cacheResponse(60, req => `cache:portal:profile:${req.user?.id}`), getMyProfile)
portalRouter.get('/invoices', requireRole('student'), cacheResponse(30, req => `cache:portal:invoices:${req.user?.id}`), getMyInvoices)
// PERF FIX: Cache fee structure for 60s — expensive query, changes only on payment/sem change
portalRouter.get('/fee-structure', requireRole('student'), cacheResponse(60, req => `cache:portal:fee:${req.user?.id}`), getMyFeeStructure)
portalRouter.get('/complaints', requireRole('student'), cacheResponse(30, req => `cache:portal:complaints:${req.user?.id}`), getMyComplaints)
portalRouter.get('/outpasses', requireRole('student'), cacheResponse(30, req => `cache:portal:outpasses:${req.user?.id}`), getMyOutpasses)
// PERF FIX: Cache notices for 5 minutes — rarely changes
portalRouter.get('/notices', requireRole('student', 'parent'), cacheResponse(300, () => 'cache:portal:notices'), getPublishedNotices)
portalRouter.get('/food', requireRole('student'), cacheResponse(300, req => `cache:portal:food:${req.user?.id}`), getMyFoodMenu)
portalRouter.post('/payment-request', requireRole('student'), submitPaymentRequest)
portalRouter.post('/create-sem-invoice', requireRole('student'), createSemInvoice)
// PERF FIX: Cache pending payments for 10s — live status, but not every render
portalRouter.get('/my-payments', requireRole('student'), cacheResponse(10, req => `cache:portal:payments:${req.user?.id}`), getMyPendingPayments)
// PERF FIX: Cache payment details for 5 minutes — admin sets these rarely
portalRouter.get('/payment-details', requireRole('student'), cacheResponse(300, req => `cache:portal:paydetails:${req.user?.id}`), getPaymentDetails)

// ─── Parent routes ────────────────────────────────────────
portalRouter.get('/child', requireRole('parent'), getChildInfo)
