'use client'

/**
 * LuxeMission — token-driven mission step tracker.
 *
 * Layout: vertical stepper with a connector line whose fill reflects overall
 * progress. Each step is a card with its own status pill + progress meter.
 * Active steps can be claimed when their metric hits target.
 *
 * Theme-reactive bits:
 *   - Connector line: `hsl(var(--progress-track))` → `hsl(var(--primary))`
 *   - Step status pills use `--success / --warning / --muted` tokens
 *   - Completed steps get a subtle `bg-gradient-win` fill
 */

import { motion } from 'framer-motion'
import type { MissionTemplateProps } from '../shared-types'
import { CountUp } from '@/components/motion/count-up'

const STATUS_STYLES: Record<
  MissionTemplateProps['steps'][number]['status'],
  { pill: string; label: string; glyph: string }
> = {
  locked: { pill: 'bg-muted text-muted-foreground', label: 'Locked', glyph: '🔒' },
  active: { pill: 'bg-accent/20 text-accent', label: 'Active', glyph: '▶' },
  completed: { pill: 'bg-success/20 text-success', label: 'Done', glyph: '✓' },
  claimed: { pill: 'bg-success text-white', label: 'Claimed', glyph: '★' },
  expired: { pill: 'bg-destructive/15 text-destructive', label: 'Expired', glyph: '×' },
}

export function LuxeMission({ steps, onClaim }: MissionTemplateProps): React.JSX.Element {
  const completedCount = steps.filter((s) => s.status === 'completed' || s.status === 'claimed').length
  const overallPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  return (
    <div className="rounded-[var(--radius)] bg-card text-card-foreground border border-border shadow-card p-4 sm:p-6 w-full max-w-md mx-auto">
      {/* Overall progress header */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-base font-bold">Mission Progress</h3>
          <span className="text-sm font-mono font-bold text-accent">
            <CountUp value={completedCount} /> / {steps.length}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'hsl(var(--progress-track))' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
            style={{ background: 'var(--gradient-hero)' }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="relative space-y-3 sm:space-y-4">
        {steps.map((step, i) => {
          const style = STATUS_STYLES[step.status]
          const isDone = step.status === 'completed' || step.status === 'claimed'
          const isClaimable = step.status === 'completed'

          return (
            <motion.div
              key={step.order}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`relative rounded-[calc(var(--radius)-4px)] border border-border p-4 ${isDone ? 'bg-gradient-win/40' : 'bg-muted/40'}`}
            >
              <div className="flex items-start gap-3">
                {/* Step number badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isDone ? 'bg-success text-white shadow-glow' : 'bg-background border border-border'
                  }`}
                >
                  {isDone ? '✓' : step.order}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm truncate">{step.title}</h4>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold ${style.pill}`}>
                      {style.label}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}

                  {/* Per-step meter */}
                  {step.status === 'active' && step.targetValue > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          <CountUp value={step.currentValue} /> / {step.targetValue}
                        </span>
                        <span className="font-mono text-accent">
                          {Math.round(step.progressPercentage)}%
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--progress-track))' }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, step.progressPercentage)}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full"
                          style={{ background: 'hsl(var(--progress-fill))' }}
                        />
                      </div>
                    </div>
                  )}

                  {isClaimable && (
                    <button
                      onClick={() => onClaim(step.order)}
                      className="mt-3 w-full min-h-[44px] rounded-md px-3 py-2 text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:brightness-110 transition"
                    >
                      Claim Step Reward
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
