/**
 * Server-Sent Events (SSE) stream for the canvas player surface.
 *
 * Replaces the previous poll-on-interval pattern used by the canvas
 * (`refetchInterval` every 10-30s). The canvas opens one EventSource per
 * player+campaign; the engine pushes events whenever relevant state changes.
 *
 * Why a dedicated route with manual auth?
 *   Browser `EventSource` cannot set custom headers, so the `x-session-token`
 *   flow won't work — we accept `?token=...` on the query string instead.
 *   The auth middleware's PUBLIC_PREFIXES therefore whitelists `/api/v1/stream`
 *   and this handler does its own validation.
 *
 * Why a duplicated Redis connection?
 *   ioredis enters "subscriber mode" after `subscribe(...)` and can no longer
 *   run regular commands on the same connection. The app's `fastify.redis`
 *   decorator is the command connection; we `.duplicate()` it for each SSE
 *   client so subscribes don't contaminate it.
 *
 * Protocol:
 *   - Writes a `retry: 5000` directive so browsers auto-reconnect after 5s.
 *   - Sends a single `event: connected` message on open.
 *   - Forwards each Redis pub/sub payload verbatim as the `data:` field,
 *     using the parsed `type` as the `event:` name.
 *   - Emits a `:` ping comment every 20s so intermediaries don't idle-close.
 *   - Cleans up both the subscriber and the ping interval when the client
 *     disconnects.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Redis } from 'ioredis'
import { CHANNEL } from '../../services/realtime-publisher.service'
import type { IPlayerContextService } from '../../interfaces/player-context.interface'
import { CampaignRepository } from '../../modules/campaigns/campaign.repository'

const KEEPALIVE_INTERVAL_MS = 20_000

interface StreamQuery {
  slug?: string
  token?: string
}

export async function streamRoutes(
  fastify: FastifyInstance,
  opts: { playerContextService: IPlayerContextService },
): Promise<void> {
  const { playerContextService } = opts
  const campaignRepo = new CampaignRepository(fastify.db)

  fastify.get('/api/v1/stream', async (request: FastifyRequest<{ Querystring: StreamQuery }>, reply) => {
    const { slug, token: queryToken } = request.query
    const headerToken = request.headers['x-session-token']
    const token =
      queryToken ??
      (typeof headerToken === 'string' ? headerToken : undefined)

    if (!slug || !token) {
      return reply.code(400).send({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'slug and token required' },
      })
    }

    const [player, campaign] = await Promise.all([
      playerContextService.getPlayerBySession(token),
      campaignRepo.findBySlug(slug),
    ])

    if (!player) {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Invalid or expired session' },
      })
    }
    if (!campaign) {
      return reply.code(404).send({
        success: false,
        error: { code: 'CAMPAIGN_NOT_FOUND', message: `No campaign with slug ${slug}` },
      })
    }

    const redis = fastify.redis
    if (!redis) {
      return reply.code(503).send({
        success: false,
        error: {
          code: 'REALTIME_UNAVAILABLE',
          message: 'Realtime stream requires Redis; falling back to polling',
        },
      })
    }

    // Take manual control of the response: we stream and close ourselves.
    reply.hijack()
    const raw = reply.raw
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx/proxy buffering
    })
    raw.write('retry: 5000\n\n')
    writeEvent(raw, 'connected', {
      playerId: player.id,
      campaignId: campaign.id,
      ts: Date.now(),
    })

    const subscriber: Redis = redis.duplicate()
    const playerChannel = CHANNEL.playerScope(player.id, campaign.id)
    const campaignChannel = CHANNEL.campaignScope(campaign.id)

    subscriber.on('message', (_channel, raw) => {
      let parsed: { type?: string } | null = null
      try {
        parsed = JSON.parse(raw) as { type?: string }
      } catch {
        return
      }
      if (!parsed?.type) return
      writeEvent(reply.raw, parsed.type, parsed)
    })

    try {
      await subscriber.subscribe(playerChannel, campaignChannel)
    } catch (err) {
      fastify.log.warn({ err, playerChannel, campaignChannel }, 'SSE subscribe failed')
      safeEnd(raw)
      await subscriber.quit().catch(() => undefined)
      return
    }

    // Proxies (nginx/Cloudflare) idle-close at 30-60s; ping every 20s.
    const ping = setInterval(() => {
      try {
        raw.write(`: ping ${Date.now()}\n\n`)
      } catch {
        /* connection dead, cleanup on 'close' */
      }
    }, KEEPALIVE_INTERVAL_MS)

    const cleanup = async (): Promise<void> => {
      clearInterval(ping)
      try {
        await subscriber.unsubscribe(playerChannel, campaignChannel)
      } catch {
        /* ignore */
      }
      try {
        await subscriber.quit()
      } catch {
        /* ignore */
      }
      safeEnd(raw)
    }

    request.raw.on('close', cleanup)
    request.raw.on('error', cleanup)
  })
}

function writeEvent(
  raw: import('http').ServerResponse,
  event: string,
  data: unknown,
): void {
  try {
    raw.write(`event: ${event}\n`)
    raw.write(`data: ${JSON.stringify(data)}\n\n`)
  } catch {
    /* client gone */
  }
}

function safeEnd(raw: import('http').ServerResponse): void {
  try {
    raw.end()
  } catch {
    /* already ended */
  }
}
