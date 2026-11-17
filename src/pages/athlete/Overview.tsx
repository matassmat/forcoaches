import { cn, formatNum } from '@/lib/utils'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, ClipboardList, LineChart, Salad } from 'lucide-react'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import { listAthleteBookings } from '@/lib/booking'
import { listMeasurements } from '@/lib/measurements'
import { listFoodLog, sumMacros } from '@/lib/nutrition'
import { getAthleteMealPlan } from '@/lib/nutrition'
import { formatDateLt, hoursUntil, toDateKey } from '@/lib/time'
import { enter } from '@/lib/motion'
import { PageHeader } from '@/components/PageHeader'
import { todayLabel } from '@/lib/today'
import { ShortcutGrid, type Shortcut } from '@/components/ShortcutGrid'
import { Skeleton } from '@/components/ui/skeleton'

const shortcuts: Shortcut[] = [
  { to: '/sportininkas/rezervacijos', icon: CalendarCheck, title: 'Rezervacijos', text: 'Laisvi trenerio laikai' },
  { to: '/sportininkas/progresas', icon: LineChart, title: 'Progresas', text: 'Svoris ir apimtys' },
  { to: '/sportininkas/programa', icon: ClipboardList, title: 'Programa', text: 'Pratimai ir serijos' },
  { to: '/sportininkas/mityba', icon: Salad, title: 'Mityba', text: 'Dienos norma ir suvalgytas maistas' },
]

interface Summary {
  nextSession: string | null
  weight: number | null
  kcalToday: number
  kcalTarget: number | null
}

export function AthleteOverview() {
  const { athlete, loading: contextLoading } = useAthleteContext()
  const [summary, setSummary] = useState<Summary | null>(null)

  const load = useCallback(async () => {
    if (!athlete) return
    const today = toDateKey(new Date())
    try {
      const [bookings, measurements, log, plan] = await Promise.all([
        listAthleteBookings(athlete.id),
        listMeasurements(athlete.id),
        listFoodLog(athlete.id, today),
        getAthleteMealPlan(athlete.id),
      ])

      const upcoming = bookings
        .filter((b) => b.status !== 'cancelled' && hoursUntil(b.sessionDate, b.startTime) > 0)
        .sort((a, b) => (a.sessionDate + a.startTime).localeCompare(b.sessionDate + b.startTime))[0]

      const withWeight = measurements.filter((m) => m.weightKg != null)

      setSummary({
        nextSession: upcoming ? `${formatDateLt(upcoming.sessionDate)}, ${upcoming.startTime}` : null,
        weight: withWeight.length ? Number(withWeight[withWeight.length - 1].weightKg) : null,
        kcalToday: Math.round(sumMacros(log).kcal),
        kcalTarget: plan?.targetKcal ?? null,
      })
    } catch {
      // Apžvalga yra papildoma informacija, jei nepavyko, kortelės tiesiog
      // nerodomos, o nuorodos žemiau vis tiek veikia.
      setSummary(null)
    }
  }, [athlete])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <PageHeader title="Apžvalga" subtitle={todayLabel()} />

      {contextLoading ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: enter }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
        >
          <StatTile label="Artimiausia treniruotė" value={summary.nextSession ?? '-'} small />
          <StatTile label="Svoris" value={summary.weight != null ? formatNum(summary.weight, 1) : '-'} unit="kg" />
          <StatTile
            label="Šiandien suvalgyta"
            value={formatNum(summary.kcalToday)}
            unit={summary.kcalTarget ? `/ ${formatNum(summary.kcalTarget)} kcal` : 'kcal'}
          />
        </motion.div>
      )}

      <ShortcutGrid items={shortcuts} />
    </div>
  )
}

function StatTile({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <div className={cn('panel flex flex-col justify-between gap-4 p-4 sm:p-5', small && 'col-span-2 sm:col-span-1')}>
      <p className="eyebrow">{label}</p>
      <p className={small ? 'text-sm leading-5 text-foreground' : 'stat-num text-[28px] text-foreground'}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}
