import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  DATABASE_URL: z.string().min(10),
  DIRECT_URL: z.string().min(10),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET_DOCS: z.string().default('student-documents'),
  SUPABASE_STORAGE_BUCKET_AVATARS: z.string().default('student-avatars'),
  SUPABASE_STORAGE_BUCKET_COMPLAINTS: z.string().default('complaint-photos'),
  JWT_SECRET: z.string().min(32),
  ADMIN_PORTAL_URL: z.string().min(1).default('http://localhost:3000'),
  STUDENT_PORTAL_URL: z.string().min(1).default('http://localhost:3001'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  CASHFREE_APP_ID: z.string().min(1).default('test_app_id'),
  CASHFREE_SECRET_KEY: z.string().min(1).default('test_secret_key'),
  CASHFREE_ENV: z.enum(['TEST', 'PROD']).default('TEST'),
  CASHFREE_WEBHOOK_SECRET: z.string().min(1).default('test_webhook_secret_32chars_min!!'),
  WHATSAPP_SESSION_PATH: z.string().default('./whatsapp-session'),
  WHATSAPP_HEADLESS: z.string().default('true').transform(v => v === 'true'),
  TZ: z.string().default('Asia/Kolkata'),
  PG_NAME: z.string().default('Sunrise PG'),
  RECEIPT_BASE_URL: z.string().min(1).default('http://localhost:4000/api/v1/finance/receipts'),
  OTP_LENGTH: z.string().default('6').transform(Number),
  OTP_EXPIRY_SECONDS: z.string().default('300').transform(Number),
  OTP_MAX_ATTEMPTS: z.string().default('3').transform(Number),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  IDCARD_BASE_URL: z.string().optional(),
})

const _parsed = EnvSchema.safeParse(process.env)

if (!_parsed.success) {
  console.error('\n❌ ENVIRONMENT VARIABLE VALIDATION FAILED:\n')
  const errors = _parsed.error.flatten().fieldErrors
  Object.entries(errors).forEach(([key, msgs]) => {
    console.error(`  ${key}: ${msgs?.join(', ')}`)
  })
  console.error('\nFix the above env vars in your .env file and restart.\n')
  process.exit(1)
}

export const env = _parsed.data

if (process.env['TZ'] !== 'Asia/Kolkata') {
  console.warn('⚠️  TZ not set to Asia/Kolkata. Cron jobs may fire at wrong times.')
}
