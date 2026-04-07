'use client'

import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ended: 'bg-red-500/10 text-red-400 border-red-500/20',
  archived: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
      statusStyles[status] ?? statusStyles.draft,
    )}>
      {status}
    </span>
  )
}
