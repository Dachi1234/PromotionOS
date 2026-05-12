'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { RevealRenderer } from '@/components/reveal/reveal-renderer'

/**
 * Compound prize reveal card.
 *
 * Three template variants — all share the same payload contract so the
 * wheel widget can swap them without re-authoring content:
 *
 *   - **modal**  (default) centered card, matches older runtime releases.
 *   - **sheet**  bottom slide-up sheet, mobile-first feel.
 *   - **hero**   full-bleed background image + oversized prize type,
 *                confetti burst, CTA pinned to the bottom. Use when the
 *                operator has a celebratory PNG to show behind the text.
 *
 * Every visual is configurable via `RevealConfig`. Empty / zero values
 * mean "use template default" so operators can override just what they
 * care about (same convention the spin button uses on wheel templates).
 *
 * Respects `prefers-reduced-motion`: skips the entrance spring and the
 * confetti burst.
 */

export interface PrizeRevealPayload {
  rewardLabel: string
  rewardAmount?: string | number
  /** Human-readable condition description. Built upstream from the
   *  backend's `conditionConfig` (e.g. "Wager $30 within 24h"). */
  conditionLabel?: string | null
}

export type RevealTemplate = 'modal' | 'sheet' | 'hero' | 'image_only' | 'custom'

export interface RevealConfig {
  /** Layout variant. */
  template?: RevealTemplate
  /** Decorative background image URL (hero template uses this for the
   *  full-bleed hero; modal/sheet use it as a soft header strip). */
  bgImage?: string
  /** Theme overrides. Each one falls back to the wheel's accent/text/bg
   *  when empty so the reveal matches the wheel without re-authoring. */
  accentColor?: string
  textColor?: string
  bgColor?: string
  /** String overrides. Empty = use the default i18n string. */
  youWonLabel?: string
  toClaimLabel?: string
  ctaLabel?: string
  /** CTA button styling. 0 / empty = template default. */
  ctaColor?: string
  ctaTextColor?: string
  ctaRadius?: number
  ctaPaddingX?: number
  ctaPaddingY?: number
  ctaFontSize?: number
  /** Card corner radius. 0 = template default. */
  cardRadius?: number
  /** Backdrop opacity, 0-100. 0 = template default (~70%). */
  backdropOpacity?: number
  /** Fire a lightweight confetti burst when the reveal opens. */
  confetti?: boolean
  /** Per-element visibility. Default (undefined) renders everything — the
   *  backcompat path for existing campaigns. Set to `false` to drop that
   *  piece of preset chrome entirely (used with `template: 'image_only'`
   *  to show just a branded background image and nothing else). */
  showYouWon?: boolean
  showRewardLabel?: boolean
  showCondition?: boolean
  showCta?: boolean
  /** Serialized Craft.js reveal tree (when `template === 'custom'`). The
   *  RevealRenderer component deserializes this and renders the
   *  drag-and-drop authored layout with live data injected via context. */
  customJson?: string
}

interface PrizeRevealProps {
  payload: PrizeRevealPayload | null
  onClose: () => void
  config?: RevealConfig
}

