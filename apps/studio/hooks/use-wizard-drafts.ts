import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

interface WizardDraft {
  id: string
  campaignId: string | null
  ownerId: string
  stepData: Record<string, unknown>
  lastSavedAt: string
}

export function useWizardDraftByCampaign(campaignId: string | null) {
  return useQuery({
    queryKey: ['wizard-drafts', 'by-campaign', campaignId],
    queryFn: async () => {
      const res = await api.get<{ draft: WizardDraft | null }>(
        `/api/v1/admin/wizard-drafts/by-campaign/${campaignId}`,
      )
      return res.data?.draft ?? null
    },
    enabled: !!campaignId,
  })
}

export function useSaveWizardDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ draftId, campaignId, stepData }: {
      draftId?: string | null
      campaignId?: string | null
      stepData: Record<string, unknown>
    }) => {
      if (draftId) {
        const res = await api.put<{ draft: WizardDraft }>(
          `/api/v1/admin/wizard-drafts/${draftId}`,
          { campaignId, stepData },
        )
        return res.data!.draft
      } else {
        const res = await api.post<{ draft: WizardDraft }>(
          '/api/v1/admin/wizard-drafts',
          { campaignId, stepData },
        )
        return res.data!.draft
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wizard-drafts'] }),
  })
}

export function useDeleteWizardDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (draftId: string) => {
      await api.delete(`/api/v1/admin/wizard-drafts/${draftId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wizard-drafts'] }),
  })
}
