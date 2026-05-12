import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAdmin } from '../../lib/jwt-user'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'
import { makeStorage } from '../../services/storage.service'

/**
 * POST /api/v1/admin/uploads
 *
 * Admin-only file uploader. The canvas builder calls this whenever an
 * operator picks an image (wheel face, background, etc.) and stores only
 * the returned URL in canvas JSON — never the bytes themselves. That keeps
 * the campaign row tiny and `canvas-config` PUTs well under the normal
 * 1 MB body limit.
 *
 * Multipart form field: `file` (required).
 * Query string: `folder` (optional, e.g. "wheel", "backgrounds").
 * Response: { url, key, size, contentType }
 */

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB per file
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/v1/admin/uploads',
    { preHandler: requireAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // @fastify/multipart gives us a single async-iterator; we expect
        // exactly one `file` field per upload. Multi-file batch uploads
        // can come later if the UX ever needs them.
        const file = await request.file()
        if (!file) return sendError(reply, 'VALIDATION_ERROR', 'No file provided', 400)

        if (!ALLOWED_TYPES.has(file.mimetype)) {
          return sendError(reply, 'VALIDATION_ERROR', `Unsupported file type: ${file.mimetype}`, 400)
        }

        const buffer = await file.toBuffer()
        if (buffer.byteLength > MAX_BYTES) {
          return sendError(reply, 'VALIDATION_ERROR', `File too large (max ${MAX_BYTES / 1024 / 1024} MB)`, 400)
        }

        const folderParam = (request.query as { folder?: string })?.folder
        const stored = await makeStorage().save({
          buffer,
          filename: file.filename,
          contentType: file.mimetype,
          folder: folderParam,
        })

        return sendSuccess(reply, stored)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
