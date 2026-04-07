'use client'

import { AppShell } from '@/components/layout/app-shell'
import { useAuth } from '@/lib/auth'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

        <div className="rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-medium">Account</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">{user?.sub ?? '—'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Role</label>
              <p className="font-medium capitalize">{user?.role ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-medium">Engine Connection</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Engine API URL</label>
              <p className="font-mono text-sm">{process.env.NEXT_PUBLIC_ENGINE_URL ?? 'http://localhost:3000'}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
