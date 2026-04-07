'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Users, Upload, FileText, X, HelpCircle } from 'lucide-react'
import { useWizardStore, type ConditionNode } from '@/stores/wizard-store'
import { useSegmentPreview } from '@/hooks/use-players'
import { Tooltip } from '@/components/ui/tooltip'

const CONDITION_TYPES = [
  { value: 'MIN_DEPOSIT_GEL', label: 'Minimum Deposit (GEL)', help: 'Player must have deposited at least this amount in GEL total.' },
  { value: 'VIP_TIER', label: 'VIP Tier', help: 'Player must be at this VIP level or higher.' },
  { value: 'SEGMENT_TAG', label: 'Segment Tag', help: 'Player must have this tag assigned (e.g. "high-roller", "new-player").' },
  { value: 'REGISTRATION_AGE', label: 'Registration Age (days)', help: 'Player account must be at least this many days old.' },
  { value: 'GAME_CATEGORY', label: 'Game Category', help: 'Player must have played in this game category (e.g. "slots", "live-casino").' },
]

function ConditionRow({ condition, onChange, onRemove }: {
  condition: ConditionNode
  onChange: (c: ConditionNode) => void
  onRemove: () => void
}) {
  const condType = CONDITION_TYPES.find((t) => t.value === condition.type)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border p-3">
      <select
        value={condition.type ?? ''}
        onChange={(e) => onChange({ ...condition, type: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">Select type</option>
        {CONDITION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {condType && (
        <Tooltip content={condType.help}>
          <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 cursor-help" />
        </Tooltip>
      )}

      {condition.type === 'VIP_TIER' ? (
        <select
          value={String(condition.value ?? '')}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Select tier</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
      ) : (
        <input
          type={condition.type === 'MIN_DEPOSIT_GEL' || condition.type === 'REGISTRATION_AGE' ? 'number' : 'text'}
          value={String(condition.value ?? '')}
          onChange={(e) => onChange({ ...condition, value: condition.type === 'MIN_DEPOSIT_GEL' || condition.type === 'REGISTRATION_AGE' ? Number(e.target.value) : e.target.value })}
          placeholder="Value"
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        />
      )}

      <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function ConditionGroup({ node, onChange }: { node: ConditionNode; onChange: (n: ConditionNode) => void }) {
  const conditions = node.conditions ?? []

  const addCondition = () => {
    onChange({ ...node, conditions: [...conditions, { type: '', value: '' }] })
  }

  const addGroup = () => {
    onChange({ ...node, conditions: [...conditions, { operator: 'AND', conditions: [{ type: '', value: '' }] }] })
  }

  const updateCondition = (i: number, c: ConditionNode) => {
    const updated = [...conditions]
    updated[i] = c
    onChange({ ...node, conditions: updated })
  }

  const removeCondition = (i: number) => {
    onChange({ ...node, conditions: conditions.filter((_, j) => j !== i) })
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Match</span>
        <button
          onClick={() => onChange({ ...node, operator: node.operator === 'AND' ? 'OR' : 'AND' })}
          className="rounded-md bg-accent px-3 py-1 text-xs font-bold"
        >
          {node.operator ?? 'AND'}
        </button>
        <span className="text-xs text-muted-foreground">of the following</span>
        <Tooltip content="AND = all conditions must be true. OR = any one condition is enough.">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </Tooltip>
      </div>

      <div className="space-y-2">
        {conditions.map((c, i) => (
          c.operator ? (
            <ConditionGroup key={i} node={c} onChange={(n) => updateCondition(i, n)} />
          ) : (
            <ConditionRow key={i} condition={c} onChange={(n) => updateCondition(i, n)} onRemove={() => removeCondition(i)} />
          )
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={addCondition} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus className="h-3 w-3" /> Add Condition
        </button>
        <button onClick={addGroup} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
          <Plus className="h-3 w-3" /> Add Nested Group
        </button>
      </div>
    </div>
  )
}

function CsvUpload() {
  const store = useWizardStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return

      const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean)
      const hasHeader = lines[0]?.toLowerCase().includes('id') || lines[0]?.toLowerCase().includes('player')
      const dataLines = hasHeader ? lines.slice(1) : lines

      const ids: string[] = []
      for (const line of dataLines) {
        const firstCol = line.split(/[,;\t]/)[0]?.trim()
        if (firstCol) ids.push(firstCol)
      }

      if (ids.length === 0) {
        setParseError('No player IDs found in the file. Expected one ID per row, or a CSV with IDs in the first column.')
        return
      }

      store.setCsvPlayerIds(ids)
    }
    reader.readAsText(file)
  }, [store])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    if (text) {
      const ids = text.split(/[\r\n,;\t]+/).map((s) => s.trim()).filter(Boolean)
      if (ids.length > 0) {
        store.setCsvPlayerIds(ids)
      }
    }
  }, [store])

  const removeId = (idx: number) => {
    store.setCsvPlayerIds(store.csvPlayerIds.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drop a CSV file here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          File should contain player IDs — one per row, or as the first column in a CSV
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Or paste player IDs directly (one per line or comma-separated)</label>
        <textarea
          placeholder="player-id-1&#10;player-id-2&#10;player-id-3"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          onPaste={handlePaste}
          onChange={(e) => {
            const ids = e.target.value.split(/[\r\n,;\t]+/).map((s) => s.trim()).filter(Boolean)
            store.setCsvPlayerIds(ids)
          }}
          value={store.csvPlayerIds.join('\n')}
        />
      </div>

      {parseError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {parseError}
        </div>
      )}

      {store.csvPlayerIds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{store.csvPlayerIds.length} player{store.csvPlayerIds.length === 1 ? '' : 's'} loaded</span>
            </div>
            <button onClick={() => store.setCsvPlayerIds([])} className="text-xs text-muted-foreground hover:text-destructive">
              Clear all
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-md border border-border">
            {store.csvPlayerIds.slice(0, 50).map((id, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border px-3 py-1.5 last:border-0">
                <span className="text-xs font-mono text-muted-foreground">{id}</span>
                <button onClick={() => removeId(i)} className="rounded p-0.5 text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {store.csvPlayerIds.length > 50 && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                …and {store.csvPlayerIds.length - 50} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Step2Targeting() {
  const store = useWizardStore()
  const preview = useSegmentPreview()
  const [previewData, setPreviewData] = useState<{ matchingCount: number; totalPlayers: number; preview: { id: string; displayName: string }[] } | null>(null)

  const tree = store.conditionTree ?? { operator: 'AND' as const, conditions: [] }

  const updateTree = useCallback((newTree: ConditionNode) => {
    store.setTargeting(store.targetingMode, newTree)
  }, [store])

  useEffect(() => {
    if (store.targetingMode !== 'segment' || !store.conditionTree) return
    const conditions = store.conditionTree.conditions ?? []
    if (conditions.length === 0 || !conditions.some((c) => c.type && c.value)) return

    const timer = setTimeout(() => {
      preview.mutate(store.conditionTree as Record<string, unknown>, {
        onSuccess: setPreviewData,
      })
    }, 500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.conditionTree, store.targetingMode])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Player Targeting</h2>
        <p className="text-sm text-muted-foreground">
          Choose which players can participate in this promotion. You can target everyone, define dynamic rules, or upload a specific player list.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className={`cursor-pointer rounded-lg border p-4 transition-colors ${store.targetingMode === 'all' ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <input type="radio" name="targeting" className="sr-only" checked={store.targetingMode === 'all'} onChange={() => store.setTargeting('all', null)} />
          <Users className="h-5 w-5 text-primary mb-2" />
          <p className="font-medium text-sm">All Players</p>
          <p className="text-xs text-muted-foreground mt-1">Every registered player can participate</p>
        </label>

        <label className={`cursor-pointer rounded-lg border p-4 transition-colors ${store.targetingMode === 'segment' ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <input type="radio" name="targeting" className="sr-only" checked={store.targetingMode === 'segment'} onChange={() => store.setTargeting('segment', tree)} />
          <svg className="h-5 w-5 text-primary mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <p className="font-medium text-sm">Dynamic Segment</p>
          <p className="text-xs text-muted-foreground mt-1">Define rules (VIP tier, deposit amount, etc.)</p>
        </label>

        <label className={`cursor-pointer rounded-lg border p-4 transition-colors ${store.targetingMode === 'csv' ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <input type="radio" name="targeting" className="sr-only" checked={store.targetingMode === 'csv'} onChange={() => store.setTargeting('csv', null)} />
          <Upload className="h-5 w-5 text-primary mb-2" />
          <p className="font-medium text-sm">Upload Player List</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a CSV file with specific player IDs</p>
        </label>
      </div>

      {store.targetingMode === 'segment' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <ConditionGroup node={tree} onChange={updateTree} />
          </div>
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Segment Preview</span>
            </div>
            {preview.isPending ? (
              <p className="text-sm text-muted-foreground">Calculating...</p>
            ) : previewData ? (
              <>
                <p className="text-3xl font-bold text-primary">{previewData.matchingCount}</p>
                <p className="text-sm text-muted-foreground">of {previewData.totalPlayers} players match</p>
                {previewData.preview.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    {previewData.preview.map((p) => (
                      <p key={p.id} className="text-xs text-muted-foreground">{p.displayName}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Add conditions to see preview</p>
            )}
          </div>
        </div>
      )}

      {store.targetingMode === 'csv' && <CsvUpload />}
    </div>
  )
}
