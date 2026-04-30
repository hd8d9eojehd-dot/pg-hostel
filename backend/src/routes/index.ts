import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { authRouter } from './auth.routes'
import { dashboardRouter } from './dashboard.routes'
import { studentRouter } from './student.routes'
import { roomRouter } from './room.routes'
import { financeRouter } from './finance.routes'
import { paymentRouter } from './payment.routes'
import { foodRouter } from './food.routes'
import { complaintRouter } from './complaint.routes'
import { noticeRouter } from './notice.routes'
import { outpassRouter } from './outpass.routes'
import { documentRouter } from './document.routes'
import { whatsappRouter } from './whatsapp.routes'
import { feedbackRouter } from './feedback.routes'
import { settingsRouter } from './settings.routes'
import { portalRouter } from './portal.routes'
import { cashfreeWebhook } from '../controllers/payment.controller'
import { renewalRouter } from './renewal.routes'
import { semesterRouter } from './semester.routes'
import { activityLogMiddleware } from '../middleware/activityLog.middleware'
import { verifyQr } from '../controllers/student.controller'
import { downloadReceipt } from '../controllers/finance.controller'

export const router = Router()

// ─── Public routes (no auth) ─────────────────────────────
router.use('/auth', authRouter)
router.post('/payment/webhook', cashfreeWebhook)
router.get('/students/verify-qr', verifyQr)
router.get('/finance/receipts/:receiptNumber', downloadReceipt)

// ─── Protected routes (auth required) ────────────────────
router.use(authMiddleware)
router.use(activityLogMiddleware)

router.use('/dashboard', dashboardRouter)
router.use('/students', studentRouter)
router.use('/rooms', roomRouter)
router.use('/finance', financeRouter)
router.use('/payment', paymentRouter)
router.use('/food', foodRouter)
router.use('/complaints', complaintRouter)
router.use('/notices', noticeRouter)
router.use('/outpass', outpassRouter)
router.use('/documents', documentRouter)
router.use('/whatsapp', whatsappRouter)
router.use('/feedback', feedbackRouter)
router.use('/settings', settingsRouter)
router.use('/portal', portalRouter)
router.use('/renewals', renewalRouter)
router.use('/semesters', semesterRouter)
