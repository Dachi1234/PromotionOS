import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import './lib/jwt-user'
import { dbPlugin } from './plugins/db.plugin'
import { redisPlugin } from './plugins/redis.plugin'
import { registerAuthMiddleware } from './middleware/auth.middleware'
import { AppError } from './lib/errors'

import { campaignRoutes } from './modules/campaigns/campaign.routes'
import { playerRoutes } from './modules/players/player.routes'
import { eventRoutes } from './modules/events/event.routes'
import { healthRoutes } from './routes/health.routes'
import { aggregationPreviewRoutes } from './routes/admin/aggregation-preview.routes'
import { adminMechanicRoutes } from './routes/admin/mechanic.routes'
import { segmentPreviewRoutes } from './routes/admin/segment-preview.routes'
import { canvasConfigRoutes } from './routes/admin/canvas-config.routes'
import { wizardDraftRoutes } from './routes/admin/wizard-draft.routes'
import { auditLogRoutes } from './routes/admin/audit-log.routes'
import { authRoutes } from './routes/admin/auth.routes'
import { publicCampaignRoutes } from './routes/public/campaign.routes'
import { playerStateRoutes } from './routes/public/player-state.routes'
import { mechanicRoutes } from './routes/public/mechanic.routes'
import { rewardRoutes } from './routes/public/reward.routes'
import { publicCanvasConfigRoutes } from './routes/public/canvas-config.routes'
import { streamRoutes } from './routes/public/stream.routes'

import { MockPlayerContextService } from './mocks/mock-player-context.service'
import { MockRewardGateway } from './mocks/mock-reward-gateway.service'
import type { IPlayerContextService } from './interfaces/player-context.interface'
import type { IRewardGateway } from './interfaces/reward-gateway.interface'

type Db = PostgresJsDatabase<typeof schema>

export function createPlayerContextService(db: Db): IPlayerContextService {
  const provider = process.env.PLAYER_CONTEXT_PROVIDER ?? 'mock'
  if (provider === 'mock') {
    return new MockPlayerContextService(db)
  }
  throw new Error(
    `OddsPlayerContextService not implemented yet. Set PLAYER_CONTEXT_PROVIDER=mock`,
  )
}

export function createRewardGateway(db: Db): IRewardGateway {
  const gateway = process.env.REWARD_GATEWAY ?? 'mock'
  if (gateway === 'mock') {
    return new MockRewardGateway(db)
  }
  throw new Error(
    `ExternalRewardGateway not implemented yet. Set REWARD_GATEWAY=mock`,
  )
}

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(process.env.NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
    },
    bodyLimit: 1_048_576,
  })

  const allowedOrigins = process.env.ALLOWED_ORIGINS
  await fastify.register(cors, {
    origin: allowedOrigins
      ? allowedOrigins.split(',').map((o) => o.trim())
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token'],
  })

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  await fastify.register(jwt, { secret: jwtSecret })
  await fastify.register(dbPlugin)
  await fastify.register(redisPlugin)

  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'PromotionOS Engine API',
          description: 'Casino promotion engine — public and admin endpoints',
          version: '4.0.0',
        },
        components: {
          securitySchemes: {
            sessionToken: { type: 'apiKey', in: 'header', name: 'x-session-token' },
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await fastify.register(swaggerUi, {
      routePrefix: '/api/v1/docs',
    })
  }

  await fastify.register(rateLimit, {
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      const sessionToken = request.headers['x-session-token']
      if (typeof sessionToken === 'string') return `session:${sessionToken}`
      return request.ip
    },
    allowList: (request) => {
      const url = request.url ?? ''
      if (url === '/health' || url.startsWith('/api/v1/health')) return true
      // SSE is a single long-lived request per tab, not repeated traffic;
      // counting it against the normal limit would misreport abuse.
      if (url.startsWith('/api/v1/stream')) return true
      return false
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds`,
        retryAfter: Math.ceil(context.ttl / 1000),
      },
    }),
  })

  const playerContextService = createPlayerContextService(fastify.db)
  registerAuthMiddleware(fastify, playerContextService)

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '7.0.0',
  }))

  // Phase 1 admin routes
  await fastify.register(campaignRoutes)
  await fastify.register(playerRoutes)
  await fastify.register(eventRoutes)

  // Phase 2 routes
  await fastify.register(healthRoutes)
  await fastify.register(aggregationPreviewRoutes)

  // Auth routes (no requireAdmin — this IS the login endpoint)
  await fastify.register(authRoutes)

  // Phase 4 admin routes
  await fastify.register(adminMechanicRoutes)
  await fastify.register(segmentPreviewRoutes)
  await fastify.register(canvasConfigRoutes)
  await fastify.register(wizardDraftRoutes)
  await fastify.register(auditLogRoutes)

  // Phase 4 public routes
  await fastify.register(publicCampaignRoutes)
  await fastify.register(playerStateRoutes)
  await fastify.register(mechanicRoutes)
  await fastify.register(rewardRoutes)
  await fastify.register(publicCanvasConfigRoutes)
  await fastify.register(streamRoutes, { playerContextService })

  // Spin-specific rate limit (stricter)
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/spin') && request.method === 'POST') {
      const sessionToken = request.headers['x-session-token']
      const key = typeof sessionToken === 'string' ? `spin:${sessionToken}` : `spin:${request.ip}`
      const redisClient = fastify.redis
      if (redisClient) {
        try {
          const count = await redisClient.incr(key)
          if (count === 1) await redisClient.expire(key, 60)
          if (count > 10) {
            return reply.code(429).send({
              success: false,
              error: {
                code: 'RATE_LIMITED',
                message: 'Spin rate limit: max 10 per minute',
                retryAfter: await redisClient.ttl(key),
              },
            })
          }
        } catch { /* Redis unavailable, skip spin rate limit */ }
      }
    }
  })

  fastify.setErrorHandler(async (error: Error & { statusCode?: number; code?: string; validation?: unknown }, request, reply) => {
    if (reply.sent) return

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message },
      })
    }

    if (error.validation) {
      return reply.code(422).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      })
    }

    fastify.log.error({ err: error, url: request.url }, 'Unhandled error')

    const statusCode = error.statusCode ?? 500
    return reply.code(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
      },
    })
  })

  return fastify
}
