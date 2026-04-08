import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { studioUsers } from '@promotionos/db'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Track failed login attempts per IP for basic brute-force protection
  const failedAttempts = new Map<string, { count: number; lastAttempt: number }>()
  const MAX_FAILED_ATTEMPTS = 10
  const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

  fastify.post(
    '/api/v1/admin/auth/login',
    async (request, reply: FastifyReply) => {
      const clientIp = request.ip

      // Check brute-force lockout
      const attempts = failedAttempts.get(clientIp)
      if (attempts) {
        const elapsed = Date.now() - attempts.lastAttempt
        if (elapsed > LOCKOUT_WINDOW_MS) {
          failedAttempts.delete(clientIp)
        } else if (attempts.count >= MAX_FAILED_ATTEMPTS) {
          return reply.code(429).send({
            success: false,
            error: {
              code: 'TOO_MANY_ATTEMPTS',
              message: 'Too many login attempts. Try again later.',
              retryAfter: Math.ceil((LOCKOUT_WINDOW_MS - elapsed) / 1000),
            },
          })
        }
      }

      const parsed = loginSchema.safeParse(request.body)
      if (!parsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', parsed.error.message)
      }

      try {
        const [user] = await fastify.db
          .select()
          .from(studioUsers)
          .where(eq(studioUsers.email, parsed.data.email))
          .limit(1)

        if (!user) {
          recordFailedAttempt(failedAttempts, clientIp)
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
          })
        }

        // Verify password using bcrypt (seed stores bcrypt hashes)
        const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash)

        if (!passwordValid) {
          recordFailedAttempt(failedAttempts, clientIp)
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
          })
        }

        // Clear failed attempts on successful login
        failedAttempts.delete(clientIp)

        const token = fastify.jwt.sign(
          { sub: user.id, email: user.email, role: user.role },
          { expiresIn: '24h' },
        )

        return sendSuccess(reply, { token, user: { id: user.id, email: user.email, role: user.role } })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}

function recordFailedAttempt(
  map: Map<string, { count: number; lastAttempt: number }>,
  ip: string,
): void {
  const existing = map.get(ip)
  map.set(ip, {
    count: (existing?.count ?? 0) + 1,
    lastAttempt: Date.now(),
  })
}
