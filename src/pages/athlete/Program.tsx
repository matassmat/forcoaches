import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExerciseInfoDialog, ExerciseThumb, useExerciseCatalog } from '@/components/exercise/ExerciseInfo'
import { RestTimer } from '@/components/RestTimer'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { ClipboardList, History, Link2Off } from 'lucide-react'
import { toast } from 'sonner'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import { getFullProgram, listAthletePrograms, type FullProgram } from '@/lib/programs'
import {
  listLogsForDay, listLogsForExercise, markSet, unmarkSetsFrom, type ExerciseLog,
} from '@/lib/exerciseLogs'
import { formatDateShortLt, toDateKey } from '@/lib/time'
import { enter, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ProgramExercise } from '@/types'
import { errorMessage } from '@/lib/errors'

export function AthleteProgram() {
  const { athlete, loading: contextLoading } = useAthleteContext()
  const [program, setProgram] = useState<FullProgram | null>(null)
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [historyFor, setHistoryFor] = useState<ProgramExercise | null>(null)
  const [infoName, setInfoName] = useState<string | null>(null)
  const [rest, setRest] = useState<{ seconds: number; label: string; startedAt: number } | null>(null)
  /** Šiandien keliamas svoris, jei skiriasi nuo trenerio nurodyto. */
  const [weights, setWeights] = useState<Record<string, string>>({})
  const catalog = useExerciseCatalog()
  const stopRest = useCallback(() => setRest(null), [])

  const today = toDateKey(new Date())

  const load = useCallback(async () => {
    if (!athlete) return
    try {
      const programs = await listAthletePrograms(athlete.id)
      const full = programs[0] ? await getFullProgram(programs[0].id) : null
      setProgram(full)
      setLogs(await listLogsForDay(athlete.id, today))
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti programos'))
    } finally {
      setLoading(false)
    }
  }, [athlete, today])

  useEffect(() => { void load() }, [load])

  /** Kiek serijų šiandien pažymėta kiekviename pratime. */
  const doneBySet = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of logs) {
      map.set(log.programExerciseId, Math.max(map.get(log.programExerciseId) ?? 0, log.setNumber))
    }
    return map
  }, [logs])

  const weightFor = (exercise: ProgramExercise) => {
    const raw = weights[exercise.id]
    if (raw == null || raw.trim() === '') return exercise.weightKg ?? null
    const parsed = Number(raw.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : exercise.weightKg ?? null
  }

  const toggleSet = async (exercise: ProgramExercise, setNumber: number) => {
    if (!athlete) return
    const done = doneBySet.get(exercise.id) ?? 0

    try {
      if (done === setNumber) {
        // Paspaudus paskutinę pažymėtą, ji nuimama.
        await unmarkSetsFrom({
          athleteId: athlete.id,
          programExerciseId: exercise.id,
          performedOn: today,
          fromSetNumber: setNumber,
        })
      } else {
        // Pažymima viskas iki paspaustos imtinai, taip, kaip iš tikrųjų
        // vyksta treniruotė: serijos daromos iš eilės.
        for (let n = done + 1; n <= setNumber; n++) {
          await markSet({
            athleteId: athlete.id,
            programExerciseId: exercise.id,
            performedOn: today,
            setNumber: n,
            weightKg: weightFor(exercise),
          })
        }
        // Poilsis tik tarp serijų: po paskutinės jo nebereikia.
        if (setNumber < exercise.sets) {
          setRest({ seconds: exercise.restSeconds ?? 90, label: `${setNumber} serija`, startedAt: Date.now() })
        } else {
          setRest(null)
        }
        if (setNumber < done) {
          await unmarkSetsFrom({
            athleteId: athlete.id,
            programExerciseId: exercise.id,
            performedOn: today,
            fromSetNumber: setNumber + 1,
          })
        }
      }
      setLogs(await listLogsForDay(athlete.id, today))
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko išsaugoti'))
    }
  }

  if (contextLoading || loading) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Treniruočių programa" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Treniruočių programa" />
        <EmptyPanel
          icon={<Link2Off className="h-6 w-6" />}
          title="Paskyra nesusieta su treneriu"
          text="Registruojantis nebuvo panaudotas pakvietimo kodas. Paprašykite trenerio naujo kodo."
        />
      </div>
    )
  }

  if (!program || program.days.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Treniruočių programa" />
        <EmptyPanel
          icon={<ClipboardList className="h-6 w-6" />}
          title="Programos dar nėra"
          text="Treneris jos dar nepriskyrė. Kai priskirs, ji atsiras čia."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={program.title}
        subtitle={program.description ?? 'Paspauskite pratimą, kad pamatytumėte, kaip jį atlikti. Pažymėjus seriją, prasideda poilsio laikmatis.'}
      />

      <Tabs defaultValue={program.days[0].id}>
        <TabsList className="mb-6 flex-wrap">
          {program.days.map((day) => (
            <TabsTrigger key={day.id} value={day.id}>{day.title}</TabsTrigger>
          ))}
        </TabsList>

        {program.days.map((day) => (
          <TabsContent key={day.id} value={day.id}>
            <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-3">
              {day.exercises.length === 0 && (
                <p className="text-sm text-muted-foreground">Šioje dienoje pratimų dar nėra.</p>
              )}

              {day.exercises.map((exercise, index) => {
                const done = doneBySet.get(exercise.id) ?? 0
                return (
                  <motion.div key={exercise.id} variants={riseItem} className="panel p-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setInfoName(exercise.name)}
                        aria-label={`${exercise.name}: kaip atlikti`}
                        className="relative shrink-0"
                      >
                        <ExerciseThumb item={catalog.ready ? catalog.find(exercise.name) : null} className="h-14 w-[4.5rem]" />
                        <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-card text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => setInfoName(exercise.name)} className="text-left font-medium text-foreground hover:text-primary">
                          {exercise.name}
                        </button>
                        <p className="mono mt-1 text-xs text-muted-foreground">
                          {exercise.sets} × {exercise.reps}
                          {exercise.weightKg != null && ` · ${exercise.weightKg} kg`}
                          {exercise.restSeconds != null && ` · poilsis ${exercise.restSeconds} s`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHistoryFor(exercise)}
                        aria-label={`${exercise.name} istorija`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="sr-only">Svoris šiandien, kg</span>
                        <Input
                          inputMode="decimal"
                          value={weights[exercise.id] ?? (exercise.weightKg != null ? String(exercise.weightKg) : '')}
                          onChange={(e) => setWeights((w) => ({ ...w, [exercise.id]: e.target.value }))}
                          placeholder="kg"
                          className="h-9 w-16 px-2 text-center text-xs tabular-nums"
                        />
                        kg
                      </label>
                      {Array.from({ length: exercise.sets }, (_, i) => {
                        const number = i + 1
                        const filled = number <= done
                        return (
                          <button
                            key={number}
                            type="button"
                            aria-label={`${number} serija`}
                            aria-pressed={filled}
                            onClick={() => toggleSet(exercise, number)}
                            className={cn(
                              'mono h-9 w-9 rounded-md border text-xs transition-colors duration-150',
                              filled
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground/25'
                            )}
                          >
                            {number}
                          </button>
                        )
                      })}

                      {done === exercise.sets && exercise.sets > 0 && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0, transition: enter }}
                          className="mono self-center pl-2 text-xs text-foreground"
                        >
                          atlikta
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      <HistoryDialog exercise={historyFor} athleteId={athlete.id} onClose={() => setHistoryFor(null)} />

      <ExerciseInfoDialog
        name={infoName}
        item={infoName ? catalog.find(infoName) : null}
        onClose={() => setInfoName(null)}
      />

      <RestTimer
        seconds={rest?.seconds ?? 0}
        label={rest?.label ?? ''}
        startedAt={rest?.startedAt ?? null}
        onDone={stopRest}
      />
    </div>
  )
}

function HistoryDialog({
  exercise, athleteId, onClose,
}: {
  exercise: ProgramExercise | null
  athleteId: string
  onClose: () => void
}) {
  const [logs, setLogs] = useState<ExerciseLog[] | null>(null)

  useEffect(() => {
    if (!exercise) { setLogs(null); return }
    listLogsForExercise(athleteId, exercise.id)
      .then(setLogs)
      .catch(() => setLogs([]))
  }, [exercise, athleteId])

  if (!exercise) return null

  // Sugrupuota pagal dieną: „3 serijos · 60 kg“.
  const byDay = new Map<string, ExerciseLog[]>()
  for (const log of logs ?? []) {
    byDay.set(log.performedOn, [...(byDay.get(log.performedOn) ?? []), log])
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
          <DialogDescription>Kiek serijų ir su kokiu svoriu atlikta anksčiau.</DialogDescription>
        </DialogHeader>

        {!logs ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : byDay.size === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Istorijos dar nėra.</p>
        ) : (
          <div className="max-h-72 divide-y divide-border overflow-y-auto">
            {[...byDay.entries()].map(([date, dayLogs]) => {
              const weights = dayLogs.map((l) => l.weightKg).filter((w): w is number => w != null)
              const max = weights.length ? Math.max(...weights) : null
              return (
                <div key={date} className="flex items-center gap-3 py-3">
                  <span className="mono w-20 shrink-0 text-xs text-muted-foreground">
                    {formatDateShortLt(date)}
                  </span>
                  <span className="mono flex-1 text-sm text-foreground">
                    {dayLogs.length} {dayLogs.length === 1 ? 'serija' : 'serijos'}
                  </span>
                  {max != null && <span className="mono text-sm text-foreground">{max} kg</span>}
                </div>
              )
            })}
          </div>
        )}

        <Button variant="outline" onClick={onClose}>Uždaryti</Button>
      </DialogContent>
    </Dialog>
  )
}
