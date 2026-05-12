'use client'

import { useState, useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useSpin, useMechanicFromCampaign, usePlayerState } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { TemplatePicker } from '@/components/builder/template-picker'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import { uploadAdminImage } from '@/lib/upload'
import type { TemplateStyle, WheelTemplateProps } from '@/components/templates/shared-types'
import { JackpotWheel } from '@/components/templates/wheel/jackpot-wheel'
import { StadiumWheel } from '@/components/templates/wheel/stadium-wheel'
import { CasinoVIPWheel } from '@/components/templates/wheel/casino-vip-wheel'
import { ConcentricWheel } from '@/components/templates/wheel/concentric-wheel'
import { ImageWheel } from '@/components/templates/wheel/image-wheel'
import { WidgetError, WidgetIneligible } from '@/components/shared/widget-state'
import { useSoundFx } from '@/components/runtime/sound-fx'
import { PrizeReveal, formatConditionLabel, type PrizeRevealPayload, type RevealTemplate } from '@/components/shared/prize-reveal'
import { RevealEditor } from '@/components/reveal/reveal-editor'

interface CustomSlice {
  label: string
  color: string
}

interface WheelProps {
  mechanicId: string
  wheelSize: number
  spinButtonLabel: string
  spinButtonColor: string
  /** Optional spin button overrides. Templates fall back to their built-in
   *  styling (gold pill on casino-vip, green on concentric, etc.) when
   *  these are left at 0 / empty — so the operator can either ignore the
   *  button controls (template default) or take full control. */
  spinButtonTextColor: string
  spinButtonFontSize: number
  spinButtonRadius: number
  spinButtonPaddingX: number
  spinButtonPaddingY: number
  sliceColors: string[]
  /** When non-empty, overrides reward-derived slices. Lets the builder
   *  author the wheel face (labels + colors) without binding a mechanic. */
  customSlices: CustomSlice[]
  /** Inner ring slices for `concentric` template. Authorable independently
   *  of the outer ring so the outer can be prizes and inner multipliers. */
  customInnerSlices: CustomSlice[]
  /** Image-backed wheel face (data URL or public path). Used by `image`
   *  template — the PNG is the visual, slice count still drives rotation. */
  faceImage: string
  /** Optional inner image for concentric image wheels. */
  innerFaceImage: string
  /** Degrees pre-rotation so the image's slice 0 lands under the pointer. */
  sliceOffsetDeg: number
  innerSliceOffsetDeg: number
  /** For `image` template: how many wedges the PNG actually has. Rotation
   *  math uses this as the source of truth (not `customSlices.length`). */
  imageSliceCount: number
  imageInnerSliceCount: number
  /** Pointer & hub overrides. Every field optional — empty means "use
   *  the template's built-in teardrop / circle / no hub". Sizes are
   *  percentages of the wheel width (so they scale with the container). */
  outerPointerImage: string
  outerPointerSize: number
  innerPointerImage: string
  innerPointerSize: number
  showInnerPointer: boolean
  centerHubImage: string
  centerHubSize: number
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
  /** Prize Reveal customisation. The reveal modal that fires after a spin
   *  inherits accent/text/bg from the wheel by default; any field below
   *  overrides per-reveal. Empty string / 0 means "use default". */
  revealTemplate: RevealTemplate
  revealBgImage: string
  revealAccentColor: string
  revealTextColor: string
  revealBgColor: string
  revealYouWonLabel: string
  revealToClaimLabel: string
  revealCtaLabel: string
  revealCtaColor: string
  revealCtaTextColor: string
  revealCtaRadius: number
  revealCtaPaddingX: number
  revealCtaPaddingY: number
  revealCtaFontSize: number
  revealCardRadius: number
  revealBackdropOpacity: number
  revealConfetti: boolean
  /** Per-element reveal visibility. Lets the operator strip the preset
   *  chrome when they've baked everything into `revealBgImage` themselves
   *  (see `revealTemplate: 'image_only'`). */
  revealShowYouWon: boolean
  revealShowRewardLabel: boolean
  revealShowCondition: boolean
  revealShowCta: boolean
  /** Spin animation durations (ms). 0 = template default. */
  spinDurationMs: number
  innerSpinDurationMs: number
  /** Serialized Craft.js reveal tree, authored via the RevealEditor and
   *  rendered at runtime when `revealTemplate === 'custom'`. Empty string
   *  means the operator hasn't opened the editor yet — `custom` falls
   *  back to the modal template until they do. */
  revealCanvasJson: string
}

const DEFAULT_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#0891b2', '#ea580c']

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<WheelTemplateProps>> = {
  jackpot: JackpotWheel,
  stadium: StadiumWheel,
  casino_vip: CasinoVIPWheel,
  concentric: ConcentricWheel,
  image: ImageWheel,
}

