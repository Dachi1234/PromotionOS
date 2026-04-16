'use client'

import { useState, useCallback, useEffect } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useOptIn, useCampaignDetail, type CampaignDetailData } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { TemplatePicker } from '@/components/builder/template-picker'
import type { TemplateStyle, OptInTemplateProps } from '@/components/templates/shared-types'
import { ClassicCTA } from '@/components/templates/opt-in/classic-cta'
import { CleanPill } from '@/components/templates/opt-in/clean-pill'
import { NeonPulse } from '@/components/templates/opt-in/neon-pulse'
import { LuxeOptIn } from '@/components/templates/opt-in/luxe-opt-in'
import { StoryOptIn } from '@/components/templates/opt-in/story-opt-in'
import { WidgetIneligible } from '@/components/shared/widget-state'
import { PulseOn } from '@/components/motion/pulse-on'

interface OptInProps {
  preOptInLabel: string
  postOptInLabel: string
  notEligibleLabel: string
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
}

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<OptInTemplateProps>> = {
  classic: ClassicCTA,
  modern: CleanPill,
  neon: NeonPulse,
  luxe: LuxeOptIn,
  story: StoryOptIn,
}

export const OptInButtonWidget: UserComponent<OptInProps> = (props) => {
  const { preOptInLabel, postOptInLabel, notEligibleLabel, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, isAdminPreview, language, campaignSlug } = useCanvasStore()
  const optInMutation = useOptIn(campaignSlug || '')
  const { data: campaignData } = useCampaignDetail(isBuilder ? null : campaignSlug)
  const campaign = campaignData as CampaignDetailData | undefined
  const [optedIn, setOptedIn] = useState(false)

  const isEligible = campaign?.eligibility?.isEligible !== false
  const isAlreadyOptedIn = campaign?.isOptedIn === true

  useEffect(() => {
    if (isAlreadyOptedIn) setOptedIn(true)
  }, [isAlreadyOptedIn])

  const handleOptIn = useCallback(async () => {
    if (isBuilder || isAdminPreview || optedIn || !isEligible) return
    try {
      await optInMutation.mutateAsync()
      setOptedIn(true)
    } catch { /* handled */ }
  }, [isBuilder, isAdminPreview, optInMutation, optedIn, isEligible])

  const TemplateComponent = TEMPLATE_MAP[template] || ClassicCTA

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  // Runtime ineligible — segment-gated or failed a pre-condition. Surface
  // the operator-configured label so players see *why*, not a dead button.
  if (!isBuilder && !isEligible) {
    return (
      <div ref={dragRef} className={ringClass}>
        <WidgetIneligible
          reason={notEligibleLabel || t(language, 'optIn.notEligible')}
        />
      </div>
    )
  }

  // Happy path — pulse briefly after opt-in flips to true (confirms the
  // click without a separate toast).
  return (
    <div ref={dragRef} className={ringClass}>
      <PulseOn watch={optedIn} tone="success">
        <TemplateComponent
          optedIn={optedIn}
          eligible={isBuilder || isEligible}
          onOptIn={handleOptIn}
          preLabel={preOptInLabel || t(language, 'optIn.joinNow')}
          postLabel={postOptInLabel || t(language, 'optIn.youreIn')}
          accentColor={accentColor}
          textColor={textColor}
          bgColor={bgColor}
        />
      </PulseOn>
    </div>
  )
}

function OptInSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as OptInProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="OPT_IN" />
      <div className="space-y-3 p-3">
        <label className="block text-xs font-medium">Pre Opt-In Label</label>
        <input value={props.preOptInLabel} onChange={(e) => setProp((p: OptInProps) => { p.preOptInLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Post Opt-In Label</label>
        <input value={props.postOptInLabel} onChange={(e) => setProp((p: OptInProps) => { p.postOptInLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Not Eligible Label</label>
        <input value={props.notEligibleLabel} onChange={(e) => setProp((p: OptInProps) => { p.notEligibleLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: OptInProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: OptInProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: OptInProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

OptInButtonWidget.craft = {
  displayName: 'Opt-In Button',
  props: {
    preOptInLabel: '',
    postOptInLabel: '',
    notEligibleLabel: '',
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: OptInSettings },
}
