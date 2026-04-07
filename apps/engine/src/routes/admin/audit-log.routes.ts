import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { auditLog } from '@promotionos/db'
import { requireAdmin } from '../../lib/jwt-user'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export async function writeAuditLog(
  db: Db,
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  diff?: unknown,
): Promise<void> {
  await db.insert(auditLog).values({
    actorId,
    entityType,
    entityId,
    action,
    diff: diff ?? null,
  })
}

export async function auditLogRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/v1/admin/audit-log',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const query = z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(50),
        entityType: z.string().optional(),
      }).safeParse(request.query)
      if (!query.success) {
        return sendError(reply, 'VALIDATION_ERROR', query.error.message)
      }
      try {
        const { page, limit, entityType } = query.data
        const offset = (page - 1) * limit

        const baseQuery = fastify.db.select().from(auditLog)
        const filtered = entityType
          ? baseQuery.where(eq(auditLog.entityType, entityType))
          : baseQuery
        const entries = await filtered
          .orderBy(desc(auditLog.occurredAt))
          .limit(limit)
          .offset(offset)
        return sendSuccess(reply, { entries })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
