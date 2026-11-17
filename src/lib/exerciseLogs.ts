import { supabase } from '@/lib/supabase'

/**
 * Atliktos serijos. Anksčiau jos gyveno tik naršyklėje, todėl dingdavo
 * perkrovus puslapį; dabar lieka istorijoje ir iš jos matyti, ar svoris auga.
 */

export interface ExerciseLog {
  id: string
  athleteId: string
  programExerciseId: string
  performedOn: string
  setNumber: number
  reps: number | null
  weightKg: number | null
}

type Row = {
  id: string
  athlete_id: string
  program_exercise_id: string
  performed_on: string
  set_number: number
  reps: number | null
  weight_kg: number | null
}

const parse = (row: Row): ExerciseLog => ({
  id: row.id,
  athleteId: row.athlete_id,
  programExerciseId: row.program_exercise_id,
  performedOn: row.performed_on,
  setNumber: row.set_number,
  reps: row.reps,
  weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
})

export async function listLogsForDay(athleteId: string, performedOn: string): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('performed_on', performedOn)

  if (error) throw new Error(error.message)
  return (data as Row[]).map(parse)
}

/** Vieno pratimo istorija, svorio kitimui pamatyti. */
export async function listLogsForExercise(
  athleteId: string,
  programExerciseId: string,
  limit = 60
): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('program_exercise_id', programExerciseId)
    .order('performed_on', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data as Row[]).map(parse)
}

export async function markSet(input: {
  athleteId: string
  programExerciseId: string
  performedOn: string
  setNumber: number
  reps?: number | null
  weightKg?: number | null
}): Promise<ExerciseLog> {
  // upsert pagal unikalų indeksą, pakartotinis paspaudimas atnaujina,
  // o ne kuria antrą tos pačios serijos įrašą.
  const { data, error } = await supabase
    .from('exercise_logs')
    .upsert({
      athlete_id: input.athleteId,
      program_exercise_id: input.programExerciseId,
      performed_on: input.performedOn,
      set_number: input.setNumber,
      reps: input.reps ?? null,
      weight_kg: input.weightKg ?? null,
    }, { onConflict: 'athlete_id,program_exercise_id,performed_on,set_number' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parse(data as Row)
}

/** Nuima žymą nuo serijos ir visų aukštesnių, jos negali likti „kabančios“. */
export async function unmarkSetsFrom(input: {
  athleteId: string
  programExerciseId: string
  performedOn: string
  fromSetNumber: number
}): Promise<void> {
  const { error } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('athlete_id', input.athleteId)
    .eq('program_exercise_id', input.programExerciseId)
    .eq('performed_on', input.performedOn)
    .gte('set_number', input.fromSetNumber)

  if (error) throw new Error(error.message)
}

/** Vieno pratimo jėgos suvestinė iš visų atliktų serijų. */
export interface StrengthSummary {
  name: string
  best: number
  bestOn: string
  first: number
  last: number
  sessions: number
  /** Didžiausias svoris kiekvieną treniruočių dieną, chronologiškai. */
  series: { date: string; weight: number }[]
}

/**
 * Rekordai pagal pratimo pavadinimą. Tas pats pratimas gali būti keliose
 * programose (skirtingi program_exercise_id), todėl grupuojama pagal vardą.
 * Tik serijos su svoriu: savo svorio pratimų čia nėra ką lyginti.
 */
export async function listStrengthSummary(athleteId: string): Promise<StrengthSummary[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('performed_on, weight_kg, program_exercises(name)')
    .eq('athlete_id', athleteId)
    .not('weight_kg', 'is', null)
    .order('performed_on', { ascending: true })
    .limit(5000)

  if (error) throw error

  type LogRow = { performed_on: string; weight_kg: number | string; program_exercises: { name: string } | { name: string }[] | null }
  const byName = new Map<string, Map<string, number>>()
  for (const row of (data ?? []) as LogRow[]) {
    const pe = Array.isArray(row.program_exercises) ? row.program_exercises[0] : row.program_exercises
    if (!pe?.name) continue
    const weight = Number(row.weight_kg)
    if (!Number.isFinite(weight) || weight <= 0) continue
    const days = byName.get(pe.name) ?? new Map<string, number>()
    days.set(row.performed_on, Math.max(days.get(row.performed_on) ?? 0, weight))
    byName.set(pe.name, days)
  }

  return [...byName.entries()]
    .map(([name, days]) => {
      const series = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, weight]) => ({ date, weight }))
      const bestPoint = series.reduce((best, p) => (p.weight > best.weight ? p : best), series[0])
      return {
        name,
        best: bestPoint.weight,
        bestOn: bestPoint.date,
        first: series[0].weight,
        last: series[series.length - 1].weight,
        sessions: series.length,
        series,
      }
    })
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, 'lt'))
}
