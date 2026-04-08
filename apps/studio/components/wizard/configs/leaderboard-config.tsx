'use client'

import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { WizardMechanic } from '@/stores/wizard-store'
import { buildMetricOptions, type MetricOption } from '@/lib/metric-options'

interface Props {
  mechanic: WizardMechanic
  onUpdate: (config: Record<string, unknown>) => void
  isLayered: boolean
}

function LeaderboardFields({ prefix, config, onUpdate, metricOptions }: { prefix: string; config: Record<string, unknown>; onUpdate: (config: Record<string, unknown>) => void; metricOptions: MetricOption[] }) {
  const get = (key: string) => config[`${prefix}${key}`]
  const set = (key: string, value: unknown) => onUpdate({ [`${prefix}${key}`]: value })

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          Ranking Metric
          <Tooltip content="The player activity used to rank players. Options come from the aggregation rules you set up in Step 4.">
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <select value={String(get('rankingMetric') ?? '')} onChange={(e) => set('rankingMetric', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select metric...</option>
          {metricOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          Time Window
          <Tooltip content="How often the leaderboard resets. Daily = resets every day. Weekly = every week. Campaign = runs the entire campaign without resetting.">
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'campaign'] as const).map((w) => (
            <label key={w} className={`flex-1 cursor-pointer rounded-md border p-2 text-center text-xs transition-colors ${get('windowType') === w ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <input type="radio" className="sr-only" checked={get('windowType') === w} onChange={() => set('windowType', w)} />
              <span className="capitalize">{w}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          Tie-breaking Rule
          <Tooltip content="What happens when two players have the same score. 'First to reach' = the player who got there first wins. 'Highest secondary' = use a second metric to break the tie. 'Split' = both share the prize.">
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <select value={String(get('tieBreaker') ?? 'first_to_reach')} onChange={(e) => set('tieBreaker', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="first_to_reach">First to reach</option>
          <option value="highest_secondary">Highest secondary metric</option>
          <option value="split">Split</option>
        </select>
      </div>

      {get('tieBreaker') === 'highest_secondary' && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Secondary Metric
            <Tooltip content="A backup metric used to break ties. For example, if two players have the same bet total, the one with more deposits wins.">
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <select value={String(get('secondaryMetric') ?? '')} onChange={(e) => set('secondaryMetric', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select metric...</option>
            {metricOptions.map((opt) => (
              <option key={`sec-${opt.value}`} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          Max Displayed Ranks
          <Tooltip content="How many positions to show on the leaderboard. For example, set to 10 to show only the Top 10 players.">
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <input type="number" value={String(get('maxRanks') ?? 100)} onChange={(e) => set('maxRanks', Number(e.target.value))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
    </div>
  )
}

export function LeaderboardConfig({ mechanic, onUpdate, isLayered }: Props) {
  const config = mechanic.config

  const metricOptions = buildMetricOptions(mechanic.aggregationRules as { sourceEventType: string; metric: string; windowType: string }[] | undefined)

  return (
    <div className="space-y-6">
      {isLayered ? (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Leaderboard 1 (Coins)</h3>
            <LeaderboardFields prefix="l1_" config={config} onUpdate={onUpdate} metricOptions={metricOptions} />
          </div>

          <div className="rounded-lg border border-dashed border-primary/50 p-4 space-y-2">
            <h3 className="text-sm font-medium text-primary flex items-center gap-1.5">
              Coin Unlock Threshold
              <Tooltip content="The number of coins a player must earn from Leaderboard 1 before they can access Leaderboard 2. Players earn coins as L1 rewards.">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </Tooltip>
            </h3>
            <p className="text-xs text-muted-foreground">Coins earned from L1 required to unlock L2</p>
            <input type="number" value={String(config.coinUnlockThreshold ?? '')} onChange={(e) => onUpdate({ coinUnlockThreshold: Number(e.target.value) })} placeholder="e.g. 100" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <span className="rounded bg-accent px-2 py-1">L1 Rewards</span>
              <span>→ Coins →</span>
              <span className="rounded bg-primary/10 text-primary px-2 py-1">Unlock L2</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Leaderboard 2 (Prizes)</h3>
            <LeaderboardFields prefix="l2_" config={config} onUpdate={onUpdate} metricOptions={metricOptions} />
          </div>
        </>
      ) : (
        <LeaderboardFields prefix="" config={config} onUpdate={onUpdate} metricOptions={metricOptions} />
      )}
    </div>
  )
}
