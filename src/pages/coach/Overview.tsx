import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck, ClipboardList, Salad, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { listAthletes } from '@/lib/athletes'
import { listCoachBookings } from '@/lib/booking'
import { listRecords, totals, formatEur } from '@/lib/finances'
import { formatDateLt, toDateKey } from '@/lib/time'
import { todayLabel } from '@/lib/today'
import { riseItem, staggerParent } from '@/lib/motion'
import { PageHeader } from '@/components/PageHeader'
import { ShortcutGrid, type Shortcut } from '@/components/ShortcutGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const shortcuts: Shortcut[] = [
  { to: '/treneris/sportininkai', icon: Users, title: 'Sportininkai', text: 'Pakvietimo kodai, kainos ir pastabos' },
  { to: '/treneris/kalendorius', icon: CalendarCheck, title: 'Kalendorius', text: 'Laisvi laikai ir suplanuotos treniruotės' },
  { to: '/treneris/programos', icon: ClipboardList, title: 'Programos', text: 'Treniruočių planai ir šablonai' },
  { to: '/treneris/mityba', icon: Salad, title: 'Mityba', text: 'Kalorijų normos ir valgiaraščiai' },
]

interface Summary {
  athletes: number
  pendingRequests: number
  nextSession: string | null
  unpaid: number
}

export function CoachOverview() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const today = toDateKey(new Date())

    try {
      const [athletes, bookings, records] = await Promise.all([
        listAthletes(user.id),
        listCoachBookings(user.id, { fromDate: today }),
        listRecords(user.id).catch(() => []),
      ])

      const upcoming = bookings
        .filter((b) => b.status === 'confirmed')
        .sort((a, b) => (a.sessionDate + a.startTime).localeCompare(b.sessionDate + b.startTime))[0]

      setSummary({
        athletes: athletes.filter((a) => a.status === 'active').length,
        pendingRequests: bookings.filter((b) => b.status === 'pending').length,
        nextSession: upcoming
          ? `${upcoming.athleteName} · ${formatDateLt(upcoming.sessionDate)}, ${upcoming.startTime}`
          : null,
        unpaid: totals(records).unpaid,
      })
    } catch {
      // Apžvalga yra papildoma informacija, jei nepavyko, nuorodos žemiau
      // vis tiek veikia.
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <PageHeader title="Apžvalga" subtitle={todayLabel()} />

      {loading ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : summary && (
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="visible"
          className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
        >
          <Tile label="Aktyvūs sportininkai" value={String(summary.athletes)} />
          <Tile
            label="Laukia patvirtinimo"
            value={String(summary.pendingRequests)}
            tone={summary.pendingRequests > 0 ? 'accent' : undefined}
            to="/treneris/rezervacijos"
          />
          <Tile label="Artimiausia treniruotė" value={summary.nextSession ?? '-'} small />
          <Tile
            label="Neapmokėta"
            value={formatEur(summary.unpaid)}
            wide
            to="/treneris/finansai"
          />
        </motion.div>
      )}

      <ShortcutGrid items={shortcuts} />
    </div>
  )
}

function Tile({
  label, value, small, wide, tone, to,
}: {
  label: string
  value: string
  small?: boolean
  /** Telefone per visą eilutę, kad neliktų vieno langelio pusėje. */
  wide?: boolean
  tone?: 'accent'
  to?: string
}) {
  const content = (
    <motion.div
      variants={riseItem}
      className={cn('panel flex h-full flex-col justify-between gap-4 p-4 sm:p-5', (small || wide) && 'col-span-2 sm:col-span-1', to && 'card-lift')}
    >
      <p className="eyebrow">{label}</p>
      <p className={cn(
        small ? 'text-sm leading-5 text-foreground' : 'stat-num text-[28px]',
        !small && (tone === 'accent' ? 'text-primary' : 'text-foreground')
      )}>
        {value}
      </p>
    </motion.div>
  )

  if (!to) return content
  return <Link to={to} className="block h-full rounded-[14px]">{content}</Link>
}
