'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Megaphone, Users, Activity, Settings,
  ChevronLeft, ChevronRight, LogOut, Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/events', label: 'Event Log', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
]

type ConnectionStatus = 'connected' | 'stale' | 'disconnected'

function useEngineStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('connected')
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL ?? 'http://localhost:3000'
    let cancelled = false
    const check = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(`${engineUrl}/health`, { signal: controller.signal, mode: 'cors' })
        clearTimeout(timeout)
        if (!cancelled) {
          setStatus(res.ok ? 'connected' : 'disconnected')
          if (!res.ok) setLastError(`HTTP ${res.status}`)
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('disconnected')
          setLastError(err instanceof Error ? err.message : 'Unknown error')
        }
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  return { status, lastError }
}

const statusColors: Record<ConnectionStatus, string> = {
  connected: 'text-emerald-400',
  stale: 'text-amber-400',
  disconnected: 'text-red-400',
}

const statusLabels: Record<ConnectionStatus, string> = {
  connected: 'Engine connected',
  stale: 'Connection stale',
  disconnected: 'Engine unreachable',
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { status, lastError } = useEngineStatus()
  const [showDetail, setShowDetail] = useState(false)

  return (
    <aside className={cn(
      'flex flex-col border-r border-border bg-card transition-all duration-200',
      collapsed ? 'w-16' : 'w-64',
    )}>
      <div className="flex h-14 items-center border-b border-border px-4">
        {!collapsed && <span className="text-lg font-bold text-primary">PromoStudio</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          aria-label="Engine connection status"
        >
          <Circle className={cn('h-2.5 w-2.5 fill-current', statusColors[status])} />
          {!collapsed && <span>{statusLabels[status]}</span>}
        </button>
        {showDetail && !collapsed && (
          <div className="rounded-md bg-accent/50 p-2 text-[10px] text-muted-foreground space-y-0.5">
            <p>URL: {process.env.NEXT_PUBLIC_ENGINE_URL ?? 'localhost:3000'}</p>
            {lastError && <p className="text-red-400">Error: {lastError}</p>}
          </div>
        )}
        {!collapsed && user && (
          <p className="truncate px-3 text-xs text-muted-foreground">{user.sub}</p>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
