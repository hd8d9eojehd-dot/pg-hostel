import { Response } from 'express'

export function ok<T>(res: Response, data: T, message?: string): void {
  res.json({ success: true, data, message })
}

export function created<T>(res: Response, data: T, message?: string): void {
  res.status(201).json({ success: true, data, message })
}

export function noContent(res: Response): void {
  res.status(204).send()
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
): void {
  res.json({ success: true, data, pagination })
}
