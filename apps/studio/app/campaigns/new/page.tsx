'use client'

import { useEffect } from 'react'
import { useWizardStore } from '@/stores/wizard-store'
import { WizardShell } from '@/components/wizard/wizard-shell'

export default function NewCampaignPage() {
  const reset = useWizardStore((s) => s.reset)
  useEffect(() => { reset() }, [reset])
  return <WizardShell />
}
