'use client'

import { useState, useCallback, useEffect } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useOptIn, useCampaignDetail, type CampaignDetailData } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import { WidgetIneligible } from '@/components/shared/widget-state'
import { PulseOn } from '@/components/motion/pulse-on'

interface OptInProps {
  preOptInLabel: string
  postOptInLabel: string
  notEligibleLabel: string
  accentColor: string
  textColor: string
  bgColor: string
}

export const OptInButtonWidget: UserComponent<OptInProps> = (props) => {
  const { preOptInLabel, postOptInLabel, notEligibleLabel, accentColor, textColor, bgColor } = props
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

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  if (!isBuilder && !isEligible) {
    return (
      <div ref={dragRef} className={ringClass}>
        <WidgetIneligible
          reason={notEligibleLabel || t(language, 'optIn.notEligible')}
        />
      </div>
    )
  }

  const GOLD = accentColor || '#D4AF37'
  const bg = bgColor || '#0B1220'
  const fg = textColor || '#E9EEF5'
  const label = optedIn
    ? (postOptInLabel || t(language, 'optIn.youreIn'))
    : (preOptInLabel || t(language, 'optIn.joinNow'))

  return (
    <div ref={dragRef} className={ringClass}>
      <PulseOn watch={optedIn} tone="success">
        <div
          style={{
            background: bg,
            borderRadius: 10,
            padding: 20,
            border: `1px solid ${GOLD}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display, system-ui)',
          }}
        >
          <button
            type="button"
            onClick={handleOptIn}
            disabled={optedIn || isBuilder}
            style={{
              padding: '14px 44px',
              borderRadius: 999,
              background: optedIn ? 'transparent' : `linear-gradient(180deg, #F5E19A 0%, ${GOLD} 55%, #7A5A1A 100%)`,
              color: optedIn ? GOLD : '#0B1220',
              border: optedIn ? `2px solid ${GOLD}` : `1px solid ${GOLD}90`,
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: optedIn || isBuilder ? 'default' : 'pointer',
              boxShadow: optedIn ? 'none' : `0 8px 22px -8px ${GOLD}80, 0 0 0 1px rgba(255,255,255,0.3) inset`,
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        </div>
        <span style={{ display: 'none' }}>{fg}</span>
      </PulseOn>
    </div>
  )
}

function OptInSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as OptInProps }))
  return (
    <div className="space-y-3 p-3">
      <MechanicPicker widgetType="OPT_IN" />
      <CapabilityPanel widgetType="OPT_IN" />
      <label className="block text-xs font-medium">Pre Opt-In Label</label>
      <input value={props.preOptInLabel} onChange={(e) => setProp((p: OptInProps) => { p.preOptInLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Post Opt-In Label</label>
      <input value={props.postOptInLabel} onChange={(e) => setProp((p: OptInProps) => { p.postOptInLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Not Eligible Label</label>
      <input value={props.notEligibleLabel} onChange={(e) => setProp((p: OptInProps) => { p.notEligibleLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: OptInProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: OptInProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: OptInProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

OptInButtonWidget.craft = {
  displayName: 'Opt-In Button',
  props: {
    preOptInLabel: '',
    postOptInLabel: '',
    notEligibleLabel: '',
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: OptInSettings },
}
