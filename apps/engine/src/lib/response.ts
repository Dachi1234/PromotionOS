import type { FastifyReply } from 'fastify'
import { ERROR_CODES } from './error-codes'
import type { ErrorCode } from './error-codes'
import { AppError } from './errors'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  meta?: PaginationMeta
  error?: { code: string; message: string; details?: unknown }
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export function sendSuccess<T>(reply: FastifyReply, data: T, status = 200): FastifyReply {
  return reply.code(status).send({ success: true, data })
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T,
  meta: PaginationMeta,
): FastifyReply {
  return reply.send({ success: true, data, meta })
}

export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message?: string,
  details?: unknown,
): FastifyReply {
  const errorDef = ERROR_CODES[code]
  return reply.code(errorDef.status).send({
    success: false,
    error: {
      code,
      message: message ?? errorDef.message,
      ...(details ? { details } : {}),
    },
  })
}

export function handleRouteError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message },
    })
  }
  throw err
}

export function paginationMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  }
}
