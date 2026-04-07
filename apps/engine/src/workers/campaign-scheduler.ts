import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { CampaignSchedulerRepository } from '../repositories/campaign.repository'
import { SegmentMaterializerService } from '../services/segment-materializer.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

const SCHEDULER_QUEUE = 'campaign-scheduler'

export function startCampaignScheduler(
  connection: Redis,
  db: Db,
): { worker: Worker; stop: () => Promise<void> } {
  const campaignRepo = new CampaignSchedulerRepository(db)
  const segmentMaterializer = new SegmentMaterializerService(campaignRepo)
  const lifecycleQueue = new Queue(QUEUE_NAMES.CAMPAIGN_LIFECYCLE, { connection })
  const schedulerQueue = new Queue(SCHEDULER_QUEUE, { connection })

  schedulerQueue.add('check-transitions', {}, {
    repeat: { every: 60_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  })

  const worker = new Worker(
    SCHEDULER_QUEUE,
    async () => {
      const now = new Date()

      const readyToActivate = await campaignRepo.findScheduledReadyToActivate(now)
      for (const campaign of readyToActivate) {
        try {
          await campaignRepo.updateStatus(campaign.id, 'active')
          console.log(`[CampaignScheduler] Activated campaign: ${campaign.slug}`)

          if (campaign.targetSegmentId) {
            const segment = await campaignRepo.findCampaignSegment(campaign.id)
            if (segment?.segmentRuleConfig) {
              const playerIds = await segmentMaterializer.materializeAndSnapshot(
                campaign.id,
                segment.segmentRuleConfig,
              )
              console.log(
                `[CampaignScheduler] Materialized segment for ${campaign.slug}: ${playerIds.length} players`,
              )
            }
          }
        } catch (err) {
          console.error(`[CampaignScheduler] Failed to activate ${campaign.slug}:`, err)
        }
      }

      const readyToEnd = await campaignRepo.findActiveReadyToEnd(now)
      for (const campaign of readyToEnd) {
        try {
          await campaignRepo.updateStatus(campaign.id, 'ended')
          console.log(`[CampaignScheduler] Ended campaign: ${campaign.slug}`)

          await lifecycleQueue.add('campaign-ended', {
            campaignId: campaign.id,
            action: 'end-of-campaign',
          })

          const leaderboardFinalizeQueue = new Queue(QUEUE_NAMES.LEADERBOARD_FINALIZE, { connection })
          await leaderboardFinalizeQueue.add('finalize', {
            campaignId: campaign.id,
          })
          await leaderboardFinalizeQueue.close()
        } catch (err) {
          console.error(`[CampaignScheduler] Failed to end ${campaign.slug}:`, err)
        }
      }
    },
    { connection, concurrency: 1 },
  )

  worker.on('ready', () => console.log('[CampaignScheduler] Ready'))
  worker.on('failed', (job, err) =>
    console.error(`[CampaignScheduler] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[CampaignScheduler] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      await schedulerQueue.close()
      await lifecycleQueue.close()
    },
  }
}
