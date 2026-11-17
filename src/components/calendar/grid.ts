/**
 * Kalendoriaus tinklelio matematika. Perkelta iš Tutorly `Calendar.tsx` -
 * ten ji pasitvirtino, tad nekuriama iš naujo.
 */

export const HOUR_PX = 64
export const START_HOUR = 6
export const END_HOUR = 23
export const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
export const TOTAL_PX = HOURS.length * HOUR_PX

export type ViewType = 'month' | 'week' | 'day'
export type DragMode = 'slot' | 'session'

export interface CalendarEvent {
  id: string
  date: string
  startTime: string
  endTime: string
  type: 'slot' | 'session' | 'request'
  label: string
  /** Antrinė eilutė kortelėje, vieta, kaina ir pan. */
  sub?: string
  tone: 'free' | 'confirmed' | 'pending' | 'done' | 'cancelled'
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const toHHMM = (h: number, m: number) => `${pad2(Math.min(h, END_HOUR))}:${pad2(m)}`

export const timeToPx = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return (h - START_HOUR + m / 60) * HOUR_PX
}

export function durationPx(start: string, end: string) {
  return Math.max((toMinutes(end) - toMinutes(start)) / 60 * HOUR_PX, 18)
}

/** Pikseliai → artimiausias 15 min. žingsnis. */
export function snapPx(px: number) {
  const clamped = Math.max(0, Math.min(px, TOTAL_PX))
  const mins = Math.round((clamped / HOUR_PX) * 60 / 15) * 15
  return { h: START_HOUR + Math.floor(mins / 60), m: mins % 60 }
}

export function hasOverlap(startA: string, endA: string, startB: string, endB: string) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB)
}

/** Spalvos pagal būseną, vienoje vietoje, kad tinklelis ir legenda nesiskirtų. */
export const TONE: Record<CalendarEvent['tone'], { bg: string; border: string; text: string; label: string }> = {
  // Laisvas laikas neutralus: tai dar ne treniruotė. Akcentas lieka
  // patvirtintoms, nes jos ir yra trenerio diena.
  free: {
    bg: 'hsl(var(--foreground) / 0.05)',
    border: 'hsl(var(--foreground) / 0.3)',
    text: 'hsl(var(--muted-foreground))',
    label: 'Laisvas laikas',
  },
  pending: {
    bg: 'hsl(var(--warning) / 0.14)',
    border: 'hsl(var(--warning))',
    text: 'hsl(var(--warning))',
    label: 'Laukia patvirtinimo',
  },
  confirmed: {
    bg: 'hsl(var(--primary) / 0.16)',
    border: 'hsl(var(--primary))',
    text: 'hsl(var(--primary))',
    label: 'Patvirtinta',
  },
  done: {
    bg: 'hsl(var(--muted-foreground) / 0.14)',
    border: 'hsl(var(--muted-foreground))',
    text: 'hsl(var(--muted-foreground))',
    label: 'Įvyko',
  },
  cancelled: {
    bg: 'hsl(var(--destructive) / 0.08)',
    border: 'hsl(var(--destructive))',
    text: 'hsl(var(--destructive))',
    label: 'Atšaukta',
  },
}

/**
 * Persidengiantys įvykiai dalinasi stulpelio plotį, kad nė vienas nebūtų
 * visiškai uždengtas.
 */
export function overlapLayout(events: CalendarEvent[]) {
  const meta = new Map<string, { left: number; width: number; z: number }>()

  for (const event of events) {
    const group = events
      .filter((other) => hasOverlap(event.startTime, event.endTime, other.startTime, other.endTime))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || a.id.localeCompare(b.id))

    const index = group.findIndex((g) => g.id === event.id)
    const columns = Math.max(group.length, 1)
    const width = 100 / columns
    meta.set(event.id, { left: index * width, width, z: 10 + index })
  }

  return meta
}
