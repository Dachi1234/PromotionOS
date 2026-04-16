'use client'

/**
 * Shared widget state primitives.
 *
 * Every mechanic widget should cover six states:
 *   1. `loading`      — query in flight, no cached data yet.
 *   2. `empty`        — player has nothing yet (fresh opt-in).
 *   3. `in-progress`  — normal operating state (happy path).
 *   4. `completed`    — terminal success (reward granted / prize won).
 *   5. `ineligible`   — player doesn't meet segment/opt-in gating.
 *   6. `error`        — query failed or server returned 500.
 *
 * Use the components here to give all widgets a consistent look for the
 * non-happy-path branches. Widgets only need to render the `in-progress`
 * and `completed` variants themselves.
 *
 * Every primitive respects the active theme: backgrounds, text colors,
 * rounded corners, and glow shadows all come from CSS tokens.
 */

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function WidgetCard({
  children,
  className = '',
  highlight,
}: {
  children: ReactNode
  className?: string
  highlight?: 'win' | 'accent' | null
}): React.JSX.Element {
  const glow =
    highlight === 'win' ? 'shadow-win'
    : highlight === 'accent' ? 'shadow-glow'
    : 'shadow-card'
  return (
    <div className={`rounded-[var(--radius)] bg-card text-card-foreground border border-border ${glow} p-5 ${className}`}>
      {children}
    </div>
  )
}

/** Skeleton shimmer — same frame as the real widget so nothing jumps on load. */
export function WidgetSkeleton({
  lines = 3,
  showHeader = true,
}: {
  lines?: number
  showHeader?: boolean
}): React.JSX.Element {
  return (
    <WidgetCard>
      {showHeader && (
        <div className="h-4 w-32 rounded animate-shimmer mb-4" />
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded animate-shimmer"
            style={{ width: `${60 + ((i * 17) % 30)}%` }}
          />
        ))}
      </div>
    </WidgetCard>
  )
}

/** Empty state — player has no data yet. Keep CTAs here cheerful, not pushy. */
export function WidgetEmpty({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}): React.JSX.Element {
  return (
    <WidgetCard>
      <div className="flex flex-col items-center text-center py-8">
        {icon && <div className="mb-3 text-muted-foreground opacity-70">{icon}</div>}
        <div className="text-base font-semibold">{title}</div>
        {description && (
          <div className="text-sm text-muted-foreground mt-1 max-w-[28ch]">{description}</div>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </WidgetCard>
  )
}

/** Ineligibility message — segment gating, opt-in required, etc. */
export function WidgetIneligible({
  reason,
  cta,
}: {
  reason: string
  cta?: ReactNode
}): React.JSX.Element {
  return (
    <WidgetCard className="bg-muted">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-8 h-8 rounded-full bg-muted-foreground/10 flex items-center justify-center text-muted-foreground">
          ?
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Not available yet</div>
          <div className="text-sm text-muted-foreground mt-0.5">{reason}</div>
          {cta && <div className="mt-3">{cta}</div>}
        </div>
      </div>
    </WidgetCard>
  )
}

/** Error state — failed fetch. Keep the copy boring, offer retry. */
export function WidgetError({
  onRetry,
  detail,
}: {
  onRetry?: () => void
  detail?: string
}): React.JSX.Element {
  return (
    <WidgetCard className="border-destructive/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-lg">
          !
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Something went wrong</div>
          {detail && (
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">{detail}</div>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </WidgetCard>
  )
}

/** Terminal completion — reward claimed, mission finished. */
export function WidgetCompleted({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <WidgetCard highlight="win" className="bg-gradient-win">
        <div className="flex flex-col items-center text-center py-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Complete
          </div>
          <div className="text-xl font-bold mt-1">{title}</div>
          {description && (
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </WidgetCard>
    </motion.div>
  )
}

/**
 * "Almost there" pulse — used when a player is within striking distance
 * of a reward (≥ 80% progress by default). Shimmer + subtle scale pulse
 * + accent ring to push attention. The motivational copy is deliberately
 * short — this badge lives above/next to a progress bar, not inside a
 * modal.
 *
 * Respects `prefers-reduced-motion` via framer's built-in gate.
 */
export function WidgetAlmostThere({
  progress,
  label,
  description,
  threshold = 0.8,
}: {
  /** Fraction (0..1). */
  progress: number
  label?: string
  description?: string
  /** Minimum progress to render. Below this the component returns null. */
  threshold?: number
}): React.JSX.Element | null {
  if (progress < threshold) return null
  const percent = Math.min(100, Math.round(progress * 100))
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-[var(--radius)] border border-accent/40 bg-accent/10 text-card-foreground px-4 py-3 shadow-glow"
    >
      {/* Shimmer sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
        animate={{ x: ['0%', '300%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative flex items-center gap-3">
        <motion.div
          className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {percent}%
        </motion.div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{label ?? 'Almost there!'}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/** Small pill badge, e.g. to mark experimental config in operator-facing UI. */
export function ExperimentalBadge({
  label = 'Preview',
}: {
  label?: string
}): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
      {label}
    </span>
  )
}
