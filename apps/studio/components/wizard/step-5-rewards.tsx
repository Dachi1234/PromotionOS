'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useWizardStore, type WizardMechanic, type WizardRewardDefinition } from '@/stores/wizard-store'

const REWARD_TYPES = [
  'FREE_SPINS', 'FREE_BET', 'CASH', 'CASHBACK', 'VIRTUAL_COINS',
  'MULTIPLIER', 'PHYSICAL', 'ACCESS_UNLOCK', 'EXTRA_SPIN',
]

function RewardForm({ reward, onChange, onRemove, showWeight, showRankRange, mechanic }: {
  reward: WizardRewardDefinition
  onChange: (r: WizardRewardDefinition) => void
  onRemove: () => void
  showWeight?: boolean
  showRankRange?: boolean
  mechanic?: WizardMechanic
}) {
  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={reward.type}
          onChange={(e) => onChange({ ...reward, type: e.target.value })}
          className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs"
        >
          {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(reward.type === 'FREE_SPINS' || reward.type === 'EXTRA_SPIN') && (
          <input type="number" placeholder="Number of spins" value={String(reward.config.spins ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, spins: Number(e.target.value) } })} className="h-8 rounded border border-input bg-background px-2 text-xs" />
        )}
        {(reward.type === 'CASH' || reward.type === 'FREE_BET') && (
          <input type="number" placeholder="Amount" value={String(reward.config.amount ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, amount: Number(e.target.value) } })} className="h-8 rounded border border-input bg-background px-2 text-xs" />
        )}
        {reward.type === 'CASHBACK' && (
          <>
            <input type="number" placeholder="Percentage" value={String(reward.config.percentage ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, percentage: Number(e.target.value) } })} className="h-8 rounded border border-input bg-background px-2 text-xs" />
            <input type="number" placeholder="Cap amount" value={String(reward.config.cap ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, cap: Number(e.target.value) } })} className="h-8 rounded border border-input bg-background px-2 text-xs" />
          </>
        )}
        {reward.type === 'VIRTUAL_COINS' && (
          <input type="number" placeholder="Coin amount" value={String(reward.config.coins ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, coins: Number(e.target.value) } })} className="h-8 rounded border border-input bg-background px-2 text-xs" />
        )}
        {reward.type === 'MULTIPLIER' && (
          <input type="number" placeholder="Multiplier (e.g. 2)" value={String(reward.config.multiplier ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, multiplier: Number(e.target.value) } })} className="h-8 rounded border border-input bg-background px-2 text-xs" />
        )}
        {reward.type === 'PHYSICAL' && (
          <input type="text" placeholder="Prize description" value={String(reward.config.description ?? '')} onChange={(e) => onChange({ ...reward, config: { ...reward.config, description: e.target.value } })} className="h-8 col-span-2 rounded border border-input bg-background px-2 text-xs" />
        )}
      </div>

      {showWeight && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Weight:
            <Tooltip content="Controls how likely this prize is. Higher weight = more common. For example, if one slice has weight 90 and another has weight 10, the first wins 90% of the time.">
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input type="number" value={reward.probabilityWeight ?? 1} onChange={(e) => onChange({ ...reward, probabilityWeight: Number(e.target.value) })} className="h-7 w-20 rounded border border-input bg-background px-2 text-xs" min={0} />
        </div>
      )}

      {showWeight && mechanic?.type === 'WHEEL_IN_WHEEL' && (
        <div className="space-y-2 border-t border-border pt-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!reward.conditionConfig}
              onChange={(e) => onChange({
                ...reward,
                conditionConfig: e.target.checked ? { conditionType: 'DEPOSIT_AMOUNT', targetValue: 0, timeLimitHours: 24, onFailure: 'expire' } : null,
              })}
              className="rounded"
            />
            <span className="font-medium">Condition Gate</span>
          </label>
          {reward.conditionConfig && (
            <div className="grid grid-cols-2 gap-2 pl-6">
              <select
                value={String((reward.conditionConfig as Record<string, unknown>).conditionType ?? 'DEPOSIT_AMOUNT')}
                onChange={(e) => onChange({ ...reward, conditionConfig: { ...(reward.conditionConfig as Record<string, unknown>), conditionType: e.target.value } })}
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              >
                <option value="DEPOSIT_AMOUNT">Deposit Amount</option>
                <option value="BET_AMOUNT">Bet Amount</option>
                <option value="REFERRAL_COUNT">Referral Count</option>
                <option value="MISSION_COMPLETE">Mission Complete</option>
              </select>
              <input
                type="number"
                value={String((reward.conditionConfig as Record<string, unknown>).targetValue ?? '')}
                onChange={(e) => onChange({ ...reward, conditionConfig: { ...(reward.conditionConfig as Record<string, unknown>), targetValue: Number(e.target.value) } })}
                placeholder="Target value"
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              />
              <input
                type="number"
                value={String((reward.conditionConfig as Record<string, unknown>).timeLimitHours ?? 24)}
                onChange={(e) => onChange({ ...reward, conditionConfig: { ...(reward.conditionConfig as Record<string, unknown>), timeLimitHours: Number(e.target.value) } })}
                placeholder="Time limit (hours)"
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              />
              <select
                value={String((reward.conditionConfig as Record<string, unknown>).onFailure ?? 'expire')}
                onChange={(e) => onChange({ ...reward, conditionConfig: { ...(reward.conditionConfig as Record<string, unknown>), onFailure: e.target.value } })}
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              >
                <option value="expire">Expire on failure</option>
                <option value="carry_over">Carry over</option>
              </select>
            </div>
          )}
        </div>
      )}

      {showRankRange && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Rank:
            <Tooltip content="The leaderboard positions that receive this prize. For example, 1 to 3 means the top 3 players get this reward.">
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input type="number" value={reward.rankRange?.fromRank ?? 1} onChange={(e) => onChange({ ...reward, rankRange: { fromRank: Number(e.target.value), toRank: reward.rankRange?.toRank ?? 1 } })} placeholder="From" className="h-7 w-16 rounded border border-input bg-background px-2 text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="number" value={reward.rankRange?.toRank ?? 1} onChange={(e) => onChange({ ...reward, rankRange: { fromRank: reward.rankRange?.fromRank ?? 1, toRank: Number(e.target.value) } })} placeholder="To" className="h-7 w-16 rounded border border-input bg-background px-2 text-xs" />
        </div>
      )}
    </div>
  )
}

