'use client'

import { useState, useEffect, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minDate?: Date
}

function toDatetimeLocalString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick a date & time', minDate }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const parsed = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : null
  const selected = parsed && isValid(parsed) ? parsed : undefined

  const [hours, setHours] = useState(selected ? selected.getHours() : 12)
  const [minutes, setMinutes] = useState(selected ? selected.getMinutes() : 0)
  const [month, setMonth] = useState(selected ?? new Date())

  useEffect(() => {
    if (selected) {
      setHours(selected.getHours())
      setMinutes(selected.getMinutes())
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return
    const d = new Date(day)
    d.setHours(hours)
    d.setMinutes(minutes)
    onChange(toDatetimeLocalString(d))
  }

  const handleTimeChange = (h: number, m: number) => {
    setHours(h)
    setMinutes(m)
    if (selected) {
      const d = new Date(selected)
      d.setHours(h)
      d.setMinutes(m)
      onChange(toDatetimeLocalString(d))
    }
  }

  const quickSetToday = () => {
    const now = new Date()
    now.setHours(hours, minutes, 0, 0)
    onChange(toDatetimeLocalString(now))
    setMonth(now)
  }

  const quickSetTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(hours, minutes, 0, 0)
    onChange(toDatetimeLocalString(d))
    setMonth(d)
  }

  const quickSetNextWeek = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(hours, minutes, 0, 0)
    onChange(toDatetimeLocalString(d))
    setMonth(d)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
          'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !value && 'text-muted-foreground',
        )}
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        {selected ? (
          <span>{format(selected, 'MMM d, yyyy')} at {format(selected, 'HH:mm')}</span>
        ) : (
          <span>{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 rounded-xl border border-border bg-card shadow-xl shadow-black/20 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="flex">
            {/* Quick presets sidebar */}
            <div className="w-28 border-r border-border p-2 space-y-1">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground px-2 py-1">Quick pick</p>
              {[
                { label: 'Today', fn: quickSetToday },
                { label: 'Tomorrow', fn: quickSetTomorrow },
                { label: 'Next week', fn: quickSetNextWeek },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={q.fn}
                  className="w-full rounded-md px-2 py-1.5 text-xs text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleDaySelect}
                month={month}
                onMonthChange={setMonth}
                disabled={minDate ? { before: minDate } : undefined}
                showOutsideDays
                classNames={{
                  months: 'flex flex-col',
                  month: 'space-y-3',
                  month_caption: 'flex items-center justify-center relative h-8',
                  caption_label: 'text-sm font-semibold',
                  nav: 'flex items-center gap-1',
                  button_previous: 'absolute left-0 h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
                  button_next: 'absolute right-0 h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
                  month_grid: 'border-collapse',
                  weekdays: 'flex',
                  weekday: 'w-9 text-[11px] font-medium text-muted-foreground text-center',
                  week: 'flex mt-1',
                  day: 'relative p-0 text-center',
                  day_button: cn(
                    'h-9 w-9 rounded-md text-sm font-normal transition-all',
                    'hover:bg-accent hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:font-semibold aria-selected:shadow-sm',
                  ),
                  outside: 'text-muted-foreground/40',
                  disabled: 'text-muted-foreground/30 cursor-not-allowed',
                  today: 'font-bold text-primary',
                }}
                components={{
                  Chevron: ({ orientation }) =>
                    orientation === 'left'
                      ? <ChevronLeft className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />,
                }}
              />

              {/* Time picker */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Time</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <select
                      value={hours}
                      onChange={(e) => handleTimeChange(Number(e.target.value), minutes)}
                      className="h-8 w-14 rounded-md border border-input bg-background px-1 text-sm text-center appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="text-sm font-bold text-muted-foreground">:</span>
                    <select
                      value={minutes}
                      onChange={(e) => handleTimeChange(hours, Number(e.target.value))}
                      className="h-8 w-14 rounded-md border border-input bg-background px-1 text-sm text-center appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Done button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
