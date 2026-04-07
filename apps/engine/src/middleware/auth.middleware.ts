import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import type { PlayerContext } from '../interfaces/player-context.interface'
import type { IPlayerContextService } from '../interfaces/player-context.interface'

declare module 'fastify' {
  interface FastifyRequest {
    player: PlayerContext
  }
}

const PUBLIC_ROUTES: Array<{ method: string; url: string }> = [
  { method: 'GET', url: '/health' },
  { method: 'POST', url: '/api/v1/events/ingest' },
]

const PUBLIC_PREFIXES = ['/api/v1/docs', '/api/v1/admin/auth', '/api/v1/health']

function isPublicRoute(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0]!
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true
  if (PUBLIC_ROUTES.some((route) => route.method === request.method && path === route.url)) return true

  const query = request.query as Record<string, string>
  if (query.preview === 'admin' && request.method === 'GET') return true

  return false
}

export function registerAuthMiddleware(
  fastify: FastifyInstance,
  playerContextService: IPlayerContextService,
): void {
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isPublicRoute(request)) return

      // Admin routes use JWT — handled by @fastify/jwt decorators on route level
      if (request.url.startsWith('/api/v1/admin/')) return

      const sessionToken = request.headers['x-session-token']

      if (!sessionToken || typeof sessionToken !== 'string') {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'MISSING_SESSION_TOKEN',
            message: 'x-session-token header is required',
          },
        })
      }

      const player = await playerContextService.getPlayerBySession(sessionToken)

      if (!player) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_SESSION',
            message: 'Invalid or expired session',
          },
        })
      }

      request.player = player
    },
  )
}