function ProbabilityBar({ rewards }: { rewards: WizardRewardDefinition[] }) {
  const total = rewards.reduce((sum, r) => sum + (r.probabilityWeight ?? 1), 0)
  if (total === 0) return null

  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500']

  return (
    <div className="space-y-1">
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {rewards.map((r, i) => {
          const pct = ((r.probabilityWeight ?? 1) / total) * 100
          return (
            <div key={r.id} className={`${colors[i % colors.length]} flex items-center justify-center text-[10px] font-bold text-white`} style={{ width: `${pct}%` }}>
              {pct >= 8 ? `${pct.toFixed(0)}%` : ''}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">Probability distribution (auto-normalized from weights)</p>
    </div>
  )
}

function MechanicRewards({ mechanic }: { mechanic: WizardMechanic }) {
  const store = useWizardStore()
  const rewards = mechanic.rewardDefinitions ?? []
  const isWheel = mechanic.type === 'WHEEL' || mechanic.type === 'WHEEL_IN_WHEEL'
  const isLeaderboard = mechanic.type === 'LEADERBOARD' || mechanic.type === 'LEADERBOARD_LAYERED'

  const addReward = () => {
    const reward: WizardRewardDefinition = {
      id: `rew-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'CASH',
      config: {},
      probabilityWeight: isWheel ? 1 : undefined,
      rankRange: isLeaderboard ? { fromRank: rewards.length + 1, toRank: rewards.length + 1 } : undefined,
    }
    store.updateMechanic(mechanic.id, { rewardDefinitions: [...rewards, reward] })
  }

  const updateReward = (id: string, data: WizardRewardDefinition) => {
    store.updateMechanic(mechanic.id, {
      rewardDefinitions: rewards.map((r) => (r.id === id ? data : r)),
    })
  }

  const removeReward = (id: string) => {
    store.updateMechanic(mechanic.id, {
      rewardDefinitions: rewards.filter((r) => r.id !== id),
    })
  }

  return (
    <div className="space-y-3">
      {isWheel && rewards.length >= 2 && <ProbabilityBar rewards={rewards} />}

      <div className="space-y-2">
        {rewards.map((r) => (
          <RewardForm
            key={r.id}
            reward={r}
            onChange={(updated) => updateReward(r.id, updated)}
            onRemove={() => removeReward(r.id)}
            showWeight={isWheel}
            showRankRange={isLeaderboard}
            mechanic={mechanic}
          />
        ))}
      </div>

      <button onClick={addReward} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus className="h-3 w-3" /> Add {isWheel ? 'Slice' : isLeaderboard ? 'Prize Tier' : 'Reward'}
      </button>

      {isWheel && rewards.length < 2 && rewards.length > 0 && (
        <p className="text-xs text-amber-400">Wheel needs at least 2 slices</p>
      )}
    </div>
  )
}

export default function Step5Rewards() {
  const store = useWizardStore()
  const [expanded, setExpanded] = useState<string | null>(store.mechanics[0]?.id ?? null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Rewards</h2>
        <p className="text-sm text-muted-foreground">Configure reward definitions for each mechanic</p>
      </div>

      <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-sm">
        <p className="font-medium text-blue-400">How rewards work</p>
        <p className="text-muted-foreground mt-1">Define what players win from each mechanic. For wheels, each reward is a slice — use probability weights to control how likely each prize is. Higher weight = more likely to win. For example, weights 90/10 mean 90% chance vs 10% chance.</p>
      </div>

      {store.mechanics.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Add mechanics in Step 3 first
        </div>
      ) : (
        <div className="space-y-3">
          {store.mechanics.map((mech) => (
            <div key={mech.id} className="rounded-lg border border-border">
              <button
                onClick={() => setExpanded(expanded === mech.id ? null : mech.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {expanded === mech.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">{mech.label}</span>
                <span className="text-xs text-muted-foreground">({mech.type})</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {mech.rewardDefinitions.length} reward{mech.rewardDefinitions.length !== 1 ? 's' : ''}
                </span>
              </button>
              {expanded === mech.id && (
                <div className="border-t border-border p-4">
                  <MechanicRewards mechanic={mech} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
