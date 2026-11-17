import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Trophy } from 'lucide-react'
import { listStrengthSummary, type StrengthSummary } from '@/lib/exerciseLogs'
import { errorMessage } from '@/lib/errors'
import { riseItem, staggerParent } from '@/lib/motion'
import { formatDateShortLt } from '@/lib/time'
import { cn, formatNum } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Jėgos rekordai: kiekvienam pratimui geriausias svoris, pokytis nuo
 * pirmos treniruotės ir maža kreivė. Duomenys iš pažymėtų serijų.
 */
export function StrengthRecords({ athleteId }: { athleteId: string }) {
  const [items, setItems] = useState<StrengthSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listStrengthSummary(athleteId)
      .then(setItems)
      .catch((e) => setError(errorMessage(e, 'Nepavyko įkelti rekordų')))
  }, [athleteId])

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg text-foreground">Jėgos rekordai</h2>
        <p className="text-xs text-muted-foreground">Iš pažymėtų serijų su svoriu</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!items && !error && <Skeleton className="h-40 w-full" />}

      {items && items.length === 0 && (
        <div className="panel flex items-start gap-3 p-5 text-sm text-muted-foreground">
          <Dumbbell className="mt-0.5 h-4 w-4 shrink-0" />
          Rekordai atsiras, kai programoje pažymėsite pirmas serijas su svoriu.
        </div>
      )}

      {items && items.length > 0 && (
        <motion.div variants={staggerParent} initial="hidden" animate="visible" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 12).map((item) => {
            const delta = item.last - item.first
            return (
              <motion.div key={item.name} variants={riseItem} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-foreground">{item.name}</p>
                  {item.best === item.last && item.sessions > 1 && (
                    <Trophy className="h-4 w-4 shrink-0 text-primary" aria-label="Naujas rekordas paskutinėje treniruotėje" />
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="stat-num text-2xl text-foreground">
                      {formatNum(item.best, 1)}<span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      rekordas {formatDateShortLt(item.bestOn)}
                      {item.sessions > 1 && (
                        <span className={cn('ml-1.5', delta > 0 ? 'text-positive' : 'text-muted-foreground')}>
                          {delta > 0 ? '+' : ''}{formatNum(delta, 1)} kg
                        </span>
                      )}
                    </p>
                  </div>
                  <Sparkline points={item.series.map((p) => p.weight)} />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </section>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const w = 96
  const h = 32
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const coords = points.map((v, i) => [(i / (points.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)] as const)
  const d = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = coords[coords.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="hsl(var(--primary))" />
    </svg>
  )
}
