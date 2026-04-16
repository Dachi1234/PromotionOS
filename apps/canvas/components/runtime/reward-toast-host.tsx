'use client'

/**
 * RewardToastHost — listens for `reward-granted` events on the SSE stream
 * and renders a stack of toasts + fires a confetti burst. Mount once near
 * the root (alongside RuntimeShell).
 *
 * Decoupled from `useSessionStream` via the `onRewardGranted` callback so
 * that test harnesses / Storybook can trigger the same UI without a real
 * server.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { Confetti } from '@/components/motion/confetti'
import { useSessionStream, type RewardGrantedPayload } from '@/hooks/use-session-stream'

interface Toast {
  id: number
  rewardType: string
  amount?: number
  label: string
}

const TOAST_TTL_MS = 4500

/** Human labels. Keep in sync with engine `reward_type` enum. */
const REWARD_LABEL: Record<string, (amount?: number) => string> = {
  VIRTUAL_COINS: (a) => `+${a ?? 0} coins`,
  CASH: (a) => `${a ?? 0} GEL cash`,
  CASHBACK: (a) => `${a ?? 0} GEL cashback`,
  FREE_SPINS: (a) => `${a ?? 0} free spins`,
  FREE_BET: (a) => `${a ?? 0} GEL free bet`,
  EXTRA_SPIN: (a) => `+${a ?? 1} extra spin${(a ?? 1) === 1 ? '' : 's'}`,
  ACCESS_UNLOCK: () => 'Unlocked!',
}

export function RewardToastHost({ slug }: { slug: string | null }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [burst, setBurst] = useState(0)

  const handleReward = useCallback((payload: RewardGrantedPayload) => {
    const label = REWARD_LABEL[payload.rewardType]?.(payload.amount) ??
      `Reward: ${payload.rewardType.replace(/_/g, ' ').toLowerCase()}`
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, {
      id,
      rewardType: payload.rewardType,
      amount: payload.amount,
      label,
    }].slice(-3)) // cap to 3 simultaneous toasts
    setBurst((n) => n + 1)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_TTL_MS)
  }, [])

  useSessionStream(slug, { onRewardGranted: handleReward })

  return (
    <>
      <Confetti trigger={burst} />
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto min-w-[220px] rounded-[var(--radius)] bg-card text-card-foreground shadow-win px-4 py-3 border border-border"
              style={{
                backgroundImage: 'var(--gradient-win)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reward
              </div>
              <div className="text-sm font-semibold mt-0.5">{t.label}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
