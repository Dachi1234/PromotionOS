import { randomUUID } from 'crypto'
import type { PlayerRepository } from './player.repository'
import type { CreatePlayerInput, ListPlayersQuery } from './player.schema'
import { AppError } from '../../lib/errors'

export class PlayerService {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async createPlayer(input: CreatePlayerInput) {
    const existing = await this.playerRepository.findByExternalId(
      input.externalId,
    )
    if (existing) {
      throw new AppError(
        'EXTERNAL_ID_CONFLICT',
        `Player with external_id "${input.externalId}" already exists`,
        409,
      )
    }

    return this.playerRepository.create({
      externalId: input.externalId,
      displayName: input.displayName,
      email: input.email,
      segmentTags: input.segmentTags,
      vipTier: input.vipTier,
      totalDepositsGel: input.totalDepositsGel,
      registrationDate: input.registrationDate,
    })
  }

  async listPlayers(query: ListPlayersQuery) {
    return this.playerRepository.list({
      page: query.page,
      limit: query.limit,
      vipTier: query.vipTier,
      segmentTag: query.segmentTag,
    })
  }

  async createSession(playerId: string) {
    const player = await this.playerRepository.findById(playerId)
    if (!player) {
      throw new AppError('PLAYER_NOT_FOUND', 'Player not found', 404)
    }

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const session = await this.playerRepository.createSession({
      playerId,
      token,
      expiresAt,
    })

    return { token: session.token, expiresAt: session.expiresAt }
  }
}
