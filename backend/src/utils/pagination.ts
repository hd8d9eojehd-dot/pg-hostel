export interface PaginationParams {
  page: number
  limit: number
}

export function getPaginationParams(query: {
  page?: string | number
  limit?: string | number
}): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)))
  return { page, limit }
}

export function getPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export function getSkip(page: number, limit: number): number {
  return (page - 1) * limit
}
