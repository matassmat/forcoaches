import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enter, exit } from '@/lib/motion'
import { toDateKey, WEEKDAYS_SHORT } from '@/lib/time'
import { cn } from '@/lib/utils'

export interface CalendarEvent {
  dateKey: string
  label: string
  tone: 'free' | 'booked' | 'pending'
}

const MONTHS = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis',
] as const

const toneClass: Record<CalendarEvent['tone'], string> = {
  free: 'bg-primary text-primary-foreground',
  pending: 'bg-warning/15 text-warning',
  booked: 'bg-muted text-muted-foreground',
}

/** Mėnesio tinklelis. Savaitė prasideda pirmadieniu, kaip Lietuvoje. */
export function MonthCalendar({
  events,
  selected,
  onSelect,
}: {
  events: CalendarEvent[]
  selected: string | null
  onSelect: (dateKey: string) => void
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const todayKey = toDateKey(new Date())

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      map.set(event.dateKey, [...(map.get(event.dateKey) ?? []), event])
    }
    return map
  }, [events])

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    // getDay(): 0 = sekmadienis. Pirmadieniui pradedant reikia poslinkio.
    const lead = (first.getDay() + 6) % 7
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()

    const list: ({ key: string; day: number } | null)[] = Array.from({ length: lead }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      list.push({ key: toDateKey(new Date(cursor.year, cursor.month, day)), day })
    }
    return list
  }, [cursor])

  const shift = (delta: number) => {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg text-foreground">
          {MONTHS[cursor.month]} <span className="mono text-sm text-muted-foreground">{cursor.year}</span>
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Ankstesnis mėnuo">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Kitas mėnuo">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {[1, 2, 3, 4, 5, 6, 0].map((index) => (
          <div key={index} className="eyebrow py-1 text-center">{WEEKDAYS_SHORT[index]}</div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${cursor.year}-${cursor.month}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: enter }}
          exit={{ opacity: 0, y: -8, transition: exit }}
          className="grid grid-cols-7 gap-1"
        >
          {cells.map((cell, index) => {
            if (!cell) return <div key={`pad-${index}`} />

            const dayEvents = byDate.get(cell.key) ?? []
            const isToday = cell.key === todayKey
            const isSelected = cell.key === selected

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onSelect(cell.key)}
                className={cn(
                  'relative aspect-square rounded-md border p-1.5 text-left transition-colors duration-150',
                  isSelected
                    ? 'border-foreground/40 bg-muted'
                    : 'border-transparent hover:border-border hover:bg-muted/50',
                  dayEvents.length === 0 && 'text-muted-foreground'
                )}
              >
                <span className={cn('mono text-xs', isToday && 'font-medium text-foreground')}>{cell.day}</span>

                {dayEvents.length > 0 && (
                  <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <span key={i} className={cn('h-1.5 flex-1 rounded-full', toneClass[event.tone])} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
