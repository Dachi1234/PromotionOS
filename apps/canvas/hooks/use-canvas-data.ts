import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicApi } from '@/lib/api-client'
import { useCanvasStore } from '@/stores/canvas-store'

export interface PlayerReward {
  id: string
  type: string
  label?: string
  amount?: number
  status: string
  grantedAt?: string
  config?: Record<string, unknown>
}

export interface PlayerStateData {
  optedIn?: boolean
  mechanics?: Record<string, {
    type: string
    rewards?: PlayerReward[]
    progress?: { current: number; target: number }
    spinsRemaining?: number | null
  }>
  rewards?: PlayerReward[]
}

export function usePlayerState(campaignSlug: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  const isAdminPreview = token === '__admin_preview__'
  return useQuery({
    queryKey: ['player-state', campaignSlug],
    queryFn: () => publicApi<PlayerStateData>(`/api/v1/campaigns/${campaignSlug}/player-state`, token!),
    enabled: !!token && !!campaignSlug && !isAdminPreview,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error?.message?.includes('403') || error?.message?.includes('not opted')) return false
      return failureCount < 3
    },
  })
}

export function useCampaignDetail(slug: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  const isAdminPreview = token === '__admin_preview__'
  return useQuery({
    queryKey: ['campaign-detail', slug, isAdminPreview],
    queryFn: () => publicApi<Record<string, unknown>>(
      `/api/v1/campaigns/${slug}${isAdminPreview ? '?preview=admin' : ''}`,
      token!,
    ),
    enabled: !!token && !!slug,
    staleTime: 60_000,
  })
}

export function useCanvasConfig(slug: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  const isAdminPreview = token === '__admin_preview__'
  return useQuery({
    queryKey: ['canvas-config', slug, isAdminPreview],
    queryFn: () => publicApi<{ canvasConfig: unknown }>(
      `/api/v1/campaigns/${slug}/canvas${isAdminPreview ? '?preview=admin' : ''}`,
      token!,
    ),
    enabled: !!token && !!slug,
    staleTime: 300_000,
  })
}

export function useLeaderboard(mechanicId: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  return useQuery({
    queryKey: ['leaderboard', mechanicId],
    queryFn: () => publicApi<{ entries: unknown[]; playerRank?: unknown }>(`/api/v1/mechanics/${mechanicId}/leaderboard`, token!),
    enabled: !!token && !!mechanicId,
    refetchInterval: 30_000,
  })
}

export function useMissionState(mechanicId: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  return useQuery({
    queryKey: ['mission-state', mechanicId],
    queryFn: () => publicApi<{ steps: unknown[] }>(`/api/v1/mechanics/${mechanicId}/missions`, token!),
    enabled: !!token && !!mechanicId,
    refetchInterval: 10_000,
  })
}

export interface SpinResultData {
  type: string
  sliceIndex: number
  rewardDefinitionId: string
  rewardType: string
  playerRewardId: string
}

export function useSpin(mechanicId: string) {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => publicApi<SpinResultData>(`/api/v1/mechanics/${mechanicId}/spin`, token!, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-state'] })
    },
  })
}

export function useOptIn(campaignSlug: string) {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => publicApi<unknown>(`/api/v1/campaigns/${campaignSlug}/opt-in`, token!, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-detail'] })
      qc.invalidateQueries({ queryKey: ['player-state'] })
    },
  })
}

export function useClaimReward() {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => publicApi<unknown>(`/api/v1/rewards/${rewardId}/claim`, token!, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-state'] })
    },
  })
}

export function useCashoutClaim(mechanicId: string) {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      publicApi<unknown>(`/api/v1/mechanics/${mechanicId}/claim`, token!, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-state'] })
    },
  })
}

export function useProgressClaim(mechanicId: string) {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      publicApi<{ claimed: boolean; playerRewardId?: string }>(`/api/v1/mechanics/${mechanicId}/claim-progress`, token!, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-state'] })
    },
  })
}

export function useMissionClaim(mechanicId: string) {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stepId: string) =>
      publicApi<unknown>(`/api/v1/mechanics/${mechanicId}/missions/${stepId}/claim`, token!, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-state'] })
      qc.invalidateQueries({ queryKey: ['mission-state'] })
    },
  })
}

export interface MechanicDetail {
  id: string
  type: string
  config: Record<string, unknown>
  displayOrder: number
  isActive: boolean
  rewards: {
    id: string
    mechanicId: string
    type: string
    config: Record<string, unknown>
    conditionConfig: unknown
  }[]
}

export interface CampaignDetailData {
  campaign: Record<string, unknown>
  mechanics: MechanicDetail[]
  eligibility: { isEligible: boolean; segmentIncluded: boolean; failedConditions: string[] }
  isOptedIn: boolean
}

export function useMechanicFromCampaign(slug: string | null, mechanicId: string | null) {
  const { data } = useCampaignDetail(slug)
  const campaign = data as CampaignDetailData | undefined
  if (!campaign?.mechanics || !mechanicId) return null
  return campaign.mechanics.find((m) => m.id === mechanicId) ?? null
}

export function usePlayerRewards(campaignSlug: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  const isAdminPreview = token === '__admin_preview__'
  return useQuery({
    queryKey: ['player-rewards', campaignSlug],
    queryFn: () => {
      const campaignParam = campaignSlug ? `&campaignId=${campaignSlug}` : ''
      return publicApi<{ rewards: PlayerReward[] }>(`/api/v1/rewards?pageSize=50${campaignParam}`, token!)
    },
    enabled: !!token && !!campaignSlug && !isAdminPreview,
    refetchInterval: 15_000,
  })
}
