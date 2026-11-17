import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Coins, Link2Off } from 'lucide-react'
import { toast } from 'sonner'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import { formatEur, listAthleteRecords, totals, type FinRecord } from '@/lib/finances'
import { formatDateShortLt } from '@/lib/time'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Sportininkas mato tik savo įrašus, nieko nekeičia, tik žino, kiek skolingas. */
export function AthleteFinances() {
  const { athlete, loading: contextLoading } = useAthleteContext()
  const [records, setRecords] = useState<FinRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!athlete) return
    try {
      setRecords(await listAthleteRecords(athlete.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko įkelti atsiskaitymų')
    } finally {
      setLoading(false)
    }
  }, [athlete])

  useEffect(() => { void load() }, [load])

  const t = useMemo(() => totals(records), [records])

  if (contextLoading || loading) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Atsiskaitymai" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Atsiskaitymai" />
        <EmptyPanel
          icon={<Link2Off className="h-6 w-6" />}
          title="Paskyra nesusieta su treneriu"
          text="Registruojantis nebuvo panaudotas pakvietimo kodas. Paprašykite trenerio naujo kodo."
        />
      </div>
    )
  }

  // Balansas skaičiuojamas trenerio pusėje: gauta − priskaičiuota.
  // Sportininkui prasmė atvirkštinė, todėl rodomas skolos dydis.
  const debt = -t.balance

  return (
    <div>
      <PageHeader
        title="Atsiskaitymai"
        subtitle="Ką treneris priskaičiavo ir ką jau sumokėjote"
      />

      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="mb-6 grid gap-3 sm:grid-cols-3"
      >
        <motion.div variants={riseItem} className="panel p-5">
          <p className="eyebrow">{debt > 0 ? 'Skola' : debt < 0 ? 'Permoka' : 'Būsena'}</p>
          <p className={cn(
            'stat-num mt-2 text-3xl',
            debt > 0 ? 'text-destructive' : 'text-positive'
          )}>
            {debt === 0 ? 'Atsiskaityta' : formatEur(Math.abs(debt))}
          </p>
        </motion.div>

        <motion.div variants={riseItem} className="panel p-5">
          <p className="eyebrow">Sumokėta</p>
          <p className="stat-num mt-2 text-3xl text-foreground">{formatEur(t.received)}</p>
        </motion.div>

        <motion.div variants={riseItem} className="panel p-5">
          <p className="eyebrow">Priskaičiuota</p>
          <p className="stat-num mt-2 text-3xl text-foreground">{formatEur(t.charged)}</p>
        </motion.div>
      </motion.div>

      {records.length === 0 ? (
        <EmptyPanel
          icon={<Coins className="h-6 w-6" />}
          title="Įrašų dar nėra"
          text="Kai treniruotė įvyks, treneris ją uždarys ir įrašas atsiras čia."
        />
      ) : (
        <div className="panel divide-y divide-border">
          <AnimatePresence initial={false}>
            {records.map((record) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: enter }}
                exit={{ opacity: 0, height: 0, transition: exit }}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <span className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-md',
                  record.type === 'credit' ? 'bg-muted text-positive' : 'bg-muted text-muted-foreground'
                )}>
                  {record.type === 'credit'
                    ? <ArrowDownRight className="h-4 w-4" />
                    : <ArrowUpRight className="h-4 w-4" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{record.description}</p>
                  <p className="mono text-xs text-muted-foreground">{formatDateShortLt(record.date)}</p>
                </div>

                {record.type === 'debit' && record.status === 'pending' && (
                  <Badge variant="warning">Neapmokėta</Badge>
                )}

                <span className={cn(
                  'mono shrink-0 text-sm font-medium',
                  record.type === 'credit' ? 'text-positive' : 'text-foreground'
                )}>
                  {record.type === 'credit' ? '−' : '+'}{formatEur(record.amount)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
