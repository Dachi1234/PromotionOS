'use client'

import { useState, useRef, useEffect } from 'react'
import { Eye, ChevronDown, User, Loader2 } from 'lucide-react'
import { usePlayers, useCreateSession } from '@/hooks/use-players'

interface PlayerPreviewButtonProps {
  campaignSlug: string
  canvasUrl: string
}

export function PlayerPreviewButton({ campaignSlug, canvasUrl }: PlayerPreviewButtonProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data } = usePlayers({ page: 1, limit: 50 })
  const createSession = useCreateSession()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectPlayer = async (playerId: string, displayName: string) => {
    setCreating(playerId)
    try {
      const session = await createSession.mutateAsync(playerId)
      const params = new URLSearchParams({
        token: session.token,
        testMode: '1',
        pid: playerId,
        pname: displayName,
      })
      window.open(`${canvasUrl}/${campaignSlug}?${params}`, '_blank')
      setOpen(false)
    } catch {
      /* session creation failed */
    } finally {
      setCreating(null)
    }
  }

  const handleAdminPreview = () => {
    window.open(`${canvasUrl}/${campaignSlug}?preview=admin`, '_blank')
    setOpen(false)
  }

  const players = data?.players ?? []

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Eye className="h-4 w-4" />
        Test as Player
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-popover shadow-xl">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium">Select a test player</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creates a real session for full interactive testing
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {players.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No test players found. Create one on the Players page.
              </div>
            ) : (
              players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPlayer(p.id, p.displayName)}
                  disabled={creating !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex-shrink-0 rounded-full bg-accent p-1.5">
                    {creating === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] capitalize rounded-full bg-accent px-1.5 py-0.5">
                        {p.vipTier}
                      </span>
                      {p.segmentTags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{p.externalId}</span>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border">
            <button
              onClick={handleAdminPreview}
              className="w-full rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent text-left"
            >
              Visual-only preview (no interactions)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
