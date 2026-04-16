/**
 * Realtime event publisher — fire-and-forget wrapper around Redis pub/sub.
 *
 * The canvas opens an SSE connection (`GET /api/v1/stream`) and subscribes
 * to two channel patterns for its (playerId, campaignId) scope:
 *
 *   canvas:p:{playerId}:c:{campaignId}     — player-scoped events (state,
 *                                            reward-granted, mechanic-state)
 *   canvas:c:{campaignId}                  — campaign-wide events
 *                                            (leaderboard-changed — all
 *                                            viewers of the campaign care)
 *
 * Every call on this service is best-effort. If Redis is down or the publish
 * fails we log at debug and move on — the business logic must never fail
 * because realtime notification didn't land.
 *
 * Contract with the SSE endpoint: the published payload is a JSON string
 * matching `RealtimeEvent` and must include a `type` discriminator. The SSE
 * endpoint forwards the value of `type` as the SSE `event:` field so the
 * browser can use `EventSource.addEventListener('player-state-updated', ...)`.
 */

import type { Redis } from 'ioredis'
import type { FastifyBaseLogger } from 'fastify'

export type RealtimeEvent =
  | { type: 'player-state-updated' }
  | { type: 'mechanic-state-updated'; mechanicId: string }
  | { type: 'leaderboard-changed'; mechanicId: string }
  | {
      type: 'reward-granted'
      rewardType: string
      amount?: number
      mechanicId?: string
      playerRewardId?: string
    }

export const CHANNEL = {
  playerScope: (playerId: string, campaignId: string): string =>
    `canvas:p:${playerId}:c:${campaignId}`,
  campaignScope: (campaignId: string): string => `canvas:c:${campaignId}`,
  /** Pattern used by the SSE subscriber for any campaign-scope event. */
  campaignPattern: (campaignId: string): string => `canvas:c:${campaignId}`,
}

export class RealtimePublisherService {
  constructor(
    private readonly redis: Redis | null,
    private readonly log?: FastifyBaseLogger,
  ) {}

  /** Player-scoped notification — only the targeted player's SSE sees it. */
  async publishPlayerScope(
    playerId: string,
    campaignId: string,
    event: RealtimeEvent,
  ): Promise<void> {
    await this.safePublish(CHANNEL.playerScope(playerId, campaignId), event)
  }

  /** Campaign-wide notification — every connected SSE for the campaign sees it. */
  async publishCampaignScope(
    campaignId: string,
    event: RealtimeEvent,
  ): Promise<void> {
    await this.safePublish(CHANNEL.campaignScope(campaignId), event)
  }

  /** Convenience: both a campaign-wide leaderboard change AND a ping to
   *  the player whose stats moved (so their progress bar refreshes too). */
  async publishLeaderboardMovement(
    playerId: string,
    campaignId: string,
    mechanicId: string,
  ): Promise<void> {
    await Promise.all([
      this.publishCampaignScope(campaignId, { type: 'leaderboard-changed', mechanicId }),
      this.publishPlayerScope(playerId, campaignId, { type: 'player-state-updated' }),
    ])
  }

  private async safePublish(channel: string, event: RealtimeEvent): Promise<void> {
    if (!this.redis) return
    try {
      await this.redis.publish(channel, JSON.stringify(event))
    } catch (err) {
      // Never let pub/sub failures propagate into business logic.
      this.log?.debug({ err, channel, type: event.type }, 'realtime publish failed')
    }
  }
}
