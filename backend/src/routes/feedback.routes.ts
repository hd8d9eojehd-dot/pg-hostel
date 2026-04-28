import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { submitFeedback, getFeedbackSummary, getMyFeedback, getAllFeedback } from '../controllers/feedback.controller'

export const feedbackRouter = Router()

feedbackRouter.get('/summary', requireAdmin, getFeedbackSummary)
feedbackRouter.get('/all', requireAdmin, getAllFeedback)
feedbackRouter.get('/my', getMyFeedback)
feedbackRouter.post('/', submitFeedback)
