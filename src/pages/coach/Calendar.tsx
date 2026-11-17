import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays as addDaysFns, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { lt } from 'date-fns/locale'
import {
  CalendarCheck, ChevronLeft, ChevronRight, Download, Dumbbell, Sparkles, Trash2, Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { listAthletes } from '@/lib/athletes'
import {
  addSlots, deleteSlot, listSlots, mergeAdjacentSlots, removeBookedRangeKeepRemainder,
  type TimeSlot,
} from '@/lib/availability'
import {
  createBooking, listCoachBookings, rescheduleBooking, setBookingStatus, type BookingWithAthlete,
} from '@/lib/booking'
import { getCoachProfile } from '@/lib/coachProfile'
import { chargeForBooking } from '@/lib/finances'
import { toDateKey, formatDateLt } from '@/lib/time'
import { WeekTimeGrid } from '@/components/calendar/WeekTimeGrid'
import {
  TONE, toMinutes, type CalendarEvent, type DragMode, type ViewType,
} from '@/components/calendar/grid'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { todayLabel } from '@/lib/today'
import type { AthleteProfile, BookingStatus } from '@/types'
import { errorMessage } from '@/lib/errors'

const toneForStatus: Record<BookingStatus, CalendarEvent['tone']> = {
  pending: 'pending',
  confirmed: 'confirmed',
  completed: 'done',
  cancelled: 'cancelled',
  no_show: 'cancelled',
}

/** .ics failas, kad treniruotės atsirastų telefono kalendoriuje. */
function buildIcs(bookings: BookingWithAthlete[]): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = (() => {
    const now = new Date()
    return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  })()

  const asLocal = (date: string, time: string) => {
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    return `TZID=Europe/Vilnius:${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`
  }

  const events = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .map((b) => [
      'BEGIN:VEVENT',
      `UID:forcoaches-${b.id}@forcoaches.lt`,
      `DTSTAMP:${stamp}`,
      `DTSTART;${asLocal(b.sessionDate, b.startTime)}`,
      `DTEND;${asLocal(b.sessionDate, b.endTime)}`,
      `SUMMARY:Treniruotė, ${b.athleteName}`,
      b.location ? `LOCATION:${b.location}` : '',
      b.notes ? `DESCRIPTION:${b.notes.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ForCoaches//Treniruotes//LT',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:ForCoaches treniruotės',
    'X-WR-TIMEZONE:Europe/Vilnius',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function CoachCalendar() {
  const { user } = useAuth()
  const [cursor, setCursor] = useState(() => new Date())
  // Telefone septynios kolonos per siauros, todėl pradedama nuo dienos.
  const [view, setView] = useState<ViewType>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches ? 'day' : 'week'
  )
  const [dragMode, setDragMode] = useState<DragMode>('slot')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [bookings, setBookings] = useState<BookingWithAthlete[]>([])
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [sessionMinutes, setSessionMinutes] = useState(60)
  const [defaultPrice, setDefaultPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [newSession, setNewSession] = useState<{ date: string; startTime: string; endTime: string } | null>(null)
  const gridScroll = useRef<HTMLDivElement>(null)

  const dates = useMemo(() => {
    if (view === 'day') return [toDateKey(cursor)]
    if (view === 'week') {
      const from = startOfWeek(cursor, { weekStartsOn: 1 })
      return eachDayOfInterval({ start: from, end: endOfWeek(cursor, { weekStartsOn: 1 }) }).map(toDateKey)
    }
    const from = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const to = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: from, end: to }).map(toDateKey)
  }, [cursor, view])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const from = dates[0]
      const to = dates[dates.length - 1]
      const [slotList, bookingList, athleteList, profile] = await Promise.all([
        listSlots(user.id, { fromDate: from, toDate: to }),
        listCoachBookings(user.id, { fromDate: from, toDate: to }),
        listAthletes(user.id),
        getCoachProfile(user.id),
      ])
      setSlots(slotList)
      setBookings(bookingList)
      setAthletes(athleteList)
      if (profile) {
        setSessionMinutes(profile.defaultSessionMinutes)
        setDefaultPrice(profile.defaultSessionPrice)
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti kalendoriaus'))
    } finally {
      setLoading(false)
    }
  }, [user, dates])

  useEffect(() => { void load() }, [load])

  // Pirmą kartą parodžius savaitę, tinklelis nuslenkamas prie darbo dienos
  // pradžios, kitaip matosi tuščios nakties valandos.
  useEffect(() => {
    if (loading || view === 'month' || !gridScroll.current) return
    gridScroll.current.scrollTop = 2 * 64 - 12 // valandos etiketė lieka matoma
  }, [loading, view])

  const events = useMemo<CalendarEvent[]>(() => [
    ...slots.map((s) => ({
      id: `slot:${s.id}`,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      type: 'slot' as const,
      label: 'Laisva',
      sub: s.endTime,
      tone: 'free' as const,
    })),
    ...bookings.map((b) => ({
      id: `session:${b.id}`,
      date: b.sessionDate,
      startTime: b.startTime,
      endTime: b.endTime,
      type: b.status === 'pending' ? ('request' as const) : ('session' as const),
      label: b.athleteName,
      sub: b.location ?? `${b.startTime}–${b.endTime}`,
      tone: toneForStatus[b.status],
    })),
  ], [slots, bookings])

  const rangeLabel = useMemo(() => {
    if (view === 'day') return todayLabel(cursor)
    if (view === 'month') {
      const month = format(cursor, 'LLLL yyyy', { locale: lt })
      return month.charAt(0).toUpperCase() + month.slice(1)
    }
    const from = startOfWeek(cursor, { weekStartsOn: 1 })
    const to = endOfWeek(cursor, { weekStartsOn: 1 })
    // „Lapkričio 16-22“, o per mėnesių sandūrą „Lapkričio 30 - gruodžio 6“
    const fromLabel = todayLabel(from).split(', ')[1]
    const toLabel = from.getMonth() === to.getMonth() ? String(to.getDate()) : ` ${todayLabel(to).split(', ')[1]}`
    const sep = from.getMonth() === to.getMonth() ? '-' : ' -'
    const label = `${fromLabel}${sep}${toLabel}`
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [cursor, view])

  const shift = (delta: number) => {
    setCursor((c) => {
      if (view === 'month') return delta > 0 ? addMonths(c, 1) : subMonths(c, 1)
      return addDaysFns(c, delta * (view === 'week' ? 7 : 1))
    })
  }

  /** Vilkimas tinklelyje: arba naujas laisvas laikas, arba treniruotė. */
  const handleCreate = async (dateFrom: string, startTime: string, endTime: string, dateTo?: string) => {
    if (!user) return

    if (dragMode === 'session') {
      if (athletes.length === 0) {
        toast.error('Pirma pridėkite sportininką')
        return
      }
      setNewSession({ date: dateFrom, startTime, endTime })
      return
    }

    try {
      const span = dateTo && dateTo !== dateFrom
      const count = await addSlots({
        coachId: user.id,
        date: dateFrom,
        startTime,
        endTime,
        // Vilkimas per kelias dienas: tas pats laikas kiekvienai dienai.
        recurringDays: span ? [0, 1, 2, 3, 4, 5, 6] : undefined,
        until: dateTo,
      })
      await mergeAdjacentSlots(user.id, dateFrom)
      toast.success(count > 1 ? `Pridėta ${count} laisvų laikų` : `Laisva ${startTime}–${endTime}`)
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko pridėti'))
    }
  }

  const handleMove = async (eventId: string, date: string, startTime: string, endTime: string) => {
    if (!user) return
    const [kind, id] = eventId.split(':')
    try {
      if (kind === 'slot') {
        await deleteSlot(id)
        await addSlots({ coachId: user.id, date, startTime, endTime })
        await mergeAdjacentSlots(user.id, date)
      } else {
        await rescheduleBooking(id, date, startTime, endTime)
      }
      toast.success('Perkelta')
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko perkelti'))
    }
  }

  const handleTidy = async () => {
    if (!user) return
    try {
      const days = [...new Set(slots.map((s) => s.date))]
      for (const day of days) await mergeAdjacentSlots(user.id, day)
      toast.success('Laisvi laikai sutvarkyti')
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko sutvarkyti'))
    }
  }

  const handleIcs = () => {
    const blob = new Blob([buildIcs(bookings)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'forcoaches.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Kalendorius"
        subtitle="Tempkite per tuščią laiką, kad sukurtumėte laisvą langą. Bloką galima perkelti tempiant."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleIcs}>
              <Download className="h-4 w-4" />
              .ics
            </Button>
            <Button variant="outline" size="sm" onClick={handleTidy}>
              <Wand2 className="h-4 w-4" />
              Sutvarkyti laikus
            </Button>
          </div>
        }
      />

      {/* Valdymo juosta */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Šiandien</Button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Atgal">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-foreground sm:min-w-[11rem] sm:flex-none">{rangeLabel}</span>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Pirmyn">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {/* Ką kuria vilkimas */}
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {([['slot', 'Laisvas laikas', Sparkles], ['session', 'Treniruotė', Dumbbell]] as const).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDragMode(mode)}
                aria-pressed={dragMode === mode}
                className={cn(
                  'mono inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors duration-150',
                  dragMode === mode ? 'bg-card text-foreground shadow-[0_0_0_1px_hsl(var(--border))]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-md bg-muted p-1">
            {([['month', 'Mėnuo'], ['week', 'Savaitė'], ['day', 'Diena']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  'mono rounded px-3 py-1.5 text-xs transition-colors duration-150',
                  view === v ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap gap-4">
        {(['free', 'pending', 'confirmed', 'done'] as const).map((tone) => (
          <span key={tone} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE[tone].border }} />
            {TONE[tone].label}
          </span>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-[32rem] w-full" />
      ) : view === 'month' ? (
        <MonthGrid dates={dates} cursor={cursor} events={events} onPickDay={(d) => { setCursor(new Date(d)); setView('day') }} />
      ) : (
        <div className="panel overflow-hidden">
          {/* Dienų antraštės */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="w-14 shrink-0 border-r border-border" />
            {dates.map((d) => {
              const date = new Date(d)
              const isToday = d === toDateKey(new Date())
              return (
                <div key={d} className="flex-1 py-3 text-center" style={{ minWidth: 56 }}>
                  <p className="eyebrow">{format(date, 'EEEEEE', { locale: lt })}</p>
                  <p className={cn(
                    'stat-num mx-auto mt-1 grid h-7 w-7 place-items-center rounded-md text-sm',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}>
                    {format(date, 'd')}
                  </p>
                </div>
              )
            })}
          </div>

          <div ref={gridScroll} className="max-h-[34rem] overflow-y-auto">
            <WeekTimeGrid
              dates={dates}
              events={events}
              editable
              dragMode={dragMode}
              onEventClick={setSelected}
              onCreate={handleCreate}
              onMove={handleMove}
            />
          </div>
        </div>
      )}

      <EventDialog
        event={selected}
        bookings={bookings}
        onClose={() => setSelected(null)}
        onRepeat={async (event, weeks) => {
          if (!user) return
          const [y, m, d] = event.date.split('-').map(Number)
          const start = new Date(y, m - 1, d)
          const until = new Date(start)
          until.setDate(until.getDate() + weeks * 7)
          try {
            const count = await addSlots({
              coachId: user.id,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              recurringDays: [start.getDay()],
              until: toDateKey(until),
            })
            toast.success(`Laikas pakartotas ${Math.max(0, count - 1)} kart. į priekį`)
            setSelected(null)
            await load()
          } catch (e) {
            toast.error(errorMessage(e, 'Nepavyko pakartoti'))
          }
        }}
        onDeleteSlot={async (id) => {
          await deleteSlot(id)
          setSelected(null)
          toast.success('Laisvas laikas ištrintas')
          await load()
        }}
        onReschedule={async (event, date, startTime, endTime) => {
          const [kind, id] = event.id.split(':')
          await handleMove(`${kind}:${id}`, date, startTime, endTime)
          setSelected(null)
        }}
        onStatus={async (id, status) => {
          if (!user) return
          await setBookingStatus(id, status, { cancelledBy: status === 'cancelled' ? 'coach' : undefined })
          const booking = bookings.find((b) => b.id === id)

          // Įvykusi treniruotė virsta skola. Kaina imama iš rezervacijos,
          // o jeigu jos nėra, iš trenerio numatytosios.
          if (status === 'completed' && booking) {
            const charged = await chargeForBooking({
              coachId: user.id,
              athleteId: booking.athleteId,
              bookingId: booking.id,
              amount: booking.price ?? defaultPrice,
              date: booking.sessionDate,
            })
            if (!charged) {
              toast.warning('Kaina nenurodyta, todėl finansų įrašas nesukurtas.')
            }
          }

          if (status === 'confirmed' && booking) {
            await removeBookedRangeKeepRemainder({
              coachId: user.id,
              date: booking.sessionDate,
              startTime: booking.startTime,
              endTime: booking.endTime,
            })
          }
          setSelected(null)
          toast.success('Būsena pakeista')
          await load()
        }}
      />

      <NewSessionDialog
        draft={newSession}
        athletes={athletes}
        sessionMinutes={sessionMinutes}
        onClose={() => setNewSession(null)}
        onCreate={async (athleteId, price, location) => {
          if (!user || !newSession) return
          await createBooking({
            coachId: user.id,
            athleteId,
            sessionDate: newSession.date,
            startTime: newSession.startTime,
            endTime: newSession.endTime,
            status: 'confirmed',
            price,
            location,
          })
          await removeBookedRangeKeepRemainder({
            coachId: user.id,
            date: newSession.date,
            startTime: newSession.startTime,
            endTime: newSession.endTime,
          })
          setNewSession(null)
          toast.success('Treniruotė suplanuota')
          await load()
        }}
      />
    </div>
  )
}

// ── Mėnesio tinklelis ─────────────────────────────────────────────────

function MonthGrid({
  dates, cursor, events, onPickDay,
}: {
  dates: string[]
  cursor: Date
  events: CalendarEvent[]
  onPickDay: (dateKey: string) => void
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return map
  }, [events])

  const todayKey = toDateKey(new Date())

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'].map((d) => (
          <div key={d} className="eyebrow py-3 text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dates.map((dateKey) => {
          const date = new Date(dateKey)
          const dayEvents = (byDate.get(dateKey) ?? []).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
          const outside = !isSameMonth(date, cursor)

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onPickDay(dateKey)}
              className={cn(
                'min-h-[6rem] border-b border-r border-border p-1.5 text-left transition-colors duration-150 hover:bg-muted/50',
                outside && 'opacity-40'
              )}
            >
              <span className={cn(
                'mono grid h-6 w-6 place-items-center rounded text-xs',
                dateKey === todayKey ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground'
              )}>
                {format(date, 'd')}
              </span>

              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <p
                    key={e.id}
                    className="mono truncate rounded px-1 text-[11px] leading-4"
                    style={{ backgroundColor: TONE[e.tone].bg, color: TONE[e.tone].text }}
                  >
                    {e.startTime} {e.label}
                  </p>
                ))}
                {dayEvents.length > 3 && (
                  <p className="mono px-1 text-[11px] text-muted-foreground">+{dayEvents.length - 3}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Dialogai ──────────────────────────────────────────────────────────

function EventDialog({
  event, bookings, onClose, onDeleteSlot, onStatus, onReschedule, onRepeat,
}: {
  event: CalendarEvent | null
  bookings: BookingWithAthlete[]
  onClose: () => void
  onRepeat: (event: CalendarEvent, weeks: number) => Promise<void>
  onDeleteSlot: (id: string) => Promise<void>
  onStatus: (id: string, status: BookingStatus) => Promise<void>
  onReschedule: (event: CalendarEvent, date: string, startTime: string, endTime: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [weeks, setWeeks] = useState(4)

  // Laukai atstatomi kaskart atidarius kitą bloką.
  useEffect(() => {
    if (!event) return
    setDate(event.date)
    setStartTime(event.startTime)
    setEndTime(event.endTime)
  }, [event])

  if (!event) return null

  const [kind, id] = event.id.split(':')
  const booking = kind === 'session' ? bookings.find((b) => b.id === id) : undefined
  const changed = date !== event.date || startTime !== event.startTime || endTime !== event.endTime
  const valid = endTime > startTime

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === 'slot' ? 'Laisvas laikas' : event.label}</DialogTitle>
          <DialogDescription>{formatDateLt(event.date)}</DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={
              booking.status === 'confirmed' ? 'success'
                : booking.status === 'pending' ? 'warning'
                : booking.status === 'cancelled' || booking.status === 'no_show' ? 'destructive'
                : 'secondary'
            }>
              {TONE[toneForStatus[booking.status]].label}
            </Badge>
            {booking.price != null && <span className="mono text-muted-foreground">{booking.price} €</span>}
            {booking.location && <span className="text-muted-foreground">{booking.location}</span>}
          </div>
        )}

        {/* Laiką galima pataisyti čia, nereikia trinti ir kurti iš naujo. */}
        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="eyebrow">Laikas</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="ev-date">Data</Label>
              <Input id="ev-date" type="date" className="mono" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-start">Nuo</Label>
              <Input id="ev-start" type="time" className="mono" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">Iki</Label>
              <Input id="ev-end" type="time" className="mono" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {!valid && <p className="text-xs text-destructive">Pabaiga turi būti vėliau už pradžią.</p>}

          <Button
            className="w-full"
            disabled={!changed || !valid}
            loading={busy}
            onClick={() => run(() => onReschedule(event, date, startTime, endTime))}
          >
            Išsaugoti laiką
          </Button>
        </div>

        {kind === 'slot' && (
          <div className="space-y-3 rounded-md border border-border p-4">
            <p className="eyebrow">Kartoti kas savaitę</p>
            <div className="flex flex-wrap items-center gap-2">
              {[2, 4, 8, 12].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeeks(w)}
                  aria-pressed={weeks === w}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs transition-colors duration-150',
                    weeks === w ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {w} sav.
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full" loading={busy} onClick={() => run(() => onRepeat(event, weeks))}>
              Pakartoti {weeks} savaitėms į priekį
            </Button>
          </div>
        )}

        <DialogFooter>
          {kind === 'slot' ? (
            <Button variant="destructive" loading={busy} onClick={() => run(() => onDeleteSlot(id))}>
              <Trash2 className="h-4 w-4" />
              Ištrinti
            </Button>
          ) : booking && (
            <div className="flex flex-wrap gap-2">
              {booking.status === 'pending' && (
                <Button loading={busy} onClick={() => run(() => onStatus(id, 'confirmed'))}>
                  <CalendarCheck className="h-4 w-4" />
                  Patvirtinti
                </Button>
              )}
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <>
                  <Button variant="outline" loading={busy} onClick={() => run(() => onStatus(id, 'completed'))}>Įvyko</Button>
                  <Button variant="outline" loading={busy} onClick={() => run(() => onStatus(id, 'no_show'))}>Neatvyko</Button>
                  <Button variant="ghost" loading={busy} onClick={() => run(() => onStatus(id, 'cancelled'))}>Atšaukti</Button>
                </>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewSessionDialog({
  draft, athletes, sessionMinutes, onClose, onCreate,
}: {
  draft: { date: string; startTime: string; endTime: string } | null
  athletes: AthleteProfile[]
  sessionMinutes: number
  onClose: () => void
  onCreate: (athleteId: string, price: number | null, location: string | null) => Promise<void>
}) {
  const [athleteId, setAthleteId] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)

  // Kainą ir vietą užpildome iš sportininko kortelės, treneris jų
  // dažniausiai nekeičia kiekvienai treniruotei.
  useEffect(() => {
    const athlete = athletes.find((a) => a.id === athleteId)
    if (!athlete) return
    setPrice(athlete.sessionPrice != null ? String(athlete.sessionPrice) : '')
    setLocation(athlete.location ?? '')
  }, [athleteId, athletes])

  if (!draft) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nauja treniruotė</DialogTitle>
          <DialogDescription>
            {formatDateLt(draft.date)} · {draft.startTime}–{draft.endTime}
            {toMinutes(draft.endTime) - toMinutes(draft.startTime) !== sessionMinutes &&
              ` (numatyta ${sessionMinutes} min.)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ns-athlete">Sportininkas</Label>
            <select
              id="ns-athlete"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/25"
            >
              <option value="">- pasirinkite -</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'Be vardo'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ns-price">Kaina, €</Label>
              <Input id="ns-price" inputMode="decimal" className="mono" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ns-loc">Vieta</Label>
              <Input id="ns-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="pvz. Ozo g. salė" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Atšaukti</Button>
          <Button
            loading={busy}
            disabled={!athleteId}
            onClick={async () => {
              setBusy(true)
              try {
                const num = price.trim() ? Number(price.replace(',', '.')) : null
                await onCreate(athleteId, Number.isNaN(num as number) ? null : num, location.trim() || null)
              } finally {
                setBusy(false)
              }
            }}
          >
            Suplanuoti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
