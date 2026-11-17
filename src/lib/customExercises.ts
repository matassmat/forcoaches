import type { Equipment, MuscleGroup } from '@/data/exercises'
import { supabase } from '@/lib/supabase'

/** Trenerio susikurtas pratimas su sava nuoroda į vaizdo įrašą. */
export interface CustomExercise {
  id: string
  coachId: string
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  videoUrl: string | null
  imageUrl: string | null
  instructions: string | null
}

type Row = {
  id: string
  coach_id: string
  name: string
  muscle: string
  equipment: string
  video_url: string | null
  image_url: string | null
  instructions: string | null
}

const parse = (row: Row): CustomExercise => ({
  id: row.id,
  coachId: row.coach_id,
  name: row.name,
  muscle: row.muscle as MuscleGroup,
  equipment: row.equipment as Equipment,
  videoUrl: row.video_url,
  imageUrl: row.image_url,
  instructions: row.instructions,
})

/** Visi matomi savi pratimai: treneriui jo paties, sportininkui jo trenerio. */
export async function listCustomExercises(): Promise<CustomExercise[]> {
  const { data, error } = await supabase.from('custom_exercises').select('*').order('name')
  // Lentelės dar nėra (migracija nepaleista): tiesiog nėra savų pratimų.
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) return []
    throw error
  }
  return (data as Row[]).map(parse)
}

export async function saveCustomExercise(input: Omit<CustomExercise, 'id'> & { id?: string }): Promise<CustomExercise> {
  const row = {
    coach_id: input.coachId,
    name: input.name.trim(),
    muscle: input.muscle,
    equipment: input.equipment,
    video_url: input.videoUrl?.trim() || null,
    image_url: input.imageUrl?.trim() || null,
    instructions: input.instructions?.trim() || null,
  }
  const query = input.id
    ? supabase.from('custom_exercises').update(row).eq('id', input.id)
    : supabase.from('custom_exercises').insert(row)
  const { data, error } = await query.select('*').single()
  if (error) throw error
  return parse(data as Row)
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from('custom_exercises').delete().eq('id', id)
  if (error) throw error
}

/** YouTube nuorodos vaizdo įrašo ID: watch?v=, youtu.be/, shorts/, embed/. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}
