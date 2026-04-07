import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

interface Player {
  id: string
  externalId: string
  displayName: string
  email?: string
  segmentTags: string[]
  vipTier: string
  totalDepositsGel: string
  registrationDate: string
  createdAt: string
}

export function usePlayers(params?: { page?: number; limit?: number; vipTier?: string; segmentTag?: string }) {
  return useQuery({
    queryKey: ['players', 'list', params],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.page) query.set('page', String(params.page))
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.vipTier) query.set('vipTier', params.vipTier)
      if (params?.segmentTag) query.set('segmentTag', params.segmentTag)
      const res = await api.get<{ players: Player[] }>(`/api/v1/admin/players?${query}`)
      return { players: res.data?.players ?? [], meta: res.meta }
    },
    staleTime: 30_000,
  })
}

export function useCreatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<{ player: Player }>('/api/v1/admin/players', data)
      return res.data!.player
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  })
}

export function useCreateSession() {
  return useMutation({
    mutationFn: async (playerId: string) => {
      const res = await api.post<{ token: string; expiresAt: string }>(`/api/v1/admin/players/${playerId}/session`)
      return res.data!
    },
  })
}

export function useSegmentPreview() {
  return useMutation({
    mutationFn: async (conditionTree: Record<string, unknown>) => {
      const res = await api.post<{ matchingCount: number; totalPlayers: number; preview: { id: string; displayName: string }[] }>('/api/v1/admin/segments/preview', { conditionTree })
      return res.data!
    },
  })
}

export function useEvents(params?: { page?: number; limit?: number; eventType?: string; processed?: string }) {
  return useQuery({
    queryKey: ['events', 'list', params],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.page) query.set('page', String(params.page))
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.eventType) query.set('eventType', params.eventType)
      if (params?.processed) query.set('processed', params.processed)
      const res = await api.get<{ events: unknown[] }>(`/api/v1/admin/events?${query}`)
      return { events: res.data?.events ?? [], meta: res.meta }
    },
    staleTime: 15_000,
  })
}
