import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  DATABASE_URL: z.string().min(1).default(''),
  DIRECT_URL: z.string().min(1).default(''),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default(''),
  SUPABASE_STORAGE_BUCKET_DOCS: z.string().default('student-documents'),
  SUPABASE_STORAGE_BUCKET_AVATARS: z.string().default('student-avatars'),
  SUPABASE_STORAGE_BUCKET_COMPLAINTS: z.string().default('complaint-photos'),
  JWT_SECRET: z.string().min(1).default('pg-hostel-super-secret-jwt-key-minimum-32-chars!!'),
  ADMIN_PORTAL_URL: z.string().default('http://localhost:3000'),
  STUDENT_PORTAL_URL: z.string().default('http://localhost:3001'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CASHFREE_APP_ID: z.string().default('test_app_id'),
  CASHFREE_SECRET_KEY: z.string().default('test_secret_key'),
  CASHFREE_ENV: z.enum(['TEST', 'PROD']).default('TEST'),
  CASHFREE_WEBHOOK_SECRET: z.string().default('test_webhook_secret_32chars_min!!'),
  WHATSAPP_SESSION_PATH: z.string().default('./whatsapp-session'),
  WHATSAPP_HEADLESS: z.string().default('true').transform(v => v === 'true'),
  TZ: z.string().default('Asia/Kolkata'),
  PG_NAME: z.string().default('Sunrise PG'),
  RECEIPT_BASE_URL: z.string().default('http://localhost:4000/api/v1/finance/receipts'),
  OTP_LENGTH: z.string().default('6').transform(Number),
  OTP_EXPIRY_SECONDS: z.string().default('300').transform(Number),
  OTP_MAX_ATTEMPTS: z.string().default('3').transform(Number),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  IDCARD_BASE_URL: z.string().optional(),
})

// Always parse with defaults — never crash on missing env vars
const _parsed = EnvSchema.parse({
  ...process.env,
  DATABASE_URL: process.env['DATABASE_URL'] || '',
  DIRECT_URL: process.env['DIRECT_URL'] || process.env['DATABASE_URL'] || '',
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'] || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
})

export const env = _parsed