export const WheelWidget: UserComponent<WheelProps> = (props) => {
  const {
    mechanicId, wheelSize, spinButtonLabel, spinButtonColor,
    spinButtonTextColor, spinButtonFontSize, spinButtonRadius,
    spinButtonPaddingX, spinButtonPaddingY,
    sliceColors, customSlices,
    customInnerSlices, faceImage, innerFaceImage, sliceOffsetDeg, innerSliceOffsetDeg,
    imageSliceCount, imageInnerSliceCount,
    outerPointerImage, outerPointerSize,
    innerPointerImage, innerPointerSize, showInnerPointer,
    centerHubImage, centerHubSize,
    template, accentColor, textColor, bgColor,
    revealTemplate, revealBgImage, revealAccentColor, revealTextColor, revealBgColor,
    revealYouWonLabel, revealToClaimLabel, revealCtaLabel,
    revealCtaColor, revealCtaTextColor, revealCtaRadius,
    revealCtaPaddingX, revealCtaPaddingY, revealCtaFontSize,
    revealCardRadius, revealBackdropOpacity, revealConfetti,
    revealShowYouWon, revealShowRewardLabel, revealShowCondition, revealShowCta,
    spinDurationMs, innerSpinDurationMs, revealCanvasJson,
  } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, isAdminPreview, language, campaignSlug } = useCanvasStore()
  const spinMutation = useSpin(mechanicId || 'placeholder')
  const mechanicDetail = useMechanicFromCampaign(isBuilder ? null : campaignSlug, mechanicId)
  const { data: playerState } = usePlayerState(isBuilder ? null : campaignSlug)
  const sfx = useSoundFx()
  // Separate rotation state per ring so the concentric template can
  // animate outer THEN inner sequentially (user requirement: two spins
  // visually, one backend call). Non-concentric templates only use
  // `rotation` — `innerRotation` is inert for them.
  const [rotation, setRotation] = useState(0)
  const [innerRotation, setInnerRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [spinError, setSpinError] = useState<string | null>(null)
  // Compound reveal payload. Set once both rings have settled. Clearing
  // this unmounts the PrizeReveal modal (AnimatePresence handles exit).
  const [reveal, setReveal] = useState<PrizeRevealPayload | null>(null)

  const builderMechanics = useCanvasStore((s) => s.builderMechanics)

  const rewardSlices: { label: string; color: string }[] = []
  const rewardSource = isBuilder
    ? builderMechanics.find((m) => m.id === mechanicId)?.rewards
    : mechanicDetail?.rewards

  if (rewardSource && rewardSource.length > 0) {
    rewardSource.forEach((r, i) => {
      const label = (r.config?.label as string) || r.type || `Prize ${i + 1}`
      rewardSlices.push({ label, color: sliceColors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
    })
  }

  const colors = sliceColors.length > 0 ? sliceColors : DEFAULT_COLORS
  // Priority: authored customSlices > reward-derived slices > filler slices
  // based on `sliceColors`. Authoring wins so the builder can preview an
  // arbitrary wheel face before wiring a mechanic.
  let slices =
    customSlices && customSlices.length > 0
      ? customSlices.map((s, i) => ({
          label: s.label || `Slice ${i + 1}`,
          color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }))
      : rewardSlices.length > 0
        ? rewardSlices
        : colors.map((color, i) => ({ label: `Slice ${i + 1}`, color }))
  // Image template is special: the PNG is the visual but the rotation
  // math still needs to know the wedge count. `imageSliceCount` is the
  // builder-set source of truth (must match what the PNG actually shows).
  // We pad/trim `slices` to match so rotation lands correctly.
  if (template === 'image' && imageSliceCount > 0) {
    const n = imageSliceCount
    slices = Array.from({ length: n }, (_, i) => slices[i] ?? { label: `Slice ${i + 1}`, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
  }
  let innerSlicesResolved: { label: string; color: string }[] | undefined =
    customInnerSlices && customInnerSlices.length > 0
      ? customInnerSlices.map((s, i) => ({
          label: s.label || `Slice ${i + 1}`,
          color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }))
      : undefined
  // For image template, the inner count is authoritative — pad/trim so
  // rotation math works even when the builder hasn't authored labels.
  // If the operator uploaded an inner PNG but forgot to set the count,
  // mirror the outer count (the overwhelmingly common compound-wheel
  // case where each reward has a paired condition 1:1). Without this
  // fallback the inner ring silently doesn't spin — the exact "inner
  // wheel still doesn't spin" symptom.
  const effectiveInnerCount =
    template === 'image' && innerFaceImage
      ? (imageInnerSliceCount > 0 ? imageInnerSliceCount : imageSliceCount)
      : imageInnerSliceCount
  if (template === 'image' && effectiveInnerCount > 0) {
    const n = effectiveInnerCount
    const base = innerSlicesResolved ?? []
    innerSlicesResolved = Array.from({ length: n }, (_, i) => base[i] ?? { label: `Slice ${i + 1}`, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
  }
  const sliceCount = slices.length

  const mechanicState = playerState?.mechanics?.[mechanicId] as Record<string, unknown> | undefined
  const spinsRemaining = mechanicState?.spinsRemaining as { canSpin?: boolean; daily?: { used: number; max: number } | null } | undefined
  const canSpinFromState = spinsRemaining?.canSpin !== false

  // Animation timings. Outer duration matches the template motion transition
  // (4.8s on concentric, ~5.2 on casino-vip — we take the max so the settle
  // cue always fires AT rest, never mid-blur). Inner is a shorter secondary
  // flourish. Keep in sync with the `transition={{ duration: … }}` on the
  // template motion.svg elements.
  // Operator-controlled spin durations. `spinDurationMs` at 0 = "use the
  // template default", which matches the transition duration baked into
  // the image-wheel motion.div. Keep the widget-level setTimeout and the
  // template's transition in lockstep so the reveal fires AFTER the wheel
  // has visibly settled.
  const OUTER_SPIN_MS = spinDurationMs > 0 ? spinDurationMs : 4800
  const INNER_SPIN_MS = innerSpinDurationMs > 0 ? innerSpinDurationMs : 2800
  // Any template that carries a second rotating ring counts as "compound"
  // for the purpose of sequencing the spin animation. Drawn concentric
  // wheels expose the inner ring via `innerSlices`; image wheels expose it
  // via `innerFaceImage` (slice count auto-falls-back to outer count above).
  const hasInnerImageLayer = template === 'image' && !!innerFaceImage && effectiveInnerCount > 0
  const isCompoundWheel = template === 'concentric' || hasInnerImageLayer

  const innerCount = innerSlicesResolved?.length ?? 0

  const handleSpin = useCallback(async () => {
    if (isBuilder || isAdminPreview || spinning || !mechanicId) return
    setSpinning(true)
    setResult(null)
    setReveal(null)
    setSpinError(null)
    // Click feedback fires immediately — players expect instant tactile
    // confirmation even before the spin animation resolves.
    sfx.feedback('click')
    try {
      const data = await spinMutation.mutateAsync()
      const sliceIndex = data?.sliceIndex ?? Math.floor(Math.random() * sliceCount)
      const sliceAngle = 360 / sliceCount
      // 5 full spins + land on the target slice centre (top = 0°, clockwise
      // slices, so subtract the slice centre angle). Accumulate on top of
      // prev rotation so consecutive spins always rotate forward.
      const outerTarget = 360 * 5 + (360 - sliceIndex * sliceAngle - sliceAngle / 2)
      setRotation((prev) => prev + outerTarget)

      // Build the reveal payload now — we have the reward and optional
      // condition. The state update is deferred until after the spin
      // animation(s) finish so the card lands on the settle.
      //
      // Prefer the operator-authored label from the matching reward
      // definition (by id, not index — sliceIndex isn't guaranteed to line
      // up with reward list order on all mechanic types). Fall back to the
      // raw type enum, then to a localised "Prize" string. Without this
      // lookup the modal reads "CASH" instead of "$10 Cash" even when the
      // operator filled in the label field in Studio.
      const wonReward = rewardSource?.find((r) => r.id === data?.rewardDefinitionId)
      const rewardLabel =
        (wonReward?.config?.label as string | undefined) ||
        data?.rewardType ||
        t(language, 'wheel.prize')
      const conditionLabel = data?.conditionConfig
        ? formatConditionLabel(data.conditionConfig)
        : null
      const payload: PrizeRevealPayload = {
        rewardLabel,
        rewardAmount: undefined, // backend may ship `amount` later
        conditionLabel,
      }

      if (isCompoundWheel && innerCount > 0) {
        // Sequential: let the outer settle, THEN start the inner. Condition
        // is 1:1 with reward, so the inner lands on the same index (1:1
        // inner/outer count is the authoring contract for compound
        // rewards). If the operator authored a different inner count we
        // still spin but mod the index so the landing stays on-wheel.
        const innerIndex = sliceIndex % innerCount
        const innerSliceAngle = 360 / innerCount
        const innerTarget = 360 * 4 + (360 - innerIndex * innerSliceAngle - innerSliceAngle / 2)
        setTimeout(() => {
          setInnerRotation((prev) => prev + innerTarget)
        }, OUTER_SPIN_MS)
        setTimeout(() => {
          setSpinning(false)
          setResult(rewardLabel)
          setReveal(payload)
          sfx.feedback('win')
        }, OUTER_SPIN_MS + INNER_SPIN_MS)
      } else {
        // Single-ring: just wait for the outer settle.
        setTimeout(() => {
          setSpinning(false)
          setResult(rewardLabel)
          setReveal(payload)
          sfx.feedback('win')
        }, OUTER_SPIN_MS)
      }
    } catch (err) {
      setSpinning(false)
      const msg = err instanceof Error ? err.message : 'Spin failed'
      setSpinError(msg)
      sfx.feedback('error')
    }
  }, [isBuilder, isAdminPreview, spinning, mechanicId, spinMutation, sliceCount, innerCount, isCompoundWheel, rewardSource, language, sfx])

  const TemplateComponent = TEMPLATE_MAP[template] || StadiumWheel

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  // No mechanic bound in runtime — show a friendly placeholder instead of a
  // silent no-op wheel that can't spin.
  if (!isBuilder && !mechanicId) {
    return (
      <div ref={dragRef} className={ringClass}>
        <WidgetIneligible reason="Wheel is not bound to a mechanic yet." />
      </div>
    )
  }

  return (
    <div ref={dragRef} className={ringClass}>
      <TemplateComponent
        slices={slices}
        innerSlices={innerSlicesResolved}
        rotation={rotation}
        innerRotation={innerRotation}
        spinning={spinning}
        result={result}
        canSpin={!isBuilder && !isAdminPreview && !spinning && !!mechanicId && canSpinFromState}
        spinsRemaining={spinsRemaining?.daily?.max != null ? spinsRemaining.daily.max - spinsRemaining.daily.used : null}
        onSpin={handleSpin}
        wheelSize={wheelSize}
        spinButtonLabel={spinButtonLabel || t(language, 'wheel.spin')}
        spinButtonColor={spinButtonColor}
        spinButtonTextColor={spinButtonTextColor || undefined}
        spinButtonFontSize={spinButtonFontSize || undefined}
        spinButtonRadius={spinButtonRadius || undefined}
        spinButtonPaddingX={spinButtonPaddingX || undefined}
        spinButtonPaddingY={spinButtonPaddingY || undefined}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
        faceImage={faceImage}
        innerFaceImage={innerFaceImage}
        sliceOffsetDeg={sliceOffsetDeg}
        innerSliceOffsetDeg={innerSliceOffsetDeg}
        outerPointerImage={outerPointerImage || undefined}
        outerPointerSize={outerPointerSize || undefined}
        innerPointerImage={innerPointerImage || undefined}
        innerPointerSize={innerPointerSize || undefined}
        showInnerPointer={showInnerPointer}
        centerHubImage={centerHubImage || undefined}
        centerHubSize={centerHubSize || undefined}
        spinDurationMs={spinDurationMs || undefined}
        innerSpinDurationMs={innerSpinDurationMs || undefined}
      />
      {spinError && (
        <div className="mt-2">
          <WidgetError
            detail={spinError}
            onRetry={() => setSpinError(null)}
          />
        </div>
      )}
      {/* Compound reveal — rendered OUTSIDE the template so all five
          templates get the same modal for free. AnimatePresence in
          PrizeReveal handles mount/unmount. Builder/preview don't spin,
          so reveal stays null there. */}
      <PrizeReveal
        payload={reveal}
        onClose={() => setReveal(null)}
        config={{
          template: revealTemplate,
          bgImage: revealBgImage || undefined,
          // Reveal theme falls back to the wheel's theme when the operator
          // leaves the per-reveal color empty — so a wheel recolor
          // automatically propagates unless they explicitly override.
          accentColor: revealAccentColor || accentColor,
          textColor: revealTextColor || textColor,
          bgColor: revealBgColor || bgColor,
          youWonLabel: revealYouWonLabel || undefined,
          toClaimLabel: revealToClaimLabel || undefined,
          ctaLabel: revealCtaLabel || undefined,
          ctaColor: revealCtaColor || undefined,
          ctaTextColor: revealCtaTextColor || undefined,
          ctaRadius: revealCtaRadius || undefined,
          ctaPaddingX: revealCtaPaddingX || undefined,
          ctaPaddingY: revealCtaPaddingY || undefined,
          ctaFontSize: revealCtaFontSize || undefined,
          cardRadius: revealCardRadius || undefined,
          backdropOpacity: revealBackdropOpacity || undefined,
          confetti: revealConfetti,
          showYouWon: revealShowYouWon,
          showRewardLabel: revealShowRewardLabel,
          showCondition: revealShowCondition,
          showCta: revealShowCta,
          customJson: revealCanvasJson,
        }}
      />
    </div>
  )
}

function WheelSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as WheelProps }))
  const builderMechanics = useCanvasStore((s) => s.builderMechanics)
  const boundRewards = builderMechanics.find((m) => m.id === props.mechanicId)?.rewards ?? []
  // Local preview state for the reveal popup. Lives in settings (not in
  // the widget) so toggling it doesn't risk mutating player-facing state.
  // Payload is constructed from the first bound reward so the preview
  // reflects what this specific campaign would actually show.
  const [previewReveal, setPreviewReveal] = useState<PrizeRevealPayload | null>(null)
  // Reveal editor toggle. Opens a full-screen Craft.js editor over the
  // builder. Save writes serialized JSON back into this widget's props.
  const [editorOpen, setEditorOpen] = useState(false)
  const openPreview = () => {
    const sample = boundRewards[0]
    const rewardLabel =
      (sample?.config?.label as string | undefined) ||
      sample?.type ||
      'Sample Prize'
    const conditionLabel = sample?.conditionConfig
      ? (sample.conditionConfig.label ||
         (sample.conditionConfig.condition_type === 'DEPOSIT_AMOUNT' && sample.conditionConfig.target_value
           ? `Deposit $${sample.conditionConfig.target_value}${sample.conditionConfig.time_limit_hours ? ` within ${sample.conditionConfig.time_limit_hours}h` : ''}`
           : 'Sample condition'))
      : null
    setPreviewReveal({ rewardLabel, conditionLabel })
  }

  const customSlices = props.customSlices ?? []
  const updateSlice = (idx: number, patch: Partial<CustomSlice>) => {
    setProp((p: WheelProps) => {
      const next = [...(p.customSlices ?? [])]
      next[idx] = { ...next[idx], ...patch }
      p.customSlices = next
    })
  }
  const addSlice = () => {
    setProp((p: WheelProps) => {
      const next = [...(p.customSlices ?? [])]
      const i = next.length
      next.push({ label: `Slice ${i + 1}`, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
      p.customSlices = next
    })
  }
  const removeSlice = (idx: number) => {
    setProp((p: WheelProps) => {
      const next = [...(p.customSlices ?? [])]
      next.splice(idx, 1)
      p.customSlices = next
    })
  }
  const clearSlices = () => {
    setProp((p: WheelProps) => { p.customSlices = [] })
  }

  // Inner-ring authoring (concentric template).
  const customInnerSlices = props.customInnerSlices ?? []
  const updateInnerSlice = (idx: number, patch: Partial<CustomSlice>) => {
    setProp((p: WheelProps) => {
      const next = [...(p.customInnerSlices ?? [])]
      next[idx] = { ...next[idx], ...patch }
      p.customInnerSlices = next
    })
  }
  const addInnerSlice = () => {
    setProp((p: WheelProps) => {
      const next = [...(p.customInnerSlices ?? [])]
      const i = next.length
      next.push({ label: `${(i + 1)}X`, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
      p.customInnerSlices = next
    })
  }
  const removeInnerSlice = (idx: number) => {
    setProp((p: WheelProps) => {
      const next = [...(p.customInnerSlices ?? [])]
      next.splice(idx, 1)
      p.customInnerSlices = next
    })
  }

  // Image upload → engine storage → URL. Canvas JSON stores the URL only,
  // so canvas-config PUTs stay well under the 1 MB body limit regardless
  // of how many images the operator attaches.
  const uploadTo = (key: 'faceImage' | 'innerFaceImage' | 'revealBgImage' | 'outerPointerImage' | 'innerPointerImage' | 'centerHubImage') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const url = await uploadAdminImage(f, 'wheel')
      setProp((p: WheelProps) => { p[key] = url })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const isConcentric = props.template === 'concentric'
  const isImage = props.template === 'image'

  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="WHEEL" />
      <div className="space-y-3 p-3">
        <MechanicPicker widgetType="WHEEL" />
        <CapabilityPanel widgetType="WHEEL" />
        <label className="block text-xs font-medium">Wheel Size (px)</label>
        <input type="number" value={props.wheelSize} onChange={(e) => setProp((p: WheelProps) => { p.wheelSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        {/* Spin speed. Higher = slower. 0 falls back to the template default
            (4.8s outer, 2.8s inner). Operators tune when the default feels
            too fast/slow for their brand. */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium">Outer spin (ms)</label>
            <input
              type="number"
              min={0}
              max={20000}
              step={100}
              value={props.spinDurationMs || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.spinDurationMs = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              title="0 = template default (~4800ms). Higher = slower."
              placeholder="4800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Inner spin (ms)</label>
            <input
              type="number"
              min={0}
              max={20000}
              step={100}
              value={props.innerSpinDurationMs || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.innerSpinDurationMs = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              title="0 = template default (~2800ms). Only used when there's an inner ring."
              placeholder="2800"
            />
          </div>
        </div>
        <p className="text-[10px] leading-tight text-gray-500">
          Leave at 0 to use each template's built-in timing. Try 6000–8000 for a more dramatic outer spin.
        </p>
        <hr className="border-gray-700" />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Spin Button</div>
        <label className="block text-xs font-medium">Label</label>
        <input value={props.spinButtonLabel} onChange={(e) => setProp((p: WheelProps) => { p.spinButtonLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Spin" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium">Background</label>
            <input type="color" value={props.spinButtonColor || '#7c3aed'} onChange={(e) => setProp((p: WheelProps) => { p.spinButtonColor = e.target.value })} className="h-8 w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium">Text color</label>
            <input type="color" value={props.spinButtonTextColor || '#ffffff'} onChange={(e) => setProp((p: WheelProps) => { p.spinButtonTextColor = e.target.value })} className="h-8 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-medium">Font size</label>
            <input
              type="number"
              min={0}
              max={48}
              value={props.spinButtonFontSize || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.spinButtonFontSize = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
              title="0 = template default"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium">Radius</label>
            <input
              type="number"
              min={0}
              max={999}
              value={props.spinButtonRadius || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.spinButtonRadius = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
              title="999 = pill, 0 = template default"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium">Pad X/Y</label>
            <div className="flex gap-1">
              <input
                type="number"
                min={0}
                max={80}
                value={props.spinButtonPaddingX || 0}
                onChange={(e) => setProp((p: WheelProps) => { p.spinButtonPaddingX = Math.max(0, Number(e.target.value) || 0) })}
                className="w-1/2 rounded border border-gray-300 px-1 py-1 text-xs"
                title="Horizontal padding"
              />
              <input
                type="number"
                min={0}
                max={40}
                value={props.spinButtonPaddingY || 0}
                onChange={(e) => setProp((p: WheelProps) => { p.spinButtonPaddingY = Math.max(0, Number(e.target.value) || 0) })}
                className="w-1/2 rounded border border-gray-300 px-1 py-1 text-xs"
                title="Vertical padding"
              />
            </div>
          </div>
        </div>
        <p className="text-[10px] leading-tight text-gray-500">
          Numeric fields at 0 fall back to each template's built-in styling. Set any value to override.
        </p>
        <hr className="border-gray-700" />
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium">Slices {customSlices.length > 0 ? `(custom · ${customSlices.length})` : '(from mechanic)'}</label>
          {customSlices.length > 0 && (
            <button type="button" onClick={clearSlices} className="text-[10px] text-gray-500 underline">Reset to mechanic</button>
          )}
        </div>
        <p className="text-[10px] leading-tight text-gray-500">
          When set, these override whatever the bound mechanic provides. Useful for preview & layout.
        </p>
        <div className="space-y-1.5">
          {customSlices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="color"
                value={s.color || '#7c3aed'}
                onChange={(e) => updateSlice(i, { color: e.target.value })}
                className="h-7 w-8 shrink-0 cursor-pointer"
                title="Slice color"
              />
              <input
                type="text"
                value={s.label}
                onChange={(e) => updateSlice(i, { label: e.target.value })}
                placeholder={`Slice ${i + 1}`}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeSlice(i)}
                className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50"
                title="Remove slice"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSlice}
          className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          + Add slice
        </button>

        {isConcentric && (
          <>
            <hr className="border-gray-700" />
            <label className="block text-xs font-medium">
              Inner ring · {customInnerSlices.length || 'defaults'}
            </label>
            <p className="text-[10px] leading-tight text-gray-500">
              <strong>Decorative — does not bind a second mechanic.</strong> The inner ring shares the outer ring's rotation, so one spin picks an outer + inner pair at the same angle. Whatever reward the bound mechanic returns (above) is what the player wins — the inner label is just visual.
            </p>
            <div className="space-y-1.5">
              {customInnerSlices.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={s.color || '#7c3aed'}
                    onChange={(e) => updateInnerSlice(i, { color: e.target.value })}
                    className="h-7 w-8 shrink-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={s.label}
                    onChange={(e) => updateInnerSlice(i, { label: e.target.value })}
                    placeholder={`${i + 1}X`}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeInnerSlice(i)}
                    className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addInnerSlice}
              className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              + Add inner slice
            </button>
          </>
        )}

        {isImage && (
          <>
            <hr className="border-gray-700" />
            <div className="rounded bg-amber-50 p-2 text-[10px] leading-tight text-amber-900">
              <strong>One mechanic drives everything.</strong> The PNGs (outer and inner) are decoration only — rewards come from the single mechanic bound above. Slice count must match the image. Slice 0 = topmost wedge, clockwise. Offset nudges alignment under the pointer.
            </div>

            <label className="block text-xs font-medium">Wheel image</label>
            <div className="flex items-center gap-1.5">
              <label className="flex-1 cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                {props.faceImage ? 'Replace image…' : 'Upload wheel_1.png…'}
                <input type="file" accept="image/*" onChange={uploadTo('faceImage')} className="hidden" />
              </label>
              {props.faceImage && (
                <button
                  type="button"
                  onClick={() => setProp((p: WheelProps) => { p.faceImage = '' })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
                  title="Remove image"
                >
                  ×
                </button>
              )}
            </div>
            {props.faceImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={props.faceImage} alt="wheel preview" className="mt-1 w-full rounded border border-gray-200" style={{ maxHeight: 120, objectFit: 'contain' }} />
            )}

            <label className="block text-xs font-medium">Outer slice count</label>
            <input
              type="number"
              min={2}
              max={36}
              value={props.imageSliceCount}
              onChange={(e) => setProp((p: WheelProps) => { p.imageSliceCount = Math.max(2, Number(e.target.value) || 2) })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />

            {/* Slice → reward preview. The PNG is decoration; the server
                picks the winning index, and that index is what the player
                lands on visually. This preview makes the mapping explicit so
                the operator can draw their PNG to match the mechanic's
                reward order (index 0 = topmost, clockwise). */}
            {props.imageSliceCount > 0 && (
              <div className="rounded border border-gray-200 bg-white/40 p-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Wedge → Reward mapping
                </div>
                <p className="mb-1.5 text-[10px] leading-tight text-gray-500">
                  Draw wedge <strong>0</strong> at the top of your PNG, then clockwise. Use the offset slider below if the first boundary doesn't land exactly under the pointer.
                </p>
                <ol className="space-y-0.5 text-[11px]">
                  {Array.from({ length: props.imageSliceCount }).map((_, i) => {
                    const reward = boundRewards[i]
                    const label =
                      (reward?.config?.label as string | undefined) ||
                      reward?.type ||
                      <span className="italic text-gray-400">— unbound —</span>
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-700">
                          {i}
                        </span>
                        <span className="truncate text-gray-700">{label}</span>
                      </li>
                    )
                  })}
                </ol>
                {boundRewards.length > 0 && boundRewards.length !== props.imageSliceCount && (
                  <div className="mt-1.5 rounded bg-red-50 px-1.5 py-1 text-[10px] text-red-700">
                    Mechanic has {boundRewards.length} reward{boundRewards.length === 1 ? '' : 's'} but wedge count is {props.imageSliceCount}. These must match.
                  </div>
                )}
              </div>
            )}

            <label className="block text-xs font-medium">Outer slice offset · {props.sliceOffsetDeg ?? 0}°</label>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={props.sliceOffsetDeg ?? 0}
              onChange={(e) => setProp((p: WheelProps) => { p.sliceOffsetDeg = Number(e.target.value) })}
              className="w-full"
            />

            <label className="block text-xs font-medium">Inner image (optional)</label>
            <div className="flex items-center gap-1.5">
              <label className="flex-1 cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                {props.innerFaceImage ? 'Replace inner…' : 'Upload wheel_2.png…'}
                <input type="file" accept="image/*" onChange={uploadTo('innerFaceImage')} className="hidden" />
              </label>
              {props.innerFaceImage && (
                <button
                  type="button"
                  onClick={() => setProp((p: WheelProps) => { p.innerFaceImage = '' })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
                >
                  ×
                </button>
              )}
            </div>
            {props.innerFaceImage && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={props.innerFaceImage} alt="inner preview" className="mt-1 w-full rounded border border-gray-200" style={{ maxHeight: 100, objectFit: 'contain' }} />

                <label className="block text-xs font-medium">Inner slice count</label>
                <input
                  type="number"
                  min={2}
                  max={36}
                  value={props.imageInnerSliceCount || 0}
                  onChange={(e) => setProp((p: WheelProps) => { p.imageInnerSliceCount = Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="e.g. 10"
                />
                <p className="text-[10px] leading-tight text-gray-500">
                  How many wedges the inner PNG has. For compound reward+condition promos, use the <strong>same count as outer</strong> so each outer slice lines up 1:1 with its condition on the inner ring.
                </p>

                {(props.imageInnerSliceCount || 0) > 0 && (
                  <div className="rounded border border-gray-200 bg-white/40 p-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Inner wedge → Condition
                    </div>
                    <p className="mb-1.5 text-[10px] leading-tight text-gray-500">
                      Each inner wedge is the condition paired with the outer reward at the same index. Draw them in matching order.
                    </p>
                    <ol className="space-y-0.5 text-[11px]">
                      {Array.from({ length: props.imageInnerSliceCount || 0 }).map((_, i) => {
                        const reward = boundRewards[i]
                        const cond = reward?.conditionConfig
                        const label =
                          cond?.label ||
                          cond?.condition_type ||
                          <span className="italic text-gray-400">— no condition —</span>
                        return (
                          <li key={i} className="flex items-center gap-2">
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-700">
                              {i}
                            </span>
                            <span className="truncate text-gray-700">{label}</span>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )}

                <label className="block text-xs font-medium">Inner slice offset · {props.innerSliceOffsetDeg ?? 0}°</label>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={props.innerSliceOffsetDeg ?? 0}
                  onChange={(e) => setProp((p: WheelProps) => { p.innerSliceOffsetDeg = Number(e.target.value) })}
                  className="w-full"
                />
              </>
            )}

            {/* ──────────────────────────────────────────────────────────
                Pointers & Hub. All optional — empty = built-in teardrop /
                circle, leaving existing campaigns unchanged. Sizes are %
                of the wheel container width (because the wheel itself is
                fluid via container queries).
                ────────────────────────────────────────────────────────── */}
            <hr className="border-gray-700" />
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pointers & Center hub</div>
            <p className="text-[10px] leading-tight text-gray-500">
              The decorative arrows and center logo. Upload a transparent PNG to replace the built-ins. Sizes are % of the wheel.
            </p>

            {/* Outer pointer */}
            <label className="block text-xs font-medium">Outer pointer image</label>
            <div className="flex items-center gap-1.5">
              <label className="flex-1 cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                {props.outerPointerImage ? 'Replace outer pointer…' : 'Upload outer pointer PNG…'}
                <input type="file" accept="image/*" onChange={uploadTo('outerPointerImage')} className="hidden" />
              </label>
              {props.outerPointerImage && (
                <button
                  type="button"
                  onClick={() => setProp((p: WheelProps) => { p.outerPointerImage = '' })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
                  title="Remove (revert to default teardrop)"
                >
                  ×
                </button>
              )}
            </div>
            {props.outerPointerImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={props.outerPointerImage} alt="outer pointer preview" className="mt-1 w-full rounded border border-gray-200 bg-gray-900" style={{ maxHeight: 60, objectFit: 'contain' }} />
            )}
            <label className="block text-[10px] text-gray-500">Outer pointer size · {props.outerPointerSize || 10}%</label>
            <input
              type="range"
              min={4}
              max={20}
              step={0.5}
              value={props.outerPointerSize || 10}
              onChange={(e) => setProp((p: WheelProps) => { p.outerPointerSize = Number(e.target.value) })}
              className="w-full"
            />

            {/* Inner pointer (only useful when there's an inner image) */}
            {props.innerFaceImage && (
              <>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!props.showInnerPointer}
                    onChange={(e) => setProp((p: WheelProps) => { p.showInnerPointer = e.target.checked })}
                  />
                  <span>Show inner pointer</span>
                </label>

                {props.showInnerPointer && (
                  <>
                    <label className="block text-xs font-medium">Inner pointer image</label>
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                        {props.innerPointerImage ? 'Replace inner pointer…' : 'Upload inner pointer PNG…'}
                        <input type="file" accept="image/*" onChange={uploadTo('innerPointerImage')} className="hidden" />
                      </label>
                      {props.innerPointerImage && (
                        <button
                          type="button"
                          onClick={() => setProp((p: WheelProps) => { p.innerPointerImage = '' })}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {props.innerPointerImage && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={props.innerPointerImage} alt="inner pointer preview" className="mt-1 w-full rounded border border-gray-200 bg-gray-900" style={{ maxHeight: 50, objectFit: 'contain' }} />
                    )}
                    <label className="block text-[10px] text-gray-500">Inner pointer size · {props.innerPointerSize || 7}%</label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      step={0.5}
                      value={props.innerPointerSize || 7}
                      onChange={(e) => setProp((p: WheelProps) => { p.innerPointerSize = Number(e.target.value) })}
                      className="w-full"
                    />
                  </>
                )}
              </>
            )}

            {/* Center hub */}
            <label className="block text-xs font-medium">Center hub / logo</label>
            <div className="flex items-center gap-1.5">
              <label className="flex-1 cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                {props.centerHubImage ? 'Replace hub…' : 'Upload hub / logo PNG…'}
                <input type="file" accept="image/*" onChange={uploadTo('centerHubImage')} className="hidden" />
              </label>
              {props.centerHubImage && (
                <button
                  type="button"
                  onClick={() => setProp((p: WheelProps) => { p.centerHubImage = '' })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
                >
                  ×
                </button>
              )}
            </div>
            {props.centerHubImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={props.centerHubImage} alt="hub preview" className="mt-1 w-full rounded border border-gray-200 bg-gray-900" style={{ maxHeight: 80, objectFit: 'contain' }} />
            )}
            <label className="block text-[10px] text-gray-500">Hub size · {props.centerHubSize || 18}%</label>
            <input
              type="range"
              min={8}
              max={40}
              step={0.5}
              value={props.centerHubSize || 18}
              onChange={(e) => setProp((p: WheelProps) => { p.centerHubSize = Number(e.target.value) })}
              className="w-full"
            />
          </>
        )}

        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: WheelProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: WheelProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: WheelProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />

        {/* ────────────────────────────────────────────────────────────
            Prize Reveal — fires after a spin lands. Every visual mirrors
            the spin-button contract: empty / 0 = "inherit", any value =
            explicit override.
            ──────────────────────────────────────────────────────────── */}
        <hr className="border-gray-700" />
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Prize Reveal Popup</div>
          <button
            type="button"
            onClick={openPreview}
            className="rounded border border-blue-400 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
            title="Show the reveal modal with sample data"
          >
            Preview
          </button>
        </div>
        <p className="text-[10px] leading-tight text-gray-500">
          Fires after a spin. Leave fields empty to inherit the wheel's colors / template defaults. <strong>Preview</strong> uses your first bound reward as sample data.
        </p>

        <label className="block text-xs font-medium">Layout</label>
        <select
          value={props.revealTemplate || 'modal'}
          onChange={(e) => setProp((p: WheelProps) => { p.revealTemplate = e.target.value as RevealTemplate })}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="modal">Modal (centered card)</option>
          <option value="sheet">Sheet (bottom slide-up)</option>
          <option value="hero">Hero (full-bleed image)</option>
          <option value="image_only">Image only (no preset chrome)</option>
          <option value="custom">Custom (drag &amp; drop canvas)</option>
        </select>
        <p className="text-[10px] leading-tight text-gray-500">
          <strong>Image only</strong> shows just your background image + a close button. <strong>Custom</strong> opens a mini canvas where you drag text, progress bars, and buttons anywhere on your image. Pair with the per-element toggles below for Modal/Sheet/Hero/Image-only.
        </p>

        {/* Edit-reveal launcher. Only meaningful on `custom`, but we render
            it unconditionally so the operator can open the editor and pick
            the layout inside it. The JSON is kept between template switches
            so toggling back to `custom` doesn't lose their work. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="flex-1 rounded border border-purple-400 bg-purple-50 px-2 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
            title="Open the drag-and-drop reveal editor"
          >
            {props.revealCanvasJson ? 'Edit custom reveal' : 'Open reveal editor…'}
          </button>
          {props.revealCanvasJson && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset the custom reveal to empty?')) {
                  setProp((p: WheelProps) => { p.revealCanvasJson = '' })
                }
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
              title="Clear the saved reveal canvas"
            >
              Reset
            </button>
          )}
        </div>
        {props.revealTemplate === 'custom' && !props.revealCanvasJson && (
          <div className="rounded bg-amber-50 p-2 text-[10px] text-amber-900">
            <strong>Custom</strong> is selected but nothing is authored yet. Click &ldquo;Open reveal editor&rdquo; above — until you save, the reveal falls back to the modal layout.
          </div>
        )}

        {/* Per-element visibility. Lets the operator keep the image-only
            layout "clean" except for exactly the pieces they want. */}
        <div className="grid grid-cols-2 gap-1.5 rounded border border-gray-200 p-2">
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={props.revealShowYouWon !== false}
              onChange={(e) => setProp((p: WheelProps) => { p.revealShowYouWon = e.target.checked })}
            />
            <span>Show &ldquo;You won&rdquo;</span>
          </label>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={props.revealShowRewardLabel !== false}
              onChange={(e) => setProp((p: WheelProps) => { p.revealShowRewardLabel = e.target.checked })}
            />
            <span>Show reward label</span>
          </label>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={props.revealShowCondition !== false}
              onChange={(e) => setProp((p: WheelProps) => { p.revealShowCondition = e.target.checked })}
            />
            <span>Show condition</span>
          </label>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={props.revealShowCta !== false}
              onChange={(e) => setProp((p: WheelProps) => { p.revealShowCta = e.target.checked })}
            />
            <span>Show CTA button</span>
          </label>
        </div>

        <label className="block text-xs font-medium">Background image (optional)</label>
        <div className="flex items-center gap-1.5">
          <label className="flex-1 cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
            {props.revealBgImage ? 'Replace reveal bg…' : 'Upload reveal background…'}
            <input type="file" accept="image/*" onChange={uploadTo('revealBgImage')} className="hidden" />
          </label>
          {props.revealBgImage && (
            <button
              type="button"
              onClick={() => setProp((p: WheelProps) => { p.revealBgImage = '' })}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
              title="Remove image"
            >
              ×
            </button>
          )}
        </div>
        {props.revealBgImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={props.revealBgImage} alt="reveal bg preview" className="mt-1 w-full rounded border border-gray-200" style={{ maxHeight: 120, objectFit: 'contain' }} />
        )}
        <p className="text-[10px] leading-tight text-gray-500">
          Best on the <strong>Hero</strong> layout — fills the whole card. On Modal / Sheet it appears as a soft header.
        </p>

        <label className="block text-xs font-medium">Labels</label>
        <div className="grid grid-cols-1 gap-1.5">
          <input
            value={props.revealYouWonLabel}
            onChange={(e) => setProp((p: WheelProps) => { p.revealYouWonLabel = e.target.value })}
            placeholder={`Top label — default "You won"`}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <input
            value={props.revealToClaimLabel}
            onChange={(e) => setProp((p: WheelProps) => { p.revealToClaimLabel = e.target.value })}
            placeholder={`Condition label — default "To claim"`}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <input
            value={props.revealCtaLabel}
            onChange={(e) => setProp((p: WheelProps) => { p.revealCtaLabel = e.target.value })}
            placeholder={`CTA button — default "Continue"`}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </div>

        <label className="block text-xs font-medium">Colors (optional overrides)</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-gray-500">Accent</label>
            <input
              type="color"
              value={props.revealAccentColor || props.accentColor || '#7c3aed'}
              onChange={(e) => setProp((p: WheelProps) => { p.revealAccentColor = e.target.value })}
              className="h-8 w-full"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Text</label>
            <input
              type="color"
              value={props.revealTextColor || props.textColor || '#ffffff'}
              onChange={(e) => setProp((p: WheelProps) => { p.revealTextColor = e.target.value })}
              className="h-8 w-full"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Card bg</label>
            <input
              type="color"
              value={props.revealBgColor || props.bgColor || '#1a1a2e'}
              onChange={(e) => setProp((p: WheelProps) => { p.revealBgColor = e.target.value })}
              className="h-8 w-full"
            />
          </div>
        </div>

        <label className="block text-xs font-medium">CTA button</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-500">Button bg</label>
            <input
              type="color"
              value={props.revealCtaColor || props.revealAccentColor || props.accentColor || '#7c3aed'}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCtaColor = e.target.value })}
              className="h-8 w-full"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Button text</label>
            <input
              type="color"
              value={props.revealCtaTextColor || props.revealTextColor || props.textColor || '#ffffff'}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCtaTextColor = e.target.value })}
              className="h-8 w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div>
            <label className="block text-[10px] text-gray-500">Radius</label>
            <input
              type="number"
              min={0}
              max={999}
              value={props.revealCtaRadius || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCtaRadius = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
              title="999 = pill"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Font</label>
            <input
              type="number"
              min={0}
              max={32}
              value={props.revealCtaFontSize || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCtaFontSize = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Pad X</label>
            <input
              type="number"
              min={0}
              max={80}
              value={props.revealCtaPaddingX || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCtaPaddingX = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Pad Y</label>
            <input
              type="number"
              min={0}
              max={40}
              value={props.revealCtaPaddingY || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCtaPaddingY = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-500">Card radius</label>
            <input
              type="number"
              min={0}
              max={48}
              value={props.revealCardRadius || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.revealCardRadius = Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
              title="0 = template default"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Backdrop % (0=default)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={props.revealBackdropOpacity || 0}
              onChange={(e) => setProp((p: WheelProps) => { p.revealBackdropOpacity = Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!props.revealConfetti}
            onChange={(e) => setProp((p: WheelProps) => { p.revealConfetti = e.target.checked })}
          />
          <span>Confetti burst on reveal</span>
        </label>
      </div>

      {/* Preview overlay — rendered from the settings panel so it shows on
          top of the whole builder, not inside the widget's (potentially
          tiny / scrolled) Craft frame. Same config as the live reveal so
          what you see here is what players see. */}
      <PrizeReveal
        payload={previewReveal}
        onClose={() => setPreviewReveal(null)}
        config={{
          template: props.revealTemplate,
          bgImage: props.revealBgImage || undefined,
          accentColor: props.revealAccentColor || props.accentColor,
          textColor: props.revealTextColor || props.textColor,
          bgColor: props.revealBgColor || props.bgColor,
          youWonLabel: props.revealYouWonLabel || undefined,
          toClaimLabel: props.revealToClaimLabel || undefined,
          ctaLabel: props.revealCtaLabel || undefined,
          ctaColor: props.revealCtaColor || undefined,
          ctaTextColor: props.revealCtaTextColor || undefined,
          ctaRadius: props.revealCtaRadius || undefined,
          ctaPaddingX: props.revealCtaPaddingX || undefined,
          ctaPaddingY: props.revealCtaPaddingY || undefined,
          ctaFontSize: props.revealCtaFontSize || undefined,
          cardRadius: props.revealCardRadius || undefined,
          backdropOpacity: props.revealBackdropOpacity || undefined,
          confetti: props.revealConfetti,
          showYouWon: props.revealShowYouWon,
          showRewardLabel: props.revealShowRewardLabel,
          showCondition: props.revealShowCondition,
          showCta: props.revealShowCta,
          customJson: props.revealCanvasJson,
        }}
      />

      {/* Full-screen reveal editor. Opens over the builder; saving writes
          serialized Craft.js JSON back into this widget's props. The
          sample payload mirrors openPreview() so the editor shows
          realistic content. */}
      <RevealEditor
        open={editorOpen}
        initialJson={props.revealCanvasJson}
        onSave={(json) => setProp((p: WheelProps) => { p.revealCanvasJson = json })}
        onClose={() => setEditorOpen(false)}
        samplePayload={(() => {
          const sample = boundRewards[0]
          const rewardLabel =
            (sample?.config?.label as string | undefined) || sample?.type || 'Sample Prize'
          const conditionLabel = sample?.conditionConfig
            ? (sample.conditionConfig.label ||
              (sample.conditionConfig.condition_type === 'DEPOSIT_AMOUNT' && sample.conditionConfig.target_value
                ? `Deposit $${sample.conditionConfig.target_value}`
                : 'Sample condition'))
            : null
          return { rewardLabel, conditionLabel }
        })()}
        defaults={{
          youWon: props.revealYouWonLabel || 'You won',
          toClaim: props.revealToClaimLabel || 'To claim',
          ctaLabel: props.revealCtaLabel || 'Continue',
        }}
      />
    </div>
  )
}

WheelWidget.craft = {
  displayName: 'Wheel',
  props: {
    mechanicId: '',
    wheelSize: 360,
    spinButtonLabel: '',
    spinButtonColor: '#7c3aed',
    // Zero / empty signals "use template default". Operator only fills
    // these when they want to override the template's built-in styling.
    spinButtonTextColor: '',
    spinButtonFontSize: 0,
    spinButtonRadius: 0,
    spinButtonPaddingX: 0,
    spinButtonPaddingY: 0,
    sliceColors: [],
    customSlices: [],
    customInnerSlices: [],
    faceImage: '',
    innerFaceImage: '',
    sliceOffsetDeg: 0,
    innerSliceOffsetDeg: 0,
    imageSliceCount: 8,
    imageInnerSliceCount: 0,
    // Pointers & hub — empty strings and 0 preserve the current look for
    // every existing campaign (built-in teardrop / no hub). Operators opt
    // in by uploading a PNG.
    outerPointerImage: '',
    outerPointerSize: 10,
    innerPointerImage: '',
    innerPointerSize: 7,
    showInnerPointer: false,
    centerHubImage: '',
    centerHubSize: 18,
    template: 'stadium' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
    // Prize Reveal — empty strings & zeros mean "inherit from wheel /
    // template default" so existing campaigns keep their current look.
    revealTemplate: 'modal' as RevealTemplate,
    revealBgImage: '',
    revealAccentColor: '',
    revealTextColor: '',
    revealBgColor: '',
    revealYouWonLabel: '',
    revealToClaimLabel: '',
    revealCtaLabel: '',
    revealCtaColor: '',
    revealCtaTextColor: '',
    revealCtaRadius: 0,
    revealCtaPaddingX: 0,
    revealCtaPaddingY: 0,
    revealCtaFontSize: 0,
    revealCardRadius: 0,
    revealBackdropOpacity: 0,
    revealConfetti: false,
    // Per-element visibility defaults: show everything, so existing
    // campaigns and fresh widgets look identical to before this change.
    // The operator opts into minimalism by toggling these off (useful for
    // the `image_only` template where the bg PNG already spells it out).
    revealShowYouWon: true,
    revealShowRewardLabel: true,
    revealShowCondition: true,
    revealShowCta: true,
    // 0 = template default (4.8s outer, 2.8s inner). Operators increase
    // for slower-feeling spins, decrease for snappier mobile feel.
    spinDurationMs: 0,
    innerSpinDurationMs: 0,
    revealCanvasJson: '',
  },
  related: { settings: WheelSettings },
}
