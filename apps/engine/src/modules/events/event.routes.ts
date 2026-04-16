import { Queue } from 'bullmq'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { ingestEventSchema, listEventsQuerySchema } from './event.schema'
import { EventRepository } from './event.repository'
import { EventService } from './event.service'
import { AppError } from '../../lib/errors'
import { requireAdmin } from '../../lib/jwt-user'
import { QUEUE_NAMES } from '../../lib/queue'

import { EventPipelineService } from '../../services/event-pipeline.service'
import { TriggerMatcherService } from '../../services/trigger-matcher.service'
import { AggregationService } from '../../services/aggregation.service'
import { AggregationRuleRepository } from '../../repositories/aggregation-rule.repository'
import { CampaignSchedulerRepository } from '../../repositories/campaign.repository'
import { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'
import { MechanicRepository } from '../../repositories/mechanic.repository'
import { RewardDefinitionRepository } from '../../repositories/reward-definition.repository'
import { RawEventRepository } from '../../repositories/raw-event.repository'
import { ProgressBarService } from '../../services/mechanics/progress-bar.service'
import { MissionService } from '../../services/mechanics/mission.service'
import { ConditionProgressCheckerService } from '../../services/mechanics/condition-progress-checker.service'
import { WheelService } from '../../services/mechanics/wheel.service'
import { RealtimePublisherService } from '../../services/realtime-publisher.service'

function handleError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message },
    })
  }
  throw err
}

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  const db = fastify.db
  const repository = new EventRepository(db)

  let pipeline: EventPipelineService | null = null

  // Create our own queue connection for the event pipeline
  // (the server-level rewardQueue is decorated AFTER routes register, so it's not available here)
  let queueOrDummy: Queue = { add: async () => ({}) } as unknown as Queue
  let publisher: RealtimePublisherService | null = null
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      const { Redis: IORedis } = await import('ioredis')
      const conn = new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
      queueOrDummy = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection: conn })
      // Publisher piggybacks on the queue's Redis connection — command-mode
      // operations only (publish), so no conflict with BullMQ traffic.
      publisher = new RealtimePublisherService(conn, fastify.log)
      fastify.addHook('onClose', async () => {
        await queueOrDummy.close()
        await conn.quit().catch(() => undefined)
      })
    }
  } catch { /* Redis unavailable — dummy queue used */ }

  try {
    const aggRuleRepo = new AggregationRuleRepository(db)
    const campaignRepo = new CampaignSchedulerRepository(db)
    const statsRepo = new PlayerCampaignStatsRepository(db)
    const playerRewardRepo = new PlayerRewardRepository(db)
    const stateRepo = new PlayerMechanicStateRepository(db)
    const mechanicRepo = new MechanicRepository(db)
    const rewardDefRepo = new RewardDefinitionRepository(db)
    const rawEventRepo = new RawEventRepository(db)

    const triggerMatcher = new TriggerMatcherService(campaignRepo, aggRuleRepo)
    const aggregationService = new AggregationService(aggRuleRepo, statsRepo, publisher)
    const progressBarService = new ProgressBarService(statsRepo, playerRewardRepo, stateRepo, queueOrDummy, db)
    const missionService = new MissionService(stateRepo, statsRepo, playerRewardRepo, queueOrDummy)
    const conditionChecker = new ConditionProgressCheckerService(playerRewardRepo, statsRepo, queueOrDummy)
    const wheelService = new WheelService(rewardDefRepo, playerRewardRepo, queueOrDummy, statsRepo)

    pipeline = new EventPipelineService(
      triggerMatcher,
      aggregationService,
      mechanicRepo,
      rawEventRepo,
      progressBarService,
      missionService,
      conditionChecker,
      wheelService,
    )
    console.log('[EventRoutes] Event pipeline created successfully')
  } catch (err) {
    console.warn('[EventRoutes] Could not create event pipeline:', err)
  }

  const service = new EventService(repository, pipeline)

  fastify.post(
    '/api/v1/events/ingest',
    async (request, reply) => {
      const parsed = ingestEventSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const result = await service.ingestEvent(parsed.data)
        return reply.code(201).send({ success: true, data: result })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  fastify.get(
    '/api/v1/admin/events',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = listEventsQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const result = await service.listEvents({
          playerId: parsed.data.playerId,
          eventType: parsed.data.eventType,
          processed: parsed.data.processed,
          page: parsed.data.page,
          limit: parsed.data.limit,
        })
        return reply.send({
          success: true,
          data: { events: result.events },
          meta: {
            page: parsed.data.page,
            limit: parsed.data.limit,
            total: result.total,
          },
        })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )
}
