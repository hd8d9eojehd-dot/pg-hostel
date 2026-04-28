import { env } from '../config/env'
import { logger } from '../utils/logger'

// In-memory OTP store as fallback when Redis is unavailable
const memStore = new Map<string, { value: string; expiresAt: number }>()

function memSet(key: string, ttlSeconds: number, value: string): void {
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

function memGet(key: string): string | null {
  const entry = memStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null }
  return entry.value
}

function memDel(key: string): void {
  memStore.delete(key)
}

async function safeSet(key: string, ttl: number, value: string): Promise<void> {
  try {
    const { redis } = await import('../config/redis')
    await redis.setex(key, ttl, value)
  } catch {
    memSet(key, ttl, value)
  }
}

async function safeGet(key: string): Promise<string | null> {
  try {
    const { redis } = await import('../config/redis')
    return await redis.get(key)
  } catch {
    return memGet(key)
  }
}

async function safeDel(key: string): Promise<void> {
  try {
    const { redis } = await import('../config/redis')
    await redis.del(key)
  } catch {
    memDel(key)
  }
}

async function safeIncr(key: string, ttl: number): Promise<number> {
  try {
    const { redis } = await import('../config/redis')
    const val = await redis.incr(key)
    if (val === 1) await redis.expire(key, ttl)
    return val
  } catch {
    const entry = memStore.get(key)
    const current = entry && Date.now() < entry.expiresAt ? parseInt(entry.value) : 0
    const next = current + 1
    memSet(key, ttl, String(next))
    return next
  }
}

const OTP_PREFIX = 'otp:'
const ATTEMPTS_PREFIX = 'otp_attempts:'

function otpKey(mobile: string, purpose: string): string {
  return `${OTP_PREFIX}${purpose}:${mobile}`
}
function attemptsKey(mobile: string, purpose: string): string {
  return `${ATTEMPTS_PREFIX}${purpose}:${mobile}`
}

function generateOtp(): string {
  const digits = env.OTP_LENGTH ?? 6
  return Math.floor(Math.random() * Math.pow(10, digits)).toString().padStart(digits, '0')
}

export async function generateAndStoreOtp(mobile: string, purpose: string): Promise<string> {
  const otp = generateOtp()
  await safeSet(otpKey(mobile, purpose), env.OTP_EXPIRY_SECONDS, otp)
  await safeDel(attemptsKey(mobile, purpose))

  if (env.NODE_ENV !== 'production') {
    logger.info(`🔑 OTP for ${mobile} [${purpose}]: ${otp}`)
  }

  return otp
}

// Store a specific OTP value for a mobile (used to share same OTP with parent)
export async function storeOtpForMobile(mobile: string, purpose: string, otp: string): Promise<void> {
  await safeSet(otpKey(mobile, purpose), env.OTP_EXPIRY_SECONDS, otp)
  await safeDel(attemptsKey(mobile, purpose))
}

export async function verifyOtp(
  mobile: string,
  otp: string,
  purpose: string
): Promise<{ valid: boolean; reason?: string }> {
  const attKey = attemptsKey(mobile, purpose)
  const attempts = await safeIncr(attKey, env.OTP_EXPIRY_SECONDS)

  if (attempts > env.OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'Too many attempts. Request a new OTP.' }
  }

  const stored = await safeGet(otpKey(mobile, purpose))

  if (!stored) {
    return { valid: false, reason: 'OTP expired or not found. Request a new one.' }
  }

  if (stored !== otp) {
    return {
      valid: false,
      reason: `Invalid OTP. ${env.OTP_MAX_ATTEMPTS - attempts} attempts left.`,
    }
  }

  await safeDel(otpKey(mobile, purpose))
  await safeDel(attKey)

  return { valid: true }
}
