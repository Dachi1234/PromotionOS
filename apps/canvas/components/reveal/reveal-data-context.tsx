'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { PrizeRevealPayload } from '@/components/shared/prize-reveal'

/**
 * Live data for the custom-reveal Craft.js blocks.
 *
 * The reveal canvas is authored once in the builder and re-rendered at
 * runtime with values injected via this context — reward label, condition
 * label, optional progress, and the close callback. Blocks read only what
 * they need (RevealRewardLabel → `payload.rewardLabel`, RevealCtaButton →
 * `onClose`, etc.), so they remain pure presentation while the wheel
 * widget owns the data flow.
 *
 * Edit mode fills this with sample data (from the first bound reward) so
 * the operator sees realistic content while positioning elements.
 */
export interface RevealData {
  payload: PrizeRevealPayload
  onClose: () => void
  /** Preview-only flag so blocks can render sample fallbacks (e.g. a
   *  progress bar shows "0 / 20" instead of reading live player state). */
  previewMode: boolean
  /** Operator-authored strings from the wheel widget settings. Blocks
   *  use these as defaults when their own content prop is empty. */
  defaults: {
    youWon: string
    toClaim: string
    ctaLabel: string
  }
}

const RevealDataContext = createContext<RevealData | null>(null)

export function RevealDataProvider({ value, children }: { value: RevealData; children: ReactNode }) {
  return <RevealDataContext.Provider value={value}>{children}</RevealDataContext.Provider>
}

export function useRevealData(): RevealData {
  const ctx = useContext(RevealDataContext)
  // Builder canvases (outside a reveal) also render these blocks via the
  // preview. Return a safe fallback so they don't crash when mounted
  // without a provider (e.g. during the initial Craft.js draft).
  if (!ctx) {
    return {
      payload: { rewardLabel: 'Sample Prize', conditionLabel: 'Sample condition' },
      onClose: () => {},
      previewMode: true,
      defaults: { youWon: 'You won', toClaim: 'To claim', ctaLabel: 'Continue' },
    }
  }
  return ctx
}
