/**
 * Pratimų katalogas, 873 pratimai su nuotraukomis ir atlikimo instrukcijomis.
 *
 * Duomenys: `yuhonas/free-exercise-db` (public domain). Failas gyvena
 * `public/exercises.json` (~830 kB) ir parsiunčiamas tik tada, kai treneris
 * atidaro pratimų paiešką, į paketą jis nededamas.
 *
 * Pavadinimai: dažniausiems pratimams yra lietuviškas vardas (`nameLt`),
 * likusiems rodomas originalus. Mašininis 873 pavadinimų vertimas duotų
 * blogesnį rezultatą nei tikras angliškas terminas.
 */

import { matches } from '@/lib/search'

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'fullbody'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'
  | 'kettlebell' | 'bands' | 'other'

export interface Exercise {
  id: string
  name: string
  nameLt: string | null
  muscle: MuscleGroup
  secondary: MuscleGroup[]
  equipment: Equipment
  mechanic: 'compound' | 'isolation'
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  /** Keliai formatu „Barbell_Squat/0.jpg“. */
  images: string[]
  instructions: string[]
  /** Lietuviškas aprašymas dažniausiems pratimams. */
  instructionsLt?: string[]
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Krūtinė',
  back: 'Nugara',
  shoulders: 'Pečiai',
  biceps: 'Bicepsas',
  triceps: 'Tricepsas',
  forearms: 'Dilbiai',
  quads: 'Keturgalviai',
  hamstrings: 'Dvigalviai',
  glutes: 'Sėdmenys',
  calves: 'Blauzdos',
  abs: 'Pilvo presas',
  fullbody: 'Visas kūnas',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Štanga',
  dumbbell: 'Hanteliai',
  machine: 'Treniruoklis',
  cable: 'Blokas',
  bodyweight: 'Savas svoris',
  kettlebell: 'Svarstis',
  bands: 'Guma',
  other: 'Kita',
}

export const LEVEL_LABELS: Record<Exercise['level'], string> = {
  beginner: 'Pradedantiesiems',
  intermediate: 'Vidutinis',
  advanced: 'Pažengusiems',
}

/** Nuotraukos iš jsDelivr, GitHub raw riboja užklausų kiekį. */
export function exerciseImageUrl(imagePath: string): string {
  return `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${imagePath}`
}

export const displayName = (exercise: Exercise) => exercise.nameLt ?? exercise.name

let cache: Exercise[] | null = null
let pending: Promise<Exercise[]> | null = null

/** Katalogas parsiunčiamas vieną kartą per seansą. */
export function loadExercises(): Promise<Exercise[]> {
  if (cache) return Promise.resolve(cache)
  if (pending) return pending

  pending = fetch('/exercises.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Nepavyko įkelti pratimų katalogo (${res.status})`)
      return res.json() as Promise<Exercise[]>
    })
    .then((data) => {
      cache = data
      return data
    })
    .finally(() => { pending = null })

  return pending
}

export function searchExercises(
  all: Exercise[],
  query: string,
  filters: { muscle?: MuscleGroup | null; equipment?: Equipment | null } = {}
): Exercise[] {
  const found = all.filter((ex) => {
    if (filters.muscle && ex.muscle !== filters.muscle) return false
    if (filters.equipment && ex.equipment !== filters.equipment) return false
    if (!query.trim()) return true
    return (
      matches(ex.name, query) ||
      (ex.nameLt ? matches(ex.nameLt, query) : false) ||
      matches(MUSCLE_LABELS[ex.muscle], query) ||
      matches(EQUIPMENT_LABELS[ex.equipment], query)
    )
  })

  // Lietuviškai pavadinti pratimai rodomi pirmi, jie dažniausiai ir ieškomi.
  return found.sort((a, b) => {
    if (!!a.nameLt !== !!b.nameLt) return a.nameLt ? -1 : 1
    return displayName(a).localeCompare(displayName(b), 'lt')
  })
}
