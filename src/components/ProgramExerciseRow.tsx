import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateExercise } from '@/lib/programs'
import { enter } from '@/lib/motion'
import { Input } from '@/components/ui/input'
import type { ProgramExercise } from '@/types'
import { errorMessage } from '@/lib/errors'

/**
 * Pratimo eilutė programoje. Serijos, kartojimai, svoris ir poilsis
 * redaguojami vietoje, dėl vieno skaičiaus atidaryti modalą per daug.
 */
export function ProgramExerciseRow({
  exercise,
  index,
  onDelete,
}: {
  exercise: ProgramExercise
  index: number
  onDelete: () => Promise<void>
}) {
  const [sets, setSets] = useState(String(exercise.sets))
  const [reps, setReps] = useState(exercise.reps)
  const [weight, setWeight] = useState(exercise.weightKg != null ? String(exercise.weightKg) : '')
  const [rest, setRest] = useState(exercise.restSeconds != null ? String(exercise.restSeconds) : '')
  const [saved, setSaved] = useState(false)

  // Persikrovus programą reikšmės iš serverio turi perrašyti vietinę būseną.
  useEffect(() => {
    setSets(String(exercise.sets))
    setReps(exercise.reps)
    setWeight(exercise.weightKg != null ? String(exercise.weightKg) : '')
    setRest(exercise.restSeconds != null ? String(exercise.restSeconds) : '')
  }, [exercise.sets, exercise.reps, exercise.weightKg, exercise.restSeconds])

  const num = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed.replace(',', '.'))
    return Number.isNaN(parsed) ? null : parsed
  }

  /** Išsaugoma paliekant lauką, kad kiekvienas paspaustas klavišas nekeliautų į serverį. */
  const commit = async () => {
    const setsNum = Math.max(1, Math.round(num(sets) ?? exercise.sets))

    const patch = {
      sets: setsNum,
      reps: reps.trim() || exercise.reps,
      weightKg: num(weight),
      restSeconds: rest.trim() ? Math.round(num(rest) ?? 0) : null,
    }

    const unchanged =
      patch.sets === exercise.sets &&
      patch.reps === exercise.reps &&
      patch.weightKg === (exercise.weightKg ?? null) &&
      patch.restSeconds === (exercise.restSeconds ?? null)

    if (unchanged) return

    try {
      await updateExercise(exercise.id, patch)
      setSaved(true)
      setTimeout(() => setSaved(false), 1200)
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko išsaugoti'))
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: enter }}
      className="group grid grid-cols-[1.5rem_1fr] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]"
    >
      <span className="mono pt-2 text-xs text-muted-foreground">{index + 1}</span>

      <span className="min-w-0 pt-1.5">
        <span className="block truncate text-sm font-medium text-foreground">{exercise.name}</span>
      </span>

      {/* Laukai savo eilutėje telefone, viena eile plačiam ekrane. */}
      <div className="col-start-2 flex flex-wrap items-end gap-2 sm:col-start-3">
        <Field label="Serijos" value={sets} onChange={setSets} onBlur={commit} width="w-16" />
        <Field label="Kartojimai" value={reps} onChange={setReps} onBlur={commit} width="w-20" placeholder="8-12" />
        <Field label="Svoris, kg" value={weight} onChange={setWeight} onBlur={commit} width="w-20" placeholder="-" />
        <Field label="Poilsis, s" value={rest} onChange={setRest} onBlur={commit} width="w-20" placeholder="-" />

        <span className="flex h-10 items-center gap-1">
          {saved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid h-7 w-7 place-items-center text-foreground"
              aria-label="Išsaugota"
            >
              <Check className="h-4 w-4" />
            </motion.span>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Ištrinti ${exercise.name}`}
            className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>
    </motion.div>
  )
}

function Field({
  label, value, onChange, onBlur, width, placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  width: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-xs">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode="decimal"
        className={`mono h-9 px-2 text-center text-sm ${width}`}
      />
    </label>
  )
}
