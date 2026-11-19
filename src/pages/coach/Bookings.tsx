import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, Inbox, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { mergeAdjacentSlots, removeBookedRangeKeepRemainder } from '@/lib/availability'
import { listCoachBookings, setBookingStatus, type BookingWithAthlete } from '@/lib/booking'
import { getCoachProfile } from '@/lib/coachProfile'
import { chargeForBooking } from '@/lib/finances'
import { formatDateLt, hoursUntil, toDateKey } from '@/lib/time'
import { athleteUserIdFor, notify } from '@/hooks/useNotifications'
import { exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'

/**
 * Rezervacijos, tik sportininkų prašymai ir patvirtintos treniruotės,
 * kaip Tutorly. Laisvi laikai kuriami ir taisomi kalendoriuje, todėl
 * čia jų nėra: tas pats darbas dviejose vietose tik klaidina.
 */
export function CoachBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingWithAthlete[]>([])
  const [defaultPrice, setDefaultPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<BookingWithAthlete | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [list, profile] = await Promise.all([
        listCoachBookings(user.id, { fromDate: toDateKey(new Date()) }),
        getCoachProfile(user.id),
      ])
      setBookings(list)
      if (profile) setDefaultPrice(profile.defaultSessionPrice)
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti prašymų'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const requests = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings])
  const upcoming = useMemo(() => bookings.filter((b) => b.status === 'confirmed'), [bookings])

  const accept = async (request: BookingWithAthlete) => {
    if (!user) return
    setProcessing(request.id)
    try {
      await setBookingStatus(request.id, 'confirmed')

      // Patvirtinus laikas iškerpamas iš laisvų langų, o kraštuose likę
      // gabalai grąžinami, logika ta pati kaip Tutorly.
      await removeBookedRangeKeepRemainder({
        coachId: user.id,
        date: request.sessionDate,
        startTime: request.startTime,
        endTime: request.endTime,
      })

      const athleteUserId = await athleteUserIdFor(request.athleteId)
      if (athleteUserId) {
        await notify({
          userId: athleteUserId,
          type: 'booking_confirmed',
          title: 'Treniruotė patvirtinta',
          message: `${formatDateLt(request.sessionDate)} · ${request.startTime}-${request.endTime}`,
        })
      }

      toast.success('Treniruotė patvirtinta')
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko patvirtinti'))
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (request: BookingWithAthlete, reason: string) => {
    if (!user) return
    setProcessing(request.id)
    try {
      await setBookingStatus(request.id, 'cancelled', {
        cancelledBy: 'coach',
        notes: reason.trim() || undefined,
      })

      // Laisvas langas nebuvo keistas, prašymas jo nežymėjo. Sujungimas
      // vis tiek paleidžiamas: jis išvalo gabalėlius nuo ankstesnių iškirpimų.
      await mergeAdjacentSlots(user.id, request.sessionDate)

      const athleteUserId = await athleteUserIdFor(request.athleteId)
      if (athleteUserId) {
        await notify({
          userId: athleteUserId,
          type: 'booking_rejected',
          title: 'Prašymas atmestas',
          message: [
            `${formatDateLt(request.sessionDate)} · ${request.startTime}-${request.endTime}`,
            reason.trim(),
          ].filter(Boolean).join(', '),
        })
      }

      setRejectTarget(null)
      setRejectReason('')
      toast.success('Prašymas atmestas')
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko atmesti'))
    } finally {
      setProcessing(null)
    }
  }

  /** „Įvyko“ uždaro treniruotę ir sukuria priskaičiavimą finansuose. */
  const close = async (booking: BookingWithAthlete, status: 'completed' | 'no_show') => {
    if (!user) return
    setProcessing(booking.id)
    try {
      await setBookingStatus(booking.id, status)

      if (status === 'completed') {
        const charged = await chargeForBooking({
          coachId: user.id,
          athleteId: booking.athleteId,
          bookingId: booking.id,
          amount: booking.price ?? defaultPrice,
          date: booking.sessionDate,
        })
        if (!charged) {
          toast.warning('Kaina nenurodyta, todėl finansų įrašas nesukurtas. Nustatykite ją sportininko kortelėje arba nustatymuose.')
        }
      }

      toast.success(status === 'completed' ? 'Treniruotė uždaryta' : 'Pažymėta kaip neatvyko')
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko pakeisti'))
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Rezervacijos"
        subtitle="Sportininkų prašymai ir patvirtintos treniruotės. Laisvus laikus skelbiate kalendoriuje."
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="requests">
          <TabsList className="mb-6">
            <TabsTrigger value="requests">
              Prašymai{requests.length > 0 ? ` (${requests.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Patvirtintos{upcoming.length > 0 ? ` (${upcoming.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            {requests.length === 0 ? (
              <EmptyPanel
                icon={<Inbox className="h-6 w-6" />}
                title="Naujų prašymų nėra"
                text="Kai sportininkas užsirašys į laisvą laiką, prašymas atsiras čia."
              />
            ) : (
              <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {requests.map((request) => (
                    <BookingCard
                      key={request.id}
                      booking={request}
                      busy={processing === request.id}
                      onAccept={() => accept(request)}
                      onReject={() => setRejectTarget(request)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcoming.length === 0 ? (
              <EmptyPanel
                icon={<Clock className="h-6 w-6" />}
                title="Patvirtintų treniruočių nėra"
                text="Patvirtinę prašymą, čia pažymėsite, kad treniruotė įvyko. Tada ji atsiras finansuose."
              />
            ) : (
              <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {upcoming.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      busy={processing === booking.id}
                      confirmed
                      onComplete={() => close(booking, 'completed')}
                      onNoShow={() => close(booking, 'no_show')}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atmesti prašymą</DialogTitle>
            <DialogDescription>
              Priežastis nebūtina, bet sportininkui aiškiau, kodėl laikas netiko, ji ateis kartu su pranešimu.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="pvz. tuo metu jau turiu grupinę treniruotę"
            rows={3}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Atsisakyti</Button>
            <Button
              variant="destructive"
              loading={processing === rejectTarget?.id}
              onClick={() => rejectTarget && reject(rejectTarget, rejectReason)}
            >
              Atmesti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BookingCard({
  booking, busy, confirmed, onAccept, onReject, onComplete, onNoShow,
}: {
  booking: BookingWithAthlete
  busy: boolean
  confirmed?: boolean
  onAccept?: () => void
  onReject?: () => void
  onComplete?: () => void
  onNoShow?: () => void
}) {
  const passed = hoursUntil(booking.sessionDate, booking.startTime) <= 0

  const initials = booking.athleteName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  return (
    <motion.div
      layout
      variants={riseItem}
      exit={{ opacity: 0, scale: 0.97, transition: exit }}
      className="panel flex flex-wrap items-center gap-3 p-4"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground/10 text-sm font-medium text-foreground">
        {initials}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{booking.athleteName}</p>
        <p className="mono mt-1 text-xs text-muted-foreground">
          {formatDateLt(booking.sessionDate)} · {booking.startTime}-{booking.endTime}
        </p>
        {(booking.location || booking.price != null) && (
          <p className="mono mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {booking.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {booking.location}
              </span>
            )}
            {booking.price != null && <span className="text-foreground">{booking.price} €</span>}
          </p>
        )}
      </div>

      {confirmed && (
        <Badge variant={passed ? 'warning' : 'success'}>
          {passed ? 'Laikas praėjo' : 'Patvirtinta'}
        </Badge>
      )}

      <div className="flex shrink-0 flex-wrap gap-2">
        {onAccept && (
          <Button size="sm" loading={busy} onClick={onAccept}>
            <Check className="h-4 w-4" />
            Patvirtinti
          </Button>
        )}
        {onReject && (
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-4 w-4" />
            Atmesti
          </Button>
        )}
        {onComplete && (
          <Button size="sm" variant={passed ? 'default' : 'outline'} loading={busy} onClick={onComplete}>
            Įvyko
          </Button>
        )}
        {onNoShow && (
          <Button size="sm" variant="ghost" loading={busy} onClick={onNoShow}>
            Neatvyko
          </Button>
        )}
      </div>
    </motion.div>
  )
}
