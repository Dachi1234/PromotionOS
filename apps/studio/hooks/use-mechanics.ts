import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useCreateMechanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: Record<string, unknown> }) => {
      const res = await api.post(`/api/v1/admin/campaigns/${campaignId}/mechanics`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useUpdateMechanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mechanicId, data }: { mechanicId: string; data: Record<string, unknown> }) => {
      const res = await api.put(`/api/v1/admin/mechanics/${mechanicId}`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useDeleteMechanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mechanicId: string) => {
      await api.delete(`/api/v1/admin/mechanics/${mechanicId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useCreateRewardDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mechanicId, data }: { mechanicId: string; data: Record<string, unknown> }) => {
      const res = await api.post(`/api/v1/admin/mechanics/${mechanicId}/reward-definitions`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useCreateAggregationRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: Record<string, unknown> }) => {
      const res = await api.post(`/api/v1/admin/campaigns/${campaignId}/aggregation-rules`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}
