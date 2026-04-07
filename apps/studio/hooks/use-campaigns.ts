import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

interface Campaign {
  id: string
  name: string
  slug: string
  description?: string
  status: string
  startsAt: string
  endsAt: string
  currency: string
  createdAt: string
  targetSegmentId?: string
  canvasConfig?: unknown
}

interface CampaignListResponse {
  campaigns: Campaign[]
}

interface CampaignDetailResponse {
  campaign: Campaign
  mechanics: unknown[]
  aggregationRules: unknown[]
  rewardDefinitions: unknown[]
}

export function useCampaigns(params?: { status?: string; page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['campaigns', 'list', params],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.status && params.status !== 'all') query.set('status', params.status)
      if (params?.page) query.set('page', String(params.page))
      if (params?.limit) query.set('limit', String(params.limit))
      const res = await api.get<CampaignListResponse>(`/api/v1/admin/campaigns?${query}`)
      return { campaigns: res.data?.campaigns ?? [], meta: res.meta }
    },
    staleTime: 30_000,
  })
}

export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ['campaigns', 'detail', id],
    queryFn: async () => {
      const res = await api.get<CampaignDetailResponse>(`/api/v1/admin/campaigns/${id}`)
      return res.data
    },
    enabled: !!id,
    staleTime: 10_000,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<{ campaign: Campaign }>('/api/v1/admin/campaigns', data)
      return res.data!.campaign
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.patch<{ campaign: Campaign }>(`/api/v1/admin/campaigns/${id}`, data)
      return res.data!.campaign
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useTransitionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch<{ campaign: Campaign }>(`/api/v1/admin/campaigns/${id}/status`, { status })
      return res.data!.campaign
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/admin/campaigns/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}
