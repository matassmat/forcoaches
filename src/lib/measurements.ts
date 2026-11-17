import { supabase } from '@/lib/supabase'
import type { Measurement } from '@/types'

type Row = {
  id: string
  athlete_id: string
  measured_on: string
  weight_kg: number | null
  body_fat_pct: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  thigh_cm: number | null
  arm_cm: number | null
  notes: string | null
  created_at: string
}

function parse(row: Row): Measurement {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    measuredOn: row.measured_on,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct,
    chestCm: row.chest_cm,
    waistCm: row.waist_cm,
    hipsCm: row.hips_cm,
    thighCm: row.thigh_cm,
    armCm: row.arm_cm,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

/** Laukai, kuriuos galima matuoti. Vienas sąrašas – forma, grafikas ir lentelė. */
export const MEASURE_FIELDS = [
  { key: 'weightKg', column: 'weight_kg', label: 'Svoris', unit: 'kg', step: '0.1' },
  { key: 'bodyFatPct', column: 'body_fat_pct', label: 'Riebalai', unit: '%', step: '0.1' },
  { key: 'chestCm', column: 'chest_cm', label: 'Krūtinė', unit: 'cm', step: '0.5' },
  { key: 'waistCm', column: 'waist_cm', label: 'Liemuo', unit: 'cm', step: '0.5' },
  { key: 'hipsCm', column: 'hips_cm', label: 'Klubai', unit: 'cm', step: '0.5' },
  { key: 'thighCm', column: 'thigh_cm', label: 'Šlaunis', unit: 'cm', step: '0.5' },
  { key: 'armCm', column: 'arm_cm', label: 'Žastas', unit: 'cm', step: '0.5' },
] as const

export type MeasureKey = (typeof MEASURE_FIELDS)[number]['key']

export async function listMeasurements(athleteId: string): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('measured_on', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as Row[]).map(parse)
}

export async function saveMeasurement(input: {
  athleteId: string
  measuredOn: string
  values: Partial<Record<MeasureKey, number | null>>
  notes?: string | null
}): Promise<Measurement> {
  const columns: Record<string, number | null> = {}
  for (const field of MEASURE_FIELDS) {
    const value = input.values[field.key]
    if (value !== undefined) columns[field.column] = value
  }

  // upsert pagal (athlete_id, measured_on), tos pačios dienos matavimas
  // perrašomas, o ne dubliuojamas.
  const { data, error } = await supabase
    .from('measurements')
    .upsert(
      { athlete_id: input.athleteId, measured_on: input.measuredOn, notes: input.notes ?? null, ...columns },
      { onConflict: 'athlete_id,measured_on' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parse(data as Row)
}

export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase.from('measurements').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Pokytis tarp pirmo ir paskutinio įrašo, kuriame laukas apskritai užpildytas. */
export function changeFor(measurements: Measurement[], key: MeasureKey): { first: number; last: number; delta: number } | null {
  const filled = measurements.filter((m) => m[key] != null) as (Measurement & Record<MeasureKey, number>)[]
  if (filled.length < 2) return null
  const first = Number(filled[0][key])
  const last = Number(filled[filled.length - 1][key])
  return { first, last, delta: last - first }
}
