import { prisma } from '../config/prisma'

export async function logActivity(data: {
  actorId: string
  actorType: 'admin' | 'system'
  action: string
  entityType: string
  entityId?: string
  meta?: Record<string, unknown>
  ipAddress?: string
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: data.actorId,
        actorType: data.actorType,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        meta: data.meta ? (data.meta as object) : undefined,
        ipAddress: data.ipAddress ?? null,
      },
    })
  } catch {
    // Non-blocking — never throw from activity log
  }
}

export async function getActivityLogs(query: {
  page?: number
  limit?: number
  actorId?: string
  entityType?: string
  action?: string
}) {
  const page = Math.max(1, query.page ?? 1)
  const limit = Math.min(100, query.limit ?? 20)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (query.actorId) where['actorId'] = query.actorId
  if (query.entityType) where['entityType'] = query.entityType
  if (query.action) where['action'] = query.action

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { name: true, role: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  return {
    logs,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  }
}
