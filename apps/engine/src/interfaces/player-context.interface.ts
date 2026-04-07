export interface PlayerContext {
  id: string
  externalId: string
  displayName: string
  email?: string
  segmentTags: string[]
  vipTier: 'bronze' | 'silver' | 'gold' | 'platinum'
  totalDepositsGel: number
  registrationDate: Date
}

export interface IPlayerContextService {
  getPlayerBySession(sessionToken: string): Promise<PlayerContext | null>
  getPlayerById(id: string): Promise<PlayerContext | null>
}
