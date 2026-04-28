import { Router } from 'express'
import { initiateOnlinePayment, cashfreeWebhook, getPaymentHistory, verifyPaymentStatus } from '../controllers/payment.controller'

export const paymentRouter = Router()

paymentRouter.post('/webhook', cashfreeWebhook)
paymentRouter.post('/initiate', initiateOnlinePayment)
paymentRouter.post('/verify', verifyPaymentStatus)
paymentRouter.get('/history', getPaymentHistory)
