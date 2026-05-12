'use client'

/**
 * /__preview — internal catalog page.
 *
 * Renders every widget state primitive and each surviving wheel template in
 * one matrix so designers and engineers can eyeball regressions in a single
 * scroll. Not meant for operators — the double-underscore prefix keeps it
 * out of campaign routing; we just don't link to it from the Studio.
 *
 * After the "serious only" template cull the wheel is the single widget
 * with multiple template families. Other widgets render a single inline
 * serious default and don't need a cross-variant catalog.
 */

import { useState } from 'react'
import { THEMES } from '@/lib/themes'
import {
  WidgetSkeleton,
  WidgetEmpty,
  WidgetIneligible,
  WidgetError,
  WidgetCompleted,
  WidgetAlmostThere,
} from '@/components/shared/widget-state'
import { JackpotWheel } from '@/components/templates/wheel/jackpot-wheel'
import { StadiumWheel } from '@/components/templates/wheel/stadium-wheel'
import { CasinoVIPWheel } from '@/components/templates/wheel/casino-vip-wheel'
import type { WheelTemplateProps } from '@/components/templates/shared-types'

const SAMPLE_WHEEL: WheelTemplateProps = {
  slices: [
    { label: '10 GEL', color: '' },
    { label: 'Spin', color: '' },
    { label: '50 GEL', color: '' },
    { label: '5 GEL', color: '' },
    { label: 'Bonus', color: '' },
    { label: '100', color: '' },
  ],
  rotation: 0,
  spinning: false,
  result: null,
  canSpin: true,
  spinsRemaining: 3,
  onSpin: () => {},
  wheelSize: 260,
  spinButtonLabel: 'Spin',
  spinButtonColor: '',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold border-b border-border pb-1">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </section>
  )
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      {children}
    </div>
  )
}

export default function PreviewCatalogPage(): React.JSX.Element {
  const [themeId, setThemeId] = useState<string>('clean')

  return (
    <div data-theme={themeId} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">Canvas Preview Catalog</h1>
          <p className="text-xs text-muted-foreground">
            Widget state primitives × wheel templates × themes. Dev tool — do not link from Studio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">Theme:</label>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <Section title="Widget state primitives">
          <Tile label="Skeleton"><WidgetSkeleton lines={3} /></Tile>
          <Tile label="Empty">
            <WidgetEmpty title="Nothing yet" description="Come back when you've earned your first reward." />
          </Tile>
          <Tile label="Ineligible">
            <WidgetIneligible reason="You're not in the target segment for this campaign." />
          </Tile>
          <Tile label="Error">
            <WidgetError detail="fetch failed: 502" onRetry={() => {}} />
          </Tile>
          <Tile label="Completed">
            <WidgetCompleted title="Reward claimed" description="See you next week." />
          </Tile>
          <Tile label="Almost there (85%)">
            <WidgetAlmostThere progress={0.85} description="Keep going to win the jackpot." />
          </Tile>
        </Section>

        <Section title="Wheel templates">
          <Tile label="Stadium"><StadiumWheel {...SAMPLE_WHEEL} /></Tile>
          <Tile label="Jackpot"><JackpotWheel {...SAMPLE_WHEEL} /></Tile>
          <Tile label="Casino VIP"><CasinoVIPWheel {...SAMPLE_WHEEL} /></Tile>
        </Section>
      </main>
    </div>
  )
}
