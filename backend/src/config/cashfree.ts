// Cashfree SDK initialization — called once at startup
import { Cashfree, CFEnvironment } from 'cashfree-pg'
import { env } from './env'
import { logger } from '../utils/logger'

export function initCashfree(): void {
  Cashfree.XClientId = env.CASHFREE_APP_ID
  Cashfree.XClientSecret = env.CASHFREE_SECRET_KEY
  Cashfree.XEnvironment =
    env.CASHFREE_ENV === 'PROD' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX
  logger.info(`✅ Cashfree initialized [${env.CASHFREE_ENV}]`)
}
