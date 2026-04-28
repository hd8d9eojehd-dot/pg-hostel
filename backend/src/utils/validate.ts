import { ZodSchema, ZodError } from 'zod'
import { ApiError } from '../middleware/error.middleware'

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors: Record<string, string[]> = {}
    result.error.errors.forEach(e => {
      const key = e.path.join('.')
      errors[key] = [...(errors[key] ?? []), e.message]
    })
    throw new ApiError(422, 'Validation failed', errors)
  }
  return result.data
}
