'use client'

/**
 * /__preview — internal catalog page.
 *
 * Renders every widget state primitive, every template family, and every
 * theme in a matrix so designers and engineers can eyeball regressions
 * in one scroll. Not meant for operators — there's no auth gate, but the
 * URL is hidden from campaign routing by virtue of the double-underscore
 * prefix (Next.js treats it like any other route; we just don't link to
 * it from the Studio).
 *
 * Data is stubbed inline so the page renders without hitting the API.
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
import { LuxeWheel } from '@/components/templates/wheel/luxe-wheel'
import { LuxeLeaderboard } from '@/components/templates/leaderboard/luxe-leaderboard'
import { LuxeProgressBar } from '@/components/templates/progress-bar/luxe-progress-bar'
import { LuxeOptIn } from '@/components/templates/opt-in/luxe-opt-in'
import { LuxeCashout } from '@/components/templates/cashout/luxe-cashout'
import { LuxeMission } from '@/components/templates/mission/luxe-mission'
import { StoryWheel } from '@/components/templates/wheel/story-wheel'
import { StoryLeaderboard } from '@/components/templates/leaderboard/story-leaderboard'
import { StoryProgressBar } from '@/components/templates/progress-bar/story-progress-bar'
import { StoryOptIn } from '@/components/templates/opt-in/story-opt-in'
import type { LeaderboardTemplateProps, WheelTemplateProps } from '@/components/templates/shared-types'

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
  spinButtonColor: '#7c3aed',
}

const SAMPLE_LB: LeaderboardTemplateProps = {
  entries: [
    { rank: 1, displayName: 'AceHunter', value: 18200, isCurrentPlayer: false, trend: 'same' },
    { rank: 2, displayName: 'MidnightFox', value: 15400, isCurrentPlayer: false, trend: 'up' },
    { rank: 3, displayName: 'NinaK', value: 12800, isCurrentPlayer: true, trend: 'up' },
    { rank: 4, displayName: 'Pilot_77', value: 10200, isCurrentPlayer: false, trend: 'down' },
    { rank: 5, displayName: 'Rookie', value: 8400, isCurrentPlayer: false, trend: 'same' },
  ],
  currentPlayerRank: 3,
  totalParticipants: 842,
  lastUpdated: new Date().toISOString(),
  title: 'Weekly Top 5',
  timeWindow: 'Week 2',
  page: 1,
  totalPages: 1,
  onPageChange: () => {},
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
            All widget states × templates × themes. Dev tool — do not link from Studio.
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

        <Section title="Luxe templates">
          <Tile label="Wheel"><LuxeWheel {...SAMPLE_WHEEL} /></Tile>
          <Tile label="Leaderboard"><LuxeLeaderboard {...SAMPLE_LB} /></Tile>
          <Tile label="Progress bar">
            <LuxeProgressBar
              currentValue={620}
              targetValue={1000}
              progressPercentage={62}
              completed={false}
              claimed={false}
              rewardLabel="Win a free spin"
              onClaim={() => {}}
            />
          </Tile>
          <Tile label="Cashout">
            <LuxeCashout
              conditions={[
                { label: 'Deposited ≥ 50', met: true, currentValue: 60, targetValue: 50 },
                { label: 'Wagered ≥ 200', met: false, currentValue: 120, targetValue: 200 },
              ]}
              allConditionsMet={false}
              rewardLabel="Claim your bonus"
              claimsUsed={0}
              maxClaims={1}
              onClaim={() => {}}
            />
          </Tile>
          <Tile label="Opt-In">
            <LuxeOptIn
              optedIn={false}
              eligible
              onOptIn={() => {}}
              preLabel="Join the action"
              postLabel="You're in!"
            />
          </Tile>
          <Tile label="Mission">
            <LuxeMission
              steps={[
                { order: 1, title: 'Log in daily', description: '3 days', status: 'completed', currentValue: 3, targetValue: 3, progressPercentage: 100 },
                { order: 2, title: 'Place a bet', description: 'Any sport', status: 'active', currentValue: 1, targetValue: 5, progressPercentage: 20 },
                { order: 3, title: 'Win 3 rounds', description: 'This week', status: 'locked', currentValue: 0, targetValue: 3, progressPercentage: 0 },
              ]}
              executionMode="sequential"
              onClaim={() => {}}
            />
          </Tile>
        </Section>

        <Section title="Story templates (9:16)">
          <Tile label="Wheel"><StoryWheel {...SAMPLE_WHEEL} /></Tile>
          <Tile label="Leaderboard"><StoryLeaderboard {...SAMPLE_LB} /></Tile>
          <Tile label="Progress bar">
            <StoryProgressBar
              currentValue={820}
              targetValue={1000}
              progressPercentage={82}
              completed={false}
              claimed={false}
              rewardLabel="Unlock your free spin"
              onClaim={() => {}}
            />
          </Tile>
          <Tile label="Opt-in">
            <StoryOptIn
              optedIn={false}
              eligible
              onOptIn={() => {}}
              preLabel="Ready to play?"
              postLabel="You're in!"
            />
          </Tile>
        </Section>
      </main>
    </div>
  )
}
