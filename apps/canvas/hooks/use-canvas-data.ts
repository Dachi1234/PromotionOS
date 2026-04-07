import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicApi } from '@/lib/api-client'
import { useCanvasStore } from '@/stores/canvas-store'

export function usePlayerState(campaignSlug: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  return useQuery({
    queryKey: ['player-state', campaignSlug],
    queryFn: () => publicApi<Record<string, unknown>>(`/api/v1/campaigns/${campaignSlug}/player-state`, token!),
    enabled: !!token && !!campaignSlug,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
}

export function useCampaignDetail(slug: string | null) {
  const token = useCanvasStore((s) => s.sessionToken)
  return useQuery({
    queryKey: ['campaign-detail', slug],
    queryFn: () => publicApi<Record<string, unknown>>(`/api/v1/campaigns/${slug}`, token!),
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

export function useSpin(mechanicId: string) {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => publicApi<{ outcome: unknown }>(`/api/v1/mechanics/${mechanicId}/spin`, token!, { method: 'POST' }),
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
