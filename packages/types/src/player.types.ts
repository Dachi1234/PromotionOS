import type { z } from 'zod'
import type {
  vipTierSchema,
  createPlayerSchema,
  listPlayersQuerySchema,
  playerResponseSchema,
  playerContextSchema,
  createSessionResponseSchema,
} from '@promotionos/zod-schemas'

export type VipTier = z.infer<typeof vipTierSchema>
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type ListPlayersQuery = z.infer<typeof listPlayersQuerySchema>
export type PlayerResponse = z.infer<typeof playerResponseSchema>
export type PlayerContext = z.infer<typeof playerContextSchema>
export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>
