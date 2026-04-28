// Email service — uses Supabase Auth built-in email (no extra cost)
// For custom emails, plug in Resend/SendGrid here
import { supabaseAdmin } from '../config/supabase'
import { logger } from '../utils/logger'

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env['STUDENT_PORTAL_URL']}/reset-password`,
  })
  if (error) {
    logger.error('Password reset email failed:', error.message)
    throw new Error(error.message)
  }
}

export async function sendMagicLink(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  if (error) {
    logger.error('Magic link generation failed:', error.message)
    throw new Error(error.message)
  }
}
