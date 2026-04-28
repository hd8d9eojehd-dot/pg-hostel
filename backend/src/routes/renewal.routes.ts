import { Router } from 'express'
import { requireAdmin } from '../middleware/role.middleware'
import { getRenewalExits, processRenewal } from '../controllers/renewal.controller'

export const renewalRouter = Router()

renewalRouter.get('/', requireAdmin, getRenewalExits)
renewalRouter.patch('/:id', requireAdmin, processRenewal)