// ────────────────────────────────────────────────────────────────────────
// Confetti — canvas-free, pure DOM. 24 spans with randomised angles
// drifting down. Cheap, GPU-accelerated, respects reduced motion.
// ────────────────────────────────────────────────────────────────────────
function Confetti({ accent }: { accent: string }) {
  const reduced = useReducedMotion()
  if (reduced) return null
  const colors = [accent, '#f5e19a', '#2FDF6E', '#ff6b6b', '#4dabf7', '#ffd43b']
  const pieces = Array.from({ length: 28 })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.4
        const duration = 1.4 + Math.random() * 1.6
        const rotateEnd = Math.random() * 720 - 360
        const color = colors[i % colors.length]
        const size = 6 + Math.random() * 8
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: `${left}%`, opacity: 1, rotate: 0 }}
            animate={{ y: '110%', opacity: [1, 1, 0], rotate: rotateEnd }}
            transition={{ duration, delay, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              top: 0,
              width: size,
              height: size * 0.4,
              background: color,
              borderRadius: 2,
              boxShadow: `0 0 4px ${color}aa`,
            }}
          />
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Shared close button.
// ────────────────────────────────────────────────────────────────────────
function CloseButton({ onClose, color }: { onClose: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-3 top-3 z-10 rounded-full p-1.5 opacity-60 transition hover:opacity-100"
      style={{ color }}
    >
      <X size={18} />
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Shared CTA button — respects all operator overrides.
// ────────────────────────────────────────────────────────────────────────
function CtaButton({
  label, onClick, bg, fg, radius, padX, padY, fontSize, accent,
}: {
  label: string; onClick: () => void; bg: string; fg: string
  radius?: number; padX?: number; padY?: number; fontSize?: number; accent: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 24,
        padding: `${padY ?? 14}px ${padX ?? 28}px`,
        background: bg,
        color: fg,
        border: 'none',
        borderRadius: radius ?? 999,
        fontSize: fontSize ?? 14,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: `0 8px 20px -4px ${accent}88`,
        width: '100%',
      }}
      className="transition hover:brightness-110 active:brightness-95"
    >
      {label}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────
// MODAL template — centered card. Legacy default.
// ────────────────────────────────────────────────────────────────────────
function ModalReveal({
  payload, onClose, cfg, accent, text, bg, youWon, toClaim, ctaLabel,
  showYouWon, showRewardLabel, showCondition, showCta,
}: RevealChildProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-md overflow-hidden p-6 shadow-2xl"
      style={{
        background: cfg.bgImage
          ? `linear-gradient(165deg, ${bg}cc 0%, ${bg} 100%), url("${cfg.bgImage}") center/cover`
          : `linear-gradient(165deg, ${bg} 0%, color-mix(in srgb, ${bg} 60%, #000) 100%)`,
        color: text,
        border: `1px solid ${accent}`,
        borderRadius: cfg.cardRadius ?? 16,
        boxShadow: `0 20px 60px -10px ${accent}40, 0 0 0 1px ${accent}33 inset`,
      }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', damping: 18, stiffness: 280 }}
    >
      {cfg.confetti && <Confetti accent={accent} />}
      <CloseButton onClose={onClose} color={text} />
      <div className="relative text-center">
        {showYouWon && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-70" style={{ color: accent }}>
            {youWon}
          </div>
        )}
        {showRewardLabel && (
          <div id="prize-reveal-title" className="mb-1 text-3xl font-black leading-tight">
            {payload.rewardAmount != null && payload.rewardAmount !== '' ? `${payload.rewardAmount}` : payload.rewardLabel}
          </div>
        )}
        {showRewardLabel && payload.rewardAmount != null && payload.rewardAmount !== '' && payload.rewardLabel && (
          <div className="text-sm opacity-80">{payload.rewardLabel}</div>
        )}
        {showCondition && payload.conditionLabel && (
          <div
            className="mt-5 rounded-lg px-4 py-3 text-left"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px dashed ${accent}66` }}
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent, opacity: 0.9 }}>
              {toClaim}
            </div>
            <div className="text-sm font-medium leading-snug">{payload.conditionLabel}</div>
          </div>
        )}
        {showCta && (
          <CtaButton
            label={ctaLabel} onClick={onClose}
            bg={cfg.ctaColor || accent}
            fg={cfg.ctaTextColor || text}
            radius={cfg.ctaRadius} padX={cfg.ctaPaddingX} padY={cfg.ctaPaddingY} fontSize={cfg.ctaFontSize}
            accent={accent}
          />
        )}
      </div>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// SHEET template — bottom slide-up. Mobile-native feel.
// ────────────────────────────────────────────────────────────────────────
function SheetReveal({
  payload, onClose, cfg, accent, text, bg, youWon, toClaim, ctaLabel,
  showYouWon, showRewardLabel, showCondition, showCta,
}: RevealChildProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-xl overflow-hidden p-6 pt-8 shadow-2xl"
      style={{
        background: cfg.bgImage
          ? `linear-gradient(180deg, ${bg}cc 0%, ${bg} 80%), url("${cfg.bgImage}") top/cover`
          : `linear-gradient(180deg, color-mix(in srgb, ${bg} 70%, #000) 0%, ${bg} 100%)`,
        color: text,
        border: `1px solid ${accent}55`,
        borderTopLeftRadius: cfg.cardRadius ?? 24,
        borderTopRightRadius: cfg.cardRadius ?? 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        boxShadow: `0 -20px 60px -10px ${accent}40`,
      }}
      initial={reduced ? { opacity: 0 } : { y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { y: '100%' }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', damping: 28, stiffness: 260 }}
    >
      {cfg.confetti && <Confetti accent={accent} />}
      <div
        aria-hidden
        className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full"
        style={{ background: `${text}33` }}
      />
      <CloseButton onClose={onClose} color={text} />
      <div className="relative text-center">
        {showYouWon && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-70" style={{ color: accent }}>
            {youWon}
          </div>
        )}
        {showRewardLabel && (
          <div className="mb-1 text-4xl font-black leading-tight">
            {payload.rewardAmount != null && payload.rewardAmount !== '' ? `${payload.rewardAmount}` : payload.rewardLabel}
          </div>
        )}
        {showRewardLabel && payload.rewardAmount != null && payload.rewardAmount !== '' && payload.rewardLabel && (
          <div className="text-base opacity-80">{payload.rewardLabel}</div>
        )}
        {showCondition && payload.conditionLabel && (
          <div
            className="mt-5 rounded-lg px-4 py-3 text-left"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px dashed ${accent}66` }}
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent, opacity: 0.9 }}>
              {toClaim}
            </div>
            <div className="text-sm font-medium leading-snug">{payload.conditionLabel}</div>
          </div>
        )}
        {showCta && (
          <CtaButton
            label={ctaLabel} onClick={onClose}
            bg={cfg.ctaColor || accent}
            fg={cfg.ctaTextColor || text}
            radius={cfg.ctaRadius} padX={cfg.ctaPaddingX} padY={cfg.ctaPaddingY} fontSize={cfg.ctaFontSize}
            accent={accent}
          />
        )}
      </div>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// HERO template — full-bleed background image, oversized prize. Most
// flashy variant; meant for campaigns with a branded reveal illustration.
// ────────────────────────────────────────────────────────────────────────
function HeroReveal({
  payload, onClose, cfg, accent, text, bg, youWon, toClaim, ctaLabel,
  showYouWon, showRewardLabel, showCondition, showCta,
}: RevealChildProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-lg overflow-hidden shadow-2xl"
      style={{
        background: cfg.bgImage
          ? `linear-gradient(180deg, transparent 0%, ${bg}ee 70%, ${bg} 100%), url("${cfg.bgImage}") center/cover`
          : `radial-gradient(ellipse at top, color-mix(in srgb, ${accent} 30%, ${bg}) 0%, ${bg} 60%)`,
        color: text,
        border: `1px solid ${accent}`,
        borderRadius: cfg.cardRadius ?? 20,
        minHeight: 440,
        boxShadow: `0 30px 80px -20px ${accent}60, 0 0 0 1px ${accent}33 inset`,
      }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', damping: 20, stiffness: 220 }}
    >
      {cfg.confetti && <Confetti accent={accent} />}
      <CloseButton onClose={onClose} color={text} />
      <div className="relative flex h-full min-h-[440px] flex-col items-center justify-end p-8 text-center">
        {showYouWon && (
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.35em] opacity-80" style={{ color: accent }}>
            {youWon}
          </div>
        )}
        {showRewardLabel && (
          <div className="mb-2 text-5xl font-black leading-none" style={{ textShadow: `0 4px 24px ${accent}88` }}>
            {payload.rewardAmount != null && payload.rewardAmount !== '' ? `${payload.rewardAmount}` : payload.rewardLabel}
          </div>
        )}
        {showRewardLabel && payload.rewardAmount != null && payload.rewardAmount !== '' && payload.rewardLabel && (
          <div className="text-base opacity-85">{payload.rewardLabel}</div>
        )}
        {showCondition && payload.conditionLabel && (
          <div
            className="mt-5 w-full rounded-lg px-4 py-3 text-left"
            style={{ background: 'rgba(0,0,0,0.4)', border: `1px dashed ${accent}88`, backdropFilter: 'blur(4px)' }}
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {toClaim}
            </div>
            <div className="text-sm font-medium leading-snug">{payload.conditionLabel}</div>
          </div>
        )}
        {showCta && (
          <div className="w-full">
            <CtaButton
              label={ctaLabel} onClick={onClose}
              bg={cfg.ctaColor || accent}
              fg={cfg.ctaTextColor || text}
              radius={cfg.ctaRadius} padX={cfg.ctaPaddingX} padY={cfg.ctaPaddingY} fontSize={cfg.ctaFontSize}
              accent={accent}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// IMAGE-ONLY template — the operator's background image is the whole
// reveal. Preset labels / CTA only show if the per-element toggles are on,
// otherwise it's purely the PNG + a small close button. Use this when the
// PNG already has "You won $10 — deposit $20 to claim — CTA" drawn in,
// and the default chrome would just duplicate it.
// ────────────────────────────────────────────────────────────────────────
function ImageOnlyReveal({
  payload, onClose, cfg, accent, text, bg, youWon, toClaim, ctaLabel,
  showYouWon, showRewardLabel, showCondition, showCta,
}: RevealChildProps) {
  const reduced = useReducedMotion()
  const hasAnyChrome = showYouWon || showRewardLabel || showCondition || showCta
  // Size to the image's natural aspect ratio — no forced 4:5, no `cover`
  // that crops or stretches. The <img> tag itself dictates the card size
  // (scaled down to fit the viewport if needed). No image → compact
  // fallback card so the reveal still reads as a reveal.
  return (
    <motion.div
      onClick={(e) => e.stopPropagation()}
      className="relative overflow-hidden"
      style={{
        color: text,
        borderRadius: cfg.cardRadius ?? 16,
        background: cfg.bgImage ? 'transparent' : bg,
        boxShadow: `0 20px 60px -10px rgba(0,0,0,0.6)`,
        // Cap at viewport so huge PNGs don't overflow; otherwise display at
        // natural size.
        maxWidth: 'min(90vw, 900px)',
        maxHeight: '90vh',
        display: 'inline-block',
        lineHeight: 0,
      }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', damping: 20, stiffness: 240 }}
    >
      {cfg.confetti && <Confetti accent={accent} />}
      {cfg.bgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cfg.bgImage}
          alt=""
          draggable={false}
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '90vh',
            width: 'auto',
            height: 'auto',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      )}
      {!cfg.bgImage && <div style={{ width: 320, height: 320 }} />}
      <CloseButton onClose={onClose} color={text} />
      {/* Chrome is fully opt-in. If every toggle is off the image speaks
          for itself; otherwise we float a minimal stack at the bottom so
          the operator's artwork isn't covered. */}
      {hasAnyChrome && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-5 text-center"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 100%)' }}
        >
          {showYouWon && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-90" style={{ color: accent }}>
              {youWon}
            </div>
          )}
          {showRewardLabel && (
            <div className="text-2xl font-black leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {payload.rewardAmount != null && payload.rewardAmount !== '' ? `${payload.rewardAmount}` : payload.rewardLabel}
            </div>
          )}
          {showCondition && payload.conditionLabel && (
            <div className="text-sm font-medium opacity-95" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              <span style={{ color: accent }}>{toClaim}: </span>
              {payload.conditionLabel}
            </div>
          )}
          {showCta && (
            <div className="mt-1 w-full">
              <CtaButton
                label={ctaLabel} onClick={onClose}
                bg={cfg.ctaColor || accent}
                fg={cfg.ctaTextColor || text}
                radius={cfg.ctaRadius} padX={cfg.ctaPaddingX} padY={cfg.ctaPaddingY} fontSize={cfg.ctaFontSize}
                accent={accent}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

interface RevealChildProps {
  payload: PrizeRevealPayload
  onClose: () => void
  cfg: RevealConfig
  accent: string
  text: string
  bg: string
  youWon: string
  toClaim: string
  ctaLabel: string
  showYouWon: boolean
  showRewardLabel: boolean
  showCondition: boolean
  showCta: boolean
}

// Host for the custom (drag-and-drop) reveal. Thin wrapper that passes
// the serialized JSON + live data into the Craft.js renderer.
function CustomRevealHost({
  json, payload, onClose, defaults,
}: {
  json: string
  payload: PrizeRevealPayload
  onClose: () => void
  defaults: { youWon: string; toClaim: string; ctaLabel: string }
}) {
  return <RevealRenderer json={json} data={{ payload, onClose, previewMode: false, defaults }} />
}

export function PrizeReveal({ payload, onClose, config = {} }: PrizeRevealProps) {
  const reduced = useReducedMotion()
  const template: RevealTemplate = config.template || 'modal'

  // Resolve theming with fallbacks. Operators rarely need to override these
  // per-reveal since the wheel's accent/text/bg usually match.
  const accent = config.accentColor || '#7c3aed'
  const text = config.textColor || '#ffffff'
  const bg = config.bgColor || '#1a1a2e'

  // String overrides. Empty ⇒ English default (i18n wiring TBD — per-widget
  // strings still trump locale strings so operators can brand-match).
  const youWon = config.youWonLabel || 'You won'
  const toClaim = config.toClaimLabel || 'To claim'
  const ctaLabel = config.ctaLabel || 'Continue'

  const backdropAlpha =
    config.backdropOpacity != null && config.backdropOpacity > 0
      ? Math.min(100, config.backdropOpacity) / 100
      : 0.7

  // Sheet pins to the bottom of the viewport (mobile-native), everything
  // else (modal / hero / image_only) centres.
  const align =
    template === 'sheet'
      ? 'items-end justify-center p-0'
      : 'items-center justify-center p-6'

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          className={`fixed inset-0 z-[100] flex ${align}`}
          style={{
            background: `rgba(0,0,0,${backdropAlpha})`,
            backdropFilter: 'blur(4px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.1 : 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="prize-reveal-title"
        >
          {(() => {
            // Default every per-element toggle to true — existing campaigns
            // that were authored before the toggles existed keep their
            // original layout. Operators opt INTO stripping chrome.
            const shared: RevealChildProps = {
              payload, onClose, cfg: config, accent, text, bg, youWon, toClaim, ctaLabel,
              showYouWon: config.showYouWon !== false,
              showRewardLabel: config.showRewardLabel !== false,
              showCondition: config.showCondition !== false,
              showCta: config.showCta !== false,
            }
            if (template === 'sheet') return <SheetReveal {...shared} />
            if (template === 'hero') return <HeroReveal {...shared} />
            if (template === 'image_only') return <ImageOnlyReveal {...shared} />
            if (template === 'custom' && config.customJson && config.customJson.trim()) {
              // Dynamic import so the runtime bundle for campaigns that
              // don't use a custom reveal stays lean (Craft.js editor +
              // resolver is non-trivial).
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <CustomRevealHost
                    json={config.customJson}
                    payload={payload}
                    onClose={onClose}
                    defaults={{ youWon, toClaim, ctaLabel }}
                  />
                </div>
              )
            }
            return <ModalReveal {...shared} />
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Format a backend `conditionConfig` into the human-readable sentence shown
 * in the reveal card. Unknown shapes fall back to the raw label or a
 * generic string so we never render "undefined".
 */
export function formatConditionLabel(cfg: NonNullable<import('@/hooks/use-canvas-data').SpinResultData['conditionConfig']>): string {
  if (cfg.label) return cfg.label
  const type = cfg.condition_type
  const target = cfg.target_value
  const hours = cfg.time_limit_hours
  const within = hours ? ` within ${hours}h` : ''
  switch (type) {
    case 'BET_AMOUNT':
      return target ? `Wager $${target}${within}` : `Complete wager requirement${within}`
    case 'DEPOSIT_AMOUNT':
      return target ? `Deposit $${target}${within}` : `Make a deposit${within}`
    case 'REFERRAL_COUNT':
      return target ? `Refer ${target} player${target === 1 ? '' : 's'}${within}` : `Refer players${within}`
    case 'MISSION_COMPLETE':
      return `Complete the linked mission${within}`
    default:
      return target ? `Reach target of ${target}${within}` : 'Complete condition'
  }
}
