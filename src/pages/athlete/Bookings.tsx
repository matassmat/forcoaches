import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, CalendarX, Link2Off } from 'lucide-react'
import { toast } from 'sonner'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import {
  bookableWindows, listSlots, restoreSlotRange, type BookableWindow,
} from '@/lib/availability'
import { createBooking, listAthleteBookings, listCoachBookings, setBookingStatus } from '@/lib/booking'
import { formatDateLt, hoursUntil, toDateKey } from '@/lib/time'
import { notify } from '@/hooks/useNotifications'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { MonthCalendar, type CalendarEvent } from '@/components/MonthCalendar'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Booking, BookingStatus } from '@/types'

const statusMeta: Record<BookingStatus, { text: string; variant: 'warning' | 'success' | 'secondary' | 'destructive' }> = {
  pending: { text: 'Laukia patvirtinimo', variant: 'warning' },
  confirmed: { text: 'Patvirtinta', variant: 'success' },
  completed: { text: 'Įvyko', variant: 'secondary' },
  cancelled: { text: 'Atšaukta', variant: 'destructive' },
  no_show: { text: 'Neatvyko', variant: 'destructive' },
}

export function AthleteBookings() {
  const { athlete, coach, loading: contextLoading } = useAthleteContext()
  const [windows, setWindows] = useState<BookableWindow[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = toDateKey(new Date())

  const load = useCallback(async () => {
    if (!athlete) return
    try {
      // Trenerio rezervacijos reikalingos ir čia: laikas užimtas ir tada,
      // kai jį pasiėmė kitas sportininkas.
      const [slotList, coachBookings, mine] = await Promise.all([
        listSlots(athlete.coachId, { fromDate: today, onlyFree: true }),
        listCoachBookings(athlete.coachId, { fromDate: today }),
        listAthleteBookings(athlete.id),
      ])
      setBookings(mine)
      setWindows(bookableWindows({
        slots: slotList,
        bookings: coachBookings,
        sessionMinutes: coach?.defaultSessionMinutes ?? 60,
        minLeadHours: 1,
      }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko įkelti laisvų laikų')
    } finally {
      setLoading(false)
    }
  }, [athlete, coach, today])

  useEffect(() => { void load() }, [load])

  const upcoming = useMemo(
    () => bookings.filter((b) => hoursUntil(b.sessionDate, b.startTime) > 0 && b.status !== 'cancelled'),
    [bookings]
  )
  const past = useMemo(
    () => bookings.filter((b) => hoursUntil(b.sessionDate, b.startTime) <= 0 || b.status === 'cancelled'),
    [bookings]
  )

  const events = useMemo<CalendarEvent[]>(
    () => windows.map((w) => ({ dateKey: w.dateKey, label: w.startTime, tone: 'free' as const })),
    [windows]
  )

  const handleBook = async (window: BookableWindow) => {
    if (!athlete) return
    const key = `${window.dateKey}${window.startTime}`
    setBusy(key)
    try {
      // Langas nežymimas visas, rezervuojamas tik šis ruožas. Nuo dvigubo
      // užėmimo saugo bookings_no_overlap_idx, o ne mūsų patikra.
      const created = await createBooking({
        coachId: athlete.coachId,
        athleteId: athlete.id,
        sessionDate: window.dateKey,
        startTime: window.startTime,
        endTime: window.endTime,
        price: coach?.defaultSessionPrice || null,
      })
      setBookings((list) => [created, ...list])
      setWindows((list) => list.filter((w) => `${w.dateKey}${w.startTime}` !== key))

      await notify({
        userId: athlete.coachId,
        type: 'booking_requested',
        title: 'Naujas rezervacijos prašymas',
        message: `${formatDateLt(window.dateKey)} · ${window.startTime}-${window.endTime}`,
      })

      toast.success('Prašymas išsiųstas treneriui')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko užsirašyti')
      await load()
    } finally {
      setBusy(null)
    }
  }

  const handleCancel = async (target: Booking) => {
    if (!athlete) return
    const deadline = coach?.cancellationHoursBefore ?? 24
    if (hoursUntil(target.sessionDate, target.startTime) < deadline) {
      toast.error(`Atšaukti galima likus bent ${deadline} val. iki treniruotės`)
      return
    }
    setBusy(target.id)
    try {
      await setBookingStatus(target.id, 'cancelled', { cancelledBy: 'athlete' })
      // Patvirtinta treniruotė jau buvo iškirpta iš laisvų langų, laiką
      // grąžinam atgal ir sujungiam su gretimais.
      if (target.status === 'confirmed') {
        await restoreSlotRange(athlete.coachId, target.sessionDate, target.startTime, target.endTime)
      }
      await notify({
        userId: athlete.coachId,
        type: 'booking_cancelled',
        title: 'Sportininkas atšaukė treniruotę',
        message: `${formatDateLt(target.sessionDate)} · ${target.startTime}-${target.endTime}`,
      })

      toast.success('Treniruotė atšaukta')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko atšaukti')
    } finally {
      setBusy(null)
    }
  }

  if (contextLoading || loading) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Rezervacijos" />
        <Skeleton className="h-[26rem] w-full" />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Rezervacijos" />
        <EmptyPanel
          icon={<Link2Off className="h-6 w-6" />}
          title="Paskyra nesusieta su treneriu"
          text="Registruojantis nebuvo panaudotas pakvietimo kodas. Paprašykite trenerio naujo kodo."
        />
      </div>
    )
  }

  const dayWindows = selectedDate ? windows.filter((w) => w.dateKey === selectedDate) : []

  return (
    <div>
      <PageHeader
        title="Rezervacijos"
        subtitle={`Atšaukti galima likus ${coach?.cancellationHoursBefore ?? 24} val. iki treniruotės.`}
      />

      <Tabs defaultValue="free">
        <TabsList className="mb-6">
          <TabsTrigger value="free">Laisvi laikai</TabsTrigger>
          <TabsTrigger value="mine">Manosios{upcoming.length > 0 ? ` (${upcoming.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="free">
          {windows.length === 0 ? (
            <EmptyPanel
              icon={<CalendarX className="h-6 w-6" />}
              title="Laisvų laikų nėra"
              text="Treneris dar nepaskelbė laisvų laikų. Užsukite vėliau."
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
              <MonthCalendar events={events} selected={selectedDate} onSelect={setSelectedDate} />

              <div>
                {!selectedDate ? (
                  <EmptyPanel
                    icon={<CalendarClock className="h-6 w-6" />}
                    title="Pasirinkite dieną"
                    text="Dienos su laisvais laikais kalendoriuje pažymėtos brūkšneliu."
                  />
                ) : dayWindows.length === 0 ? (
                  <EmptyPanel
                    icon={<CalendarX className="h-6 w-6" />}
                    title="Šią dieną laisvų laikų nėra"
                    text="Pasirinkite kitą dieną kalendoriuje."
                  />
                ) : (
                  <motion.div
                    key={selectedDate}
                    variants={staggerParent}
                    initial="hidden"
                    animate="visible"
                    className="panel p-5"
                  >
                    <h2 className="mb-4 text-lg text-foreground">{formatDateLt(selectedDate)}</h2>
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence mode="popLayout">
                        {dayWindows.map((window) => {
                          const key = `${window.dateKey}${window.startTime}`
                          return (
                            <motion.button
                              key={key}
                              layout
                              variants={riseItem}
                              exit={{ opacity: 0, scale: 0.92, transition: exit }}
                              type="button"
                              disabled={busy !== null}
                              onClick={() => handleBook(window)}
                              className="btn-lift mono rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors duration-150 hover:border-foreground/40 hover:bg-muted disabled:opacity-50"
                            >
                              {busy === key ? '...' : `${window.startTime}-${window.endTime}`}
                            </motion.button>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {upcoming.length === 0 && past.length === 0 ? (
            <EmptyPanel
              icon={<CalendarClock className="h-6 w-6" />}
              title="Dar nesate užsirašę"
              text="Pasirinkite laisvą laiką gretimoje skiltyje. Treneriui iškart ateis prašymas."
            />
          ) : (
            <div className="space-y-8">
              {upcoming.length > 0 && (
                <section>
                  <p className="eyebrow mb-3">Artimiausios</p>
                  <div className="panel divide-y divide-border">
                    {upcoming.map((b) => (
                      <BookingRow key={b.id} booking={b} busy={busy === b.id} onCancel={() => handleCancel(b)} />
                    ))}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section>
                  <p className="eyebrow mb-3">Istorija</p>
                  <div className="panel divide-y divide-border opacity-70">
                    {past.map((b) => (
                      <BookingRow key={b.id} booking={b} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BookingRow({
  booking, busy, onCancel,
}: {
  booking: Booking
  busy?: boolean
  onCancel?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: enter }}
      className="flex flex-wrap items-center gap-3 p-4"
    >
      <span className="mono w-24 shrink-0 text-sm text-foreground">
        {booking.startTime}–{booking.endTime}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {formatDateLt(booking.sessionDate)}
      </span>
      <Badge variant={statusMeta[booking.status].variant}>{statusMeta[booking.status].text}</Badge>
      {onCancel && (
        <Button size="sm" variant="ghost" loading={busy} onClick={onCancel}>
          Atšaukti
        </Button>
      )}
    </motion.div>
  )
}
