import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq, and, inArray } from 'drizzle-orm'
import crypto from 'node:crypto'
import { z } from 'zod'
import {
  aggregationRules,
  campaigns,
  mechanics,
  mechanicDependencies,
  rewardDefinitions,
} from '@promotionos/db'
import {
  aggregationRuleSchema,
  cashoutConfigSchema,
  leaderboardConfigSchema,
  leaderboardLayeredConfigSchema,
  mechanicTypeSchema,
  missionConfigSchema,
  progressBarConfigSchema,
  rewardTypeSchema,
  wheelConfigSchema,
  wheelInWheelConfigSchema,
} from '@promotionos/zod-schemas'
import { AppError } from '../../lib/errors'
import { requireAdmin } from '../../lib/jwt-user'
import { handleRouteError, sendError, sendSuccess } from '../../lib/response'

type MechanicType = z.infer<typeof mechanicTypeSchema>

const campaignIdParamsSchema = z.object({ id: z.string().uuid() })
const mechanicIdParamsSchema = z.object({ mechanicId: z.string().uuid() })
const rewardDefinitionIdParamsSchema = z.object({ id: z.string().uuid() })

const createMechanicBodySchema = z.object({
  type: mechanicTypeSchema,
  config: z.unknown(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

const updateMechanicBodySchema = z.object({
  config: z.unknown().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

const createRewardDefinitionBodySchema = z.object({
  type: rewardTypeSchema,
  config: z.unknown(),
  probabilityWeight: z.number().nonnegative().optional(),
  conditionConfig: z.record(z.unknown()).optional().nullable(),
})

const updateRewardDefinitionBodySchema = z.object({
  type: rewardTypeSchema.optional(),
  config: z.unknown().optional(),
  probabilityWeight: z.number().nonnegative().nullable().optional(),
  conditionConfig: z.record(z.unknown()).optional().nullable(),
})

const createAggregationRuleBodySchema = aggregationRuleSchema.extend({
  mechanicId: z.string().uuid(),
})

function configSchemaForMechanicType(type: MechanicType): z.ZodType<unknown> {
  switch (type) {
    case 'WHEEL':
      return wheelConfigSchema
    case 'WHEEL_IN_WHEEL':
      return wheelInWheelConfigSchema
    case 'LEADERBOARD':
      return leaderboardConfigSchema
    case 'LEADERBOARD_LAYERED':
      return leaderboardLayeredConfigSchema
    case 'MISSION':
      return missionConfigSchema
    case 'PROGRESS_BAR':
      return progressBarConfigSchema
    case 'CASHOUT':
      return cashoutConfigSchema
    case 'TOURNAMENT':
      return z.record(z.unknown())
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

function validateMechanicConfig(type: MechanicType, config: unknown): unknown {
  const parsed = configSchemaForMechanicType(type).safeParse(config)
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', parsed.error.message, 422)
  }
  return parsed.data
}

function assertCampaignDraftOrScheduled(status: string): void {
  if (status !== 'draft' && status !== 'scheduled') {
    throw new AppError(
      'CAMPAIGN_NOT_EDITABLE',
      'Campaign must be draft or scheduled to modify mechanics',
      400,
    )
  }
}

export async function adminMechanicRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/v1/admin/campaigns/:id/mechanics',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = campaignIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid campaign id')
      }
      const bodyParsed = createMechanicBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }

      try {
        const campaignId = paramsParsed.data.id
        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        const validatedConfig = validateMechanicConfig(bodyParsed.data.type, bodyParsed.data.config)

        const [created] = await fastify.db
          .insert(mechanics)
          .values({
            campaignId,
            type: bodyParsed.data.type,
            config: validatedConfig,
            displayOrder: bodyParsed.data.displayOrder ?? 0,
            isActive: bodyParsed.data.isActive ?? true,
          })
          .returning()

        return sendSuccess(reply, created, 201)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.put(
    '/api/v1/admin/mechanics/:mechanicId',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')
      }
      const bodyParsed = updateMechanicBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }

      try {
        const mechanicId = paramsParsed.data.mechanicId
        const [mechanic] = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.id, mechanicId))
          .limit(1)
        if (!mechanic) {
          throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        }

        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, mechanic.campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        const patch: {
          config?: unknown
          displayOrder?: number
          isActive?: boolean
          updatedAt: Date
        } = { updatedAt: new Date() }

        if (bodyParsed.data.config !== undefined) {
          patch.config = validateMechanicConfig(mechanic.type, bodyParsed.data.config)
        }
        if (bodyParsed.data.displayOrder !== undefined) {
          patch.displayOrder = bodyParsed.data.displayOrder
        }
        if (bodyParsed.data.isActive !== undefined) {
          patch.isActive = bodyParsed.data.isActive
        }

        const [updated] = await fastify.db
          .update(mechanics)
          .set(patch)
          .where(eq(mechanics.id, mechanicId))
          .returning()

        return sendSuccess(reply, updated)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.delete(
    '/api/v1/admin/mechanics/:mechanicId',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')
      }

      try {
        const mechanicId = paramsParsed.data.mechanicId
        const [mechanic] = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.id, mechanicId))
          .limit(1)
        if (!mechanic) {
          throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        }

        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, mechanic.campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        await fastify.db.delete(mechanics).where(eq(mechanics.id, mechanicId))

        return sendSuccess(reply, { deleted: true })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.post(
    '/api/v1/admin/mechanics/:mechanicId/reward-definitions',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')
      }
      const bodyParsed = createRewardDefinitionBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }

      try {
        const mechanicId = paramsParsed.data.mechanicId
        const [mechanic] = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.id, mechanicId))
          .limit(1)
        if (!mechanic) {
          throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        }

        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, mechanic.campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        const weight = bodyParsed.data.probabilityWeight
        const [created] = await fastify.db
          .insert(rewardDefinitions)
          .values({
            mechanicId,
            type: bodyParsed.data.type,
            config: bodyParsed.data.config,
            ...(weight !== undefined
              ? { probabilityWeight: String(weight) }
              : {}),
            conditionConfig: bodyParsed.data.conditionConfig ?? null,
          })
          .returning()

        return sendSuccess(reply, created, 201)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // GET reward definitions for a specific mechanic
  fastify.get(
    '/api/v1/admin/mechanics/:mechanicId/reward-definitions',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')
      }
      try {
        const mechanicId = paramsParsed.data.mechanicId
        const rewards = await fastify.db
          .select()
          .from(rewardDefinitions)
          .where(eq(rewardDefinitions.mechanicId, mechanicId))

        return sendSuccess(reply, { rewardDefinitions: rewards })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.put(
    '/api/v1/admin/reward-definitions/:id',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = rewardDefinitionIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid reward definition id')
      }
      const bodyParsed = updateRewardDefinitionBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }

      try {
        const rewardDefinitionId = paramsParsed.data.id
        const [row] = await fastify.db
          .select()
          .from(rewardDefinitions)
          .where(eq(rewardDefinitions.id, rewardDefinitionId))
          .limit(1)
        if (!row) {
          throw new AppError('REWARD_NOT_FOUND', 'Reward definition not found', 404)
        }

        const [mechanic] = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.id, row.mechanicId))
          .limit(1)
        if (!mechanic) {
          throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        }

        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, mechanic.campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        const patch: {
          type?: z.infer<typeof rewardTypeSchema>
          config?: unknown
          probabilityWeight?: string | null
          conditionConfig?: Record<string, unknown> | null
        } = {}

        if (bodyParsed.data.type !== undefined) {
          patch.type = bodyParsed.data.type
        }
        if (bodyParsed.data.config !== undefined) {
          patch.config = bodyParsed.data.config
        }
        if (bodyParsed.data.probabilityWeight !== undefined) {
          patch.probabilityWeight =
            bodyParsed.data.probabilityWeight === null
              ? null
              : String(bodyParsed.data.probabilityWeight)
        }
        if (bodyParsed.data.conditionConfig !== undefined) {
          patch.conditionConfig = bodyParsed.data.conditionConfig
        }

        if (Object.keys(patch).length === 0) {
          return sendSuccess(reply, row)
        }

        const [updated] = await fastify.db
          .update(rewardDefinitions)
          .set(patch)
          .where(eq(rewardDefinitions.id, rewardDefinitionId))
          .returning()

        return sendSuccess(reply, updated)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.post(
    '/api/v1/admin/campaigns/:id/aggregation-rules',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = campaignIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid campaign id')
      }
      const bodyParsed = createAggregationRuleBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }

      try {
        const campaignId = paramsParsed.data.id
        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        const [mechanic] = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.id, bodyParsed.data.mechanicId))
          .limit(1)
        if (!mechanic) {
          throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        }
        if (mechanic.campaignId !== campaignId) {
          throw new AppError(
            'VALIDATION_ERROR',
            'Mechanic does not belong to this campaign',
            400,
          )
        }

        const { mechanicId, ...ruleFields } = bodyParsed.data

        const [created] = await fastify.db
          .insert(aggregationRules)
          .values({
            campaignId,
            mechanicId,
            sourceEventType: ruleFields.sourceEventType,
            metric: ruleFields.metric,
            transformation: ruleFields.transformation,
            windowType: ruleFields.windowType,
            windowSizeHours: ruleFields.windowSizeHours ?? null,
          })
          .returning()

        return sendSuccess(reply, created, 201)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.get(
    '/api/v1/admin/campaigns/:id/mechanics',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = campaignIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid campaign id')
      }
      try {
        const campaignId = paramsParsed.data.id
        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }

        const rows = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.campaignId, campaignId))
          .orderBy(mechanics.displayOrder)

        return sendSuccess(reply, { mechanics: rows })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.get(
    '/api/v1/admin/campaigns/:id/reward-definitions',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = campaignIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid campaign id')
      }
      try {
        const campaignId = paramsParsed.data.id
        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }

        const campaignMechanics = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.campaignId, campaignId))

        if (campaignMechanics.length === 0) {
          return sendSuccess(reply, { rewardDefinitions: [] })
        }

        const mechanicIds = campaignMechanics.map((m) => m.id)
        const rewards = await fastify.db
          .select()
          .from(rewardDefinitions)
          .where(inArray(rewardDefinitions.mechanicId, mechanicIds))

        return sendSuccess(reply, { rewardDefinitions: rewards })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.delete(
    '/api/v1/admin/reward-definitions/:id',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = rewardDefinitionIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid reward definition id')
      }
      try {
        const rewardDefinitionId = paramsParsed.data.id
        const [row] = await fastify.db
          .select()
          .from(rewardDefinitions)
          .where(eq(rewardDefinitions.id, rewardDefinitionId))
          .limit(1)
        if (!row) {
          throw new AppError('REWARD_NOT_FOUND', 'Reward definition not found', 404)
        }

        const [mechanic] = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.id, row.mechanicId))
          .limit(1)
        if (!mechanic) {
          throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        }

        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, mechanic.campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        assertCampaignDraftOrScheduled(campaign.status)

        await fastify.db
          .delete(rewardDefinitions)
          .where(eq(rewardDefinitions.id, rewardDefinitionId))

        return sendSuccess(reply, { deleted: true })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // ── Mechanic Dependencies ──────────────────────────────────────

  const createDependencyBodySchema = z.object({
    dependsOnMechanicId: z.string().uuid(),
    unlockCondition: z.record(z.unknown()).default({ type: 'mechanic_complete' }),
  })

  // POST /api/v1/admin/mechanics/:mechanicId/dependencies
  fastify.post(
    '/api/v1/admin/mechanics/:mechanicId/dependencies',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')
      const bodyParsed = createDependencyBodySchema.safeParse(request.body)
      if (!bodyParsed.success) return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)

      try {
        const mechanicId = paramsParsed.data.mechanicId
        const { dependsOnMechanicId, unlockCondition } = bodyParsed.data

        // Validate both mechanics exist
        const [mech] = await fastify.db.select().from(mechanics).where(eq(mechanics.id, mechanicId)).limit(1)
        if (!mech) throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        const [parent] = await fastify.db.select().from(mechanics).where(eq(mechanics.id, dependsOnMechanicId)).limit(1)
        if (!parent) throw new AppError('MECHANIC_NOT_FOUND', 'Parent mechanic not found', 404)
        if (mech.campaignId !== parent.campaignId) throw new AppError('VALIDATION_ERROR', 'Both mechanics must belong to the same campaign', 400)

        // Check if dependency already exists
        const [existingDep] = await fastify.db.select().from(mechanicDependencies)
          .where(and(eq(mechanicDependencies.mechanicId, mechanicId), eq(mechanicDependencies.dependsOnMechanicId, dependsOnMechanicId)))
          .limit(1)
        if (existingDep) {
          return sendSuccess(reply, existingDep, 200)
        }

        const [created] = await fastify.db
          .insert(mechanicDependencies)
          .values({ mechanicId, dependsOnMechanicId: dependsOnMechanicId, unlockCondition })
          .returning()

        return sendSuccess(reply, created, 201)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // GET /api/v1/admin/mechanics/:mechanicId/dependencies
  fastify.get(
    '/api/v1/admin/mechanics/:mechanicId/dependencies',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')

      try {
        const rows = await fastify.db
          .select()
          .from(mechanicDependencies)
          .where(eq(mechanicDependencies.mechanicId, paramsParsed.data.mechanicId))

        return sendSuccess(reply, { dependencies: rows })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // POST /api/v1/admin/mechanics/:mechanicId/finalize-leaderboard
  // Manually triggers leaderboard finalization for a given window date.
  // Used for testing daily/weekly leaderboards without waiting for the scheduler.
  fastify.post(
    '/api/v1/admin/mechanics/:mechanicId/finalize-leaderboard',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = mechanicIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) return sendError(reply, 'VALIDATION_ERROR', 'Invalid mechanic id')

      const bodySchema = z.object({
        windowDate: z.coerce.date().optional(),
      })
      const bodyParsed = bodySchema.safeParse(request.body ?? {})
      if (!bodyParsed.success) return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)

      try {
        const mechanicId = paramsParsed.data.mechanicId
        const [mechanic] = await fastify.db.select().from(mechanics).where(eq(mechanics.id, mechanicId)).limit(1)
        if (!mechanic) throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
        if (mechanic.type !== 'LEADERBOARD' && mechanic.type !== 'LEADERBOARD_LAYERED') {
          throw new AppError('VALIDATION_ERROR', 'Only leaderboard mechanics can be finalized', 400)
        }

        // Lazy-import services to avoid circular deps
        const { PlayerCampaignStatsRepository } = await import('../../repositories/player-campaign-stats.repository')
        const { PlayerRewardRepository } = await import('../../repositories/player-reward.repository')
        const { RewardDefinitionRepository } = await import('../../repositories/reward-definition.repository')
        const { LeaderboardCacheService } = await import('../../services/mechanics/leaderboard-cache.service')
        const { LeaderboardService } = await import('../../services/mechanics/leaderboard.service')
        const { Queue } = await import('bullmq')
        const { QUEUE_NAMES } = await import('../../lib/queue')

        let queue: InstanceType<typeof Queue> | null = null
        try {
          const redisUrl = process.env.REDIS_URL
          if (redisUrl) {
            const { Redis } = await import('ioredis')
            const conn = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
            queue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection: conn })
          }
        } catch { /* no redis */ }
        const dummyQueue = queue ?? ({ add: async () => ({}) } as unknown as InstanceType<typeof Queue>)

        const statsRepo = new PlayerCampaignStatsRepository(fastify.db)
        const playerRewardRepo = new PlayerRewardRepository(fastify.db)
        const rewardDefRepo = new RewardDefinitionRepository(fastify.db)
        const cacheService = new LeaderboardCacheService(fastify.redis ?? null)
        const lbService = new LeaderboardService(statsRepo, cacheService, playerRewardRepo, rewardDefRepo, dummyQueue)

        const config = mechanic.config as unknown as Parameters<typeof lbService.finalize>[2]
        const windowDate = bodyParsed.data.windowDate ?? new Date()

        await lbService.finalize(
          mechanicId,
          mechanic.campaignId,
          config,
          windowDate,
        )

        if (queue) await queue.close()

        return sendSuccess(reply, { finalized: true, windowDate: windowDate.toISOString() })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.post(
    '/api/v1/admin/campaigns/:id/duplicate',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = campaignIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid campaign id')
      }
      try {
        const campaignId = paramsParsed.data.id
        const [campaign] = await fastify.db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }

        const newSlug = `${campaign.slug}-copy-${crypto.randomUUID().slice(0, 8)}`

        const [newCampaign] = await fastify.db
          .insert(campaigns)
          .values({
            name: `${campaign.name} (Copy)`,
            slug: newSlug,
            description: campaign.description,
            status: 'draft',
            targetSegmentId: campaign.targetSegmentId,
            currency: campaign.currency,
            startsAt: campaign.startsAt,
            endsAt: campaign.endsAt,
            canvasConfig: campaign.canvasConfig,
            createdBy: request.user.sub,
          })
          .returning()

        if (!newCampaign) throw new AppError('INTERNAL_ERROR', 'Failed to create campaign copy', 500)

        const srcMechanics = await fastify.db
          .select()
          .from(mechanics)
          .where(eq(mechanics.campaignId, campaignId))

        const mechanicIdMap = new Map<string, string>()

        for (const m of srcMechanics) {
          const [newMechanic] = await fastify.db
            .insert(mechanics)
            .values({
              campaignId: newCampaign.id,
              type: m.type,
              config: m.config,
              displayOrder: m.displayOrder,
              isActive: m.isActive,
            })
            .returning()
          if (newMechanic) mechanicIdMap.set(m.id, newMechanic.id)
        }

        for (const [oldMechanicId, newMechanicId] of mechanicIdMap) {
          const srcRewards = await fastify.db
            .select()
            .from(rewardDefinitions)
            .where(eq(rewardDefinitions.mechanicId, oldMechanicId))

          for (const r of srcRewards) {
            await fastify.db.insert(rewardDefinitions).values({
              mechanicId: newMechanicId,
              type: r.type,
              config: r.config,
              probabilityWeight: r.probabilityWeight,
              conditionConfig: r.conditionConfig,
            })
          }

          const srcRules = await fastify.db
            .select()
            .from(aggregationRules)
            .where(eq(aggregationRules.mechanicId, oldMechanicId))

          for (const rule of srcRules) {
            await fastify.db.insert(aggregationRules).values({
              campaignId: newCampaign.id,
              mechanicId: newMechanicId,
              sourceEventType: rule.sourceEventType,
              metric: rule.metric,
              transformation: rule.transformation,
              windowType: rule.windowType,
              windowSizeHours: rule.windowSizeHours,
            })
          }
        }

        return sendSuccess(reply, { campaign: newCampaign }, 201)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
