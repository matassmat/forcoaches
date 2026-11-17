/**
 * Laikas visoje sistemoje yra „HH:MM" eilutė.
 *
 * Postgres `time` per PostgREST grįžta kaip „HH:MM:SS", o formos duoda „HH:MM".
 * Lyginant kaip eilutes tai tyliai nesutampa, Tutorly būtent dėl to viską
 * vertė į minutes. Ta pati taisyklė galioja ir čia.
 */

export function normalizeTime(t: string): string {
  return t.slice(0, 5)
}

export function timeToMinutes(t: string): number {
  const [h, m] = normalizeTime(t).split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Vietinė data „YYYY-MM-DD". toISOString() netinka, jis verčia į UTC. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const WEEKDAYS = [
  'Sekmadienis', 'Pirmadienis', 'Antradienis', 'Trečiadienis',
  'Ketvirtadienis', 'Penktadienis', 'Šeštadienis',
] as const

export const WEEKDAYS_SHORT = ['Sk', 'Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št'] as const

const MONTHS_GEN = [
  'sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio',
  'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio',
] as const

/** „14 spalio, antradienis", kilmininkas, kaip lietuviškai ir sakoma. */
export function formatDateLt(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${d} ${MONTHS_GEN[m - 1]}, ${WEEKDAYS[date.getDay()].toLowerCase()}`
}

export function formatDateShortLt(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number)
  return `${d} ${MONTHS_GEN[m - 1]}`
}

/** Kiek valandų liko iki treniruotės pradžios. Neigiama, ji jau praėjo. */
export function hoursUntil(dateKey: string, startTime: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const [hh, mm] = normalizeTime(startTime).split(':').map(Number)
  const start = new Date(y, m - 1, d, hh, mm)
  return (start.getTime() - Date.now()) / 3_600_000
}
