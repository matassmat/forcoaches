import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ImageOff, Search } from 'lucide-react'
import {
  displayName, EQUIPMENT_LABELS, exerciseImageUrl, LEVEL_LABELS, loadExercises, MUSCLE_LABELS,
  searchExercises, type Equipment, type Exercise, type MuscleGroup,
} from '@/data/exercises'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { easeOutQuint } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Pratimų paieška su nuotraukomis. Paspaudus pratimą pirma parodoma, kaip jį
 * atlikti, treneris nerenka pratimo vien pagal pavadinimą.
 */
export function ExercisePicker({
  onPick,
  allowCustom = true,
}: {
  onPick: (name: string) => void
  allowCustom?: boolean
}) {
  const [all, setAll] = useState<Exercise[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [preview, setPreview] = useState<Exercise | null>(null)

  useEffect(() => {
    loadExercises().then(setAll).catch((e) => setError(e instanceof Error ? e.message : 'Klaida'))
  }, [])

  const results = useMemo(
    () => (all ? searchExercises(all, query, { muscle, equipment }) : []),
    [all, query, muscle, equipment]
  )

  if (preview) {
    return <ExerciseDetail exercise={preview} onBack={() => setPreview(null)} onPick={() => onPick(displayName(preview))} />
  }

  const trimmed = query.trim()
  const exact = results.some((r) => displayName(r).toLowerCase() === trimmed.toLowerCase())

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti pratimo…" className="pl-9" autoFocus />
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={muscle === null} onClick={() => setMuscle(null)}>Visos grupės</Chip>
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((key) => (
          <Chip key={key} active={muscle === key} onClick={() => setMuscle(muscle === key ? null : key)}>
            {MUSCLE_LABELS[key]}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={equipment === null} onClick={() => setEquipment(null)}>Visas inventorius</Chip>
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((key) => (
          <Chip key={key} active={equipment === key} onClick={() => setEquipment(equipment === key ? null : key)}>
            {EQUIPMENT_LABELS[key]}
          </Chip>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!all && !error && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {all && (
        <>
          <p className="mono text-xs text-muted-foreground">{results.length} pratimų</p>

          <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {allowCustom && trimmed && !exact && (
              <button
                type="button"
                onClick={() => onPick(trimmed)}
                className="w-full rounded-md border border-dashed border-border px-3 py-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted"
              >
                Pridėti savo: <span className="font-medium">{trimmed}</span>
              </button>
            )}

            {results.slice(0, 120).map((exercise, i) => (
              <Row key={exercise.id} exercise={exercise} index={i} onOpen={() => setPreview(exercise)} />
            ))}

            {results.length > 120 && (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                Rodoma 120 iš {results.length}, patikslinkite paiešką
              </p>
            )}

            {results.length === 0 && !trimmed && (
              <p className="px-1 py-4 text-sm text-muted-foreground">Pagal filtrus nieko nerasta.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Row({ exercise, index, onOpen }: { exercise: Exercise; index: number; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.012, 0.2), duration: 0.2, ease: easeOutQuint }}
      className="flex w-full items-center gap-3 rounded-md border border-transparent p-1.5 text-left transition-colors duration-150 hover:border-border hover:bg-muted"
    >
      <Thumb exercise={exercise} className="h-12 w-16" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{displayName(exercise)}</span>
        <span className="mono block truncate text-xs text-muted-foreground">
          {MUSCLE_LABELS[exercise.muscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
        </span>
      </span>
    </motion.button>
  )
}

function Thumb({ exercise, className }: { exercise: Exercise; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = exercise.images[0]

  if (!src || failed) {
    return (
      <span className={cn('grid shrink-0 place-items-center rounded bg-muted text-muted-foreground', className)}>
        <ImageOff className="h-4 w-4" />
      </span>
    )
  }

  return (
    <img
      src={exerciseImageUrl(src)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded object-cover', className)}
    />
  )
}

function ExerciseDetail({
  exercise, onBack, onPick,
}: {
  exercise: Exercise
  onBack: () => void
  onPick: () => void
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Atgal į sąrašą
      </button>

      <div>
        <h3 className="text-xl text-foreground">{displayName(exercise)}</h3>
        {exercise.nameLt && <p className="mono mt-1 text-xs text-muted-foreground">{exercise.name}</p>}
      </div>

      <div className="mono flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-foreground/10 px-2 py-1 text-foreground">{MUSCLE_LABELS[exercise.muscle]}</span>
        <span className="rounded bg-muted px-2 py-1 text-muted-foreground">{EQUIPMENT_LABELS[exercise.equipment]}</span>
        <span className="rounded bg-muted px-2 py-1 text-muted-foreground">{LEVEL_LABELS[exercise.level]}</span>
        {exercise.secondary.map((m) => (
          <span key={m} className="rounded bg-muted px-2 py-1 text-muted-foreground">+ {MUSCLE_LABELS[m]}</span>
        ))}
      </div>

      {exercise.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {exercise.images.slice(0, 2).map((img) => (
            <img
              key={img}
              src={exerciseImageUrl(img)}
              alt={`${displayName(exercise)}, atlikimas`}
              loading="lazy"
              className="w-full rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}

      {exercise.instructions.length > 0 && (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          <p className="eyebrow">Kaip atlikti</p>
          <ol className="space-y-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mono shrink-0 text-xs text-foreground">{String(i + 1).padStart(2, '0')}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <Button className="w-full" onClick={onPick}>Pridėti į programą</Button>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'mono rounded-md px-3 py-1 text-xs transition-colors duration-150',
        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
