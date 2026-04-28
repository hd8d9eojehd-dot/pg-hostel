import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { ApiError } from './error.middleware'

export function validate<T>(
  schema: ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source])
      req[source] = parsed as typeof req[typeof source]
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string[]> = {}
        err.errors.forEach(e => {
          const key = e.path.join('.')
          errors[key] = [...(errors[key] ?? []), e.message]
        })
        next(new ApiError(422, 'Validation failed', errors))
      } else {
        next(err)
      }
    }
  }
}
