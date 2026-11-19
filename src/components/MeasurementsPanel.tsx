import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LineChart as LineChartIcon, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  changeFor, deleteMeasurement, listMeasurements, MEASURE_FIELDS, saveMeasurement,
  type MeasureKey,
} from '@/lib/measurements'
import { formatDateShortLt, toDateKey } from '@/lib/time'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNum } from '@/lib/utils'
import type { Measurement } from '@/types'
import { errorMessage } from '@/lib/errors'

// recharts yra ~105 kB gzip. Jis atsisiunčiamas tik atidarius progresą,
// o ne kraunant pradinį puslapį.
const MeasurementChart = lazy(() =>
  import('@/components/MeasurementChart').then((m) => ({ default: m.MeasurementChart }))
)

/**
 * Matavimų skydelis. Tas pats abiem rolėms, treneris ir sportininkas mato
 * ir įveda tą patį (RLS leidžia abiem), todėl atskiro puslapio nereikia.
 */
export function MeasurementsPanel({ athleteId, canEdit = true }: { athleteId: string; canEdit?: boolean }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<MeasureKey>('weightKg')
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setMeasurements(await listMeasurements(athleteId))
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti matavimų'))
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => { void load() }, [load])

  const handleDelete = async (id: string) => {
    const previous = measurements
    setMeasurements((list) => list.filter((m) => m.id !== id))
    try {
      await deleteMeasurement(id)
    } catch (e) {
      setMeasurements(previous)
      toast.error(errorMessage(e, 'Nepavyko ištrinti'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (measurements.length === 0) {
    return (
      <>
        <EmptyPanel
          icon={<LineChartIcon className="h-6 w-6" />}
          title="Matavimų dar nėra"
          text="Pirmas įrašas taps atskaitos tašku. Nuo jo bus skaičiuojamas pokytis."
          action={canEdit ? <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" />Įvesti matavimą</Button> : undefined}
        />
        <MeasurementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          athleteId={athleteId}
          onSaved={(m) => setMeasurements([m])}
        />
      </>
    )
  }

  const latest = measurements[measurements.length - 1]

  return (
    <div className="space-y-6">
      {/* Rodiklių kortelės, kiekviena rodo naujausią reikšmę ir pokytį. */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {MEASURE_FIELDS.map((field) => {
          const value = latest[field.key]
          const change = changeFor(measurements, field.key)
          const active = metric === field.key
          return (
            <motion.button
              key={field.key}
              variants={riseItem}
              type="button"
              onClick={() => setMetric(field.key)}
              aria-pressed={active}
              className={cn(
                'panel card-lift flex flex-col items-stretch justify-start p-4 text-left',
                active && 'border-foreground/30 bg-muted'
              )}
            >
              <p className="eyebrow">{field.label}</p>
              <p className="stat-num mt-2 text-2xl text-foreground">
                {value != null ? formatNum(Number(value), 1) : '-'}
                <span className="ml-1 text-xs font-medium text-muted-foreground">{field.unit}</span>
              </p>
              {change && (
                <p className={cn('mono mt-1 text-xs', change.delta <= 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {change.delta > 0 ? '+' : ''}{formatNum(change.delta, 1)}
                </p>
              )}
            </motion.button>
          )
        })}
      </motion.div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">{MEASURE_FIELDS.find((f) => f.key === metric)?.label} laike</p>
          {canEdit && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Naujas matavimas
            </Button>
          )}
        </div>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <MeasurementChart measurements={measurements} metric={metric} />
        </Suspense>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="eyebrow px-4 py-3 text-left">Data</th>
              {MEASURE_FIELDS.map((f) => (
                <th key={f.key} className="eyebrow px-3 py-3 text-right">{f.label}</th>
              ))}
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {[...measurements].reverse().map((m) => (
                <motion.tr
                  key={m.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: enter }}
                  exit={{ opacity: 0, transition: exit }}
                  className="border-b border-border last:border-0"
                >
                  <td className="mono whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateShortLt(m.measuredOn)}
                  </td>
                  {MEASURE_FIELDS.map((f) => (
                    <td key={f.key} className="mono px-3 py-3 text-right text-foreground">
                      {m[f.key] != null ? Number(m[f.key]).toLocaleString('lt-LT') : '·'}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="pr-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        aria-label={`Ištrinti ${m.measuredOn} matavimą`}
                        className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <MeasurementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        athleteId={athleteId}
        onSaved={(saved) =>
          setMeasurements((list) => {
            const without = list.filter((m) => m.id !== saved.id)
            return [...without, saved].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
          })
        }
      />
    </div>
  )
}

function MeasurementDialog({
  open,
  onOpenChange,
  athleteId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId: string
  onSaved: (measurement: Measurement) => void
}) {
  const [date, setDate] = useState(toDateKey(new Date()))
  const [values, setValues] = useState<Partial<Record<MeasureKey, string>>>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsed: Partial<Record<MeasureKey, number | null>> = {}
    let filled = 0
    for (const field of MEASURE_FIELDS) {
      const raw = values[field.key]?.trim()
      if (!raw) continue
      const num = Number(raw.replace(',', '.'))
      if (Number.isNaN(num)) {
        toast.error(`${field.label}: neteisingas skaičius`)
        return
      }
      parsed[field.key] = num
      filled++
    }
    if (filled === 0) {
      toast.error('Užpildykite bent vieną lauką')
      return
    }

    setSaving(true)
    try {
      onSaved(await saveMeasurement({ athleteId, measuredOn: date, values: parsed }))
      onOpenChange(false)
      setValues({})
      toast.success('Matavimas išsaugotas')
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko išsaugoti'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Naujas matavimas</DialogTitle>
          <DialogDescription>
            Pildyti visus laukus nebūtina. Tos pačios dienos įrašas perrašomas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-date">Data</Label>
            <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mono" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEASURE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`m-${field.key}`}>
                  {field.label} <span className="font-normal text-muted-foreground">{field.unit}</span>
                </Label>
                <Input
                  id={`m-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  className="mono"
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit" loading={saving}>Išsaugoti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
