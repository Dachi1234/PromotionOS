'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWizardStore } from '@/stores/wizard-store'
import { useCampaign } from '@/hooks/use-campaigns'
import { WizardShell } from '@/components/wizard/wizard-shell'

function toLocalDateTimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading } = useCampaign(params.id)
  const hydrate = useWizardStore((s) => s.hydrate)

  useEffect(() => {
    if (!data) return
    const campaign = data.campaign as unknown as Record<string, unknown>
    hydrate({
      campaignId: params.id,
      name: campaign.name as string ?? '',
      slug: campaign.slug as string ?? '',
      description: (campaign.description as string) ?? '',
      startsAt: campaign.startsAt ? toLocalDateTimeString(new Date(campaign.startsAt as string)) : '',
      endsAt: campaign.endsAt ? toLocalDateTimeString(new Date(campaign.endsAt as string)) : '',
      currency: (campaign.currency as string) ?? 'GEL',
    })
  }, [data, params.id, hydrate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return <WizardShell />
}
