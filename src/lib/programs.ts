import { supabase } from '@/lib/supabase'
import type { Program, ProgramDay, ProgramExercise } from '@/types'

type ProgramRow = {
  id: string
  coach_id: string
  athlete_id: string | null
  title: string
  description: string | null
  is_template: boolean
  starts_on: string | null
  ends_on: string | null
  created_at: string
  updated_at: string
}

type DayRow = { id: string; program_id: string; title: string; day_order: number }

type ExerciseRow = {
  id: string
  program_day_id: string
  name: string
  sets: number
  reps: string
  weight_kg: number | null
  rest_seconds: number | null
  notes: string | null
  exercise_order: number
}

function parseProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    coachId: row.coach_id,
    athleteId: row.athlete_id,
    title: row.title,
    description: row.description,
    isTemplate: row.is_template,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const parseDay = (row: DayRow): ProgramDay => ({
  id: row.id, programId: row.program_id, title: row.title, dayOrder: row.day_order,
})

const parseExercise = (row: ExerciseRow): ProgramExercise => ({
  id: row.id,
  programDayId: row.program_day_id,
  name: row.name,
  sets: row.sets,
  reps: row.reps,
  weightKg: row.weight_kg,
  restSeconds: row.rest_seconds,
  notes: row.notes,
  exerciseOrder: row.exercise_order,
})

/** Programa su visomis dienomis ir pratimais, vienas kelias į serverį. */
export interface FullProgram extends Program {
  days: (ProgramDay & { exercises: ProgramExercise[] })[]
}

export async function listPrograms(coachId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as ProgramRow[]).map(parseProgram)
}

export async function listAthletePrograms(athleteId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as ProgramRow[]).map(parseProgram)
}

export async function getFullProgram(programId: string): Promise<FullProgram | null> {
  const { data: program, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!program) return null

  // Įdėta select forma: dienos ir jų pratimai vienu užklausimu.
  const { data: days, error: daysError } = await supabase
    .from('program_days')
    .select('*, program_exercises(*)')
    .eq('program_id', programId)
    .order('day_order')

  if (daysError) throw new Error(daysError.message)

  return {
    ...parseProgram(program as ProgramRow),
    days: (days as (DayRow & { program_exercises: ExerciseRow[] })[]).map((day) => ({
      ...parseDay(day),
      exercises: (day.program_exercises ?? [])
        .map(parseExercise)
        .sort((a, b) => a.exerciseOrder - b.exerciseOrder),
    })),
  }
}

export async function createProgram(input: {
  coachId: string
  title: string
  description?: string
  athleteId?: string | null
  isTemplate?: boolean
}): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      coach_id: input.coachId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      athlete_id: input.athleteId ?? null,
      is_template: input.isTemplate ?? !input.athleteId,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parseProgram(data as ProgramRow)
}

export async function updateProgram(
  id: string,
  patch: { title?: string; description?: string | null; athleteId?: string | null; isTemplate?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.athleteId !== undefined ? { athlete_id: patch.athleteId, is_template: patch.athleteId === null } : {}),
      ...(patch.isTemplate !== undefined ? { is_template: patch.isTemplate } : {}),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addDay(programId: string, title: string, dayOrder: number): Promise<ProgramDay> {
  const { data, error } = await supabase
    .from('program_days')
    .insert({ program_id: programId, title: title.trim(), day_order: dayOrder })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parseDay(data as DayRow)
}

export async function deleteDay(id: string): Promise<void> {
  const { error } = await supabase.from('program_days').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addExercise(input: {
  programDayId: string
  name: string
  sets: number
  reps: string
  weightKg?: number | null
  restSeconds?: number | null
  exerciseOrder: number
}): Promise<ProgramExercise> {
  const { data, error } = await supabase
    .from('program_exercises')
    .insert({
      program_day_id: input.programDayId,
      name: input.name,
      sets: input.sets,
      reps: input.reps,
      weight_kg: input.weightKg ?? null,
      rest_seconds: input.restSeconds ?? null,
      exercise_order: input.exerciseOrder,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parseExercise(data as ExerciseRow)
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('program_exercises').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Nukopijuoja šabloną sportininkui su visomis dienomis ir pratimais.
 * Kopija atrišama nuo originalo, vėliau ją galima taisyti neliečiant šablono.
 */
export async function assignTemplate(templateId: string, athleteId: string, coachId: string): Promise<Program> {
  const template = await getFullProgram(templateId)
  if (!template) throw new Error('Šablonas nerastas')

  const copy = await createProgram({
    coachId,
    title: template.title,
    description: template.description ?? undefined,
    athleteId,
    isTemplate: false,
  })

  for (const day of template.days) {
    const newDay = await addDay(copy.id, day.title, day.dayOrder)
    for (const exercise of day.exercises) {
      await addExercise({
        programDayId: newDay.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: exercise.weightKg,
        restSeconds: exercise.restSeconds,
        exerciseOrder: exercise.exerciseOrder,
      })
    }
  }

  return copy
}

export async function updateExercise(
  id: string,
  patch: { sets?: number; reps?: string; weightKg?: number | null; restSeconds?: number | null; notes?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('program_exercises')
    .update({
      ...(patch.sets !== undefined ? { sets: patch.sets } : {}),
      ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
      ...(patch.weightKg !== undefined ? { weight_kg: patch.weightKg } : {}),
      ...(patch.restSeconds !== undefined ? { rest_seconds: patch.restSeconds } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
