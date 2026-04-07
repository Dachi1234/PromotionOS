'use client'

import { useWizardStore } from '@/stores/wizard-store'
import { slugify, formatDuration } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { DateTimePicker } from '@/components/ui/date-time-picker'

export default function Step1Basics() {
  const store = useWizardStore()

  const handleNameChange = (name: string) => {
    const updates: Record<string, string> = { name }
    if (!store.slug || store.slug === slugify(store.name)) {
      updates.slug = slugify(name)
    }
    store.updateBasics(updates)
  }

  const duration = store.startsAt && store.endsAt
    ? formatDuration(new Date(store.startsAt), new Date(store.endsAt))
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Campaign Basics</h2>
        <p className="text-sm text-muted-foreground">Set the core identity of your campaign</p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Campaign Name *
            <Tooltip content="This is the internal name your team sees. Players won't see this.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input
            type="text"
            value={store.name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={100}
            placeholder="Summer Mega Spin"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Slug *
            <Tooltip content="This becomes the URL path for the promotion page. Only lowercase letters, numbers, and hyphens.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input
            type="text"
            value={store.slug}
            onChange={(e) => store.updateBasics({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="summer-mega-spin"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            URL: promotions.operator.com/<span className="text-primary">{store.slug || 'your-slug'}</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Description
            <Tooltip content="Internal notes about this campaign's goals and mechanics.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <textarea
            value={store.description}
            onChange={(e) => store.updateBasics({ description: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="Describe the campaign..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{store.description.length}/500</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              Start Date & Time *
              <Tooltip content="Campaign will automatically activate at this time. Times are in your local timezone.">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <DateTimePicker
              value={store.startsAt}
              onChange={(v) => store.updateBasics({ startsAt: v })}
              placeholder="Select start date & time"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              End Date & Time *
              <Tooltip content="Campaign will automatically deactivate at this time. Times are in your local timezone.">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <DateTimePicker
              value={store.endsAt}
              onChange={(v) => store.updateBasics({ endsAt: v })}
              placeholder="Select end date & time"
              minDate={store.startsAt ? new Date(store.startsAt) : undefined}
            />
          </div>
        </div>

        {duration && (
          <div className="rounded-md bg-accent/50 px-3 py-2 text-sm">
            Campaign duration: <span className="font-medium text-primary">{duration}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Currency
            <Tooltip content="The currency used for all monetary rewards and thresholds in this campaign.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <select
            value={store.currency}
            onChange={(e) => store.updateBasics({ currency: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="GEL">GEL (Georgian Lari)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>
      </div>
    </div>
  )
}
