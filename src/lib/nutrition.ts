import { supabase } from '@/lib/supabase'
import type { FoodLogEntry, Meal, MealPlan, MealSlot } from '@/types'

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Pusryčiai',
  lunch: 'Pietūs',
  dinner: 'Vakarienė',
  snack: 'Užkandis',
}

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']

type PlanRow = {
  id: string
  coach_id: string
  athlete_id: string | null
  title: string
  target_kcal: number | null
  target_protein_g: number | null
  target_carbs_g: number | null
  target_fat_g: number | null
  notes: string | null
  is_template: boolean
  created_at: string
  updated_at: string
}

type MealRow = {
  id: string
  meal_plan_id: string
  slot: MealSlot
  title: string
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  recipe: string | null
  image_url: string | null
  ingredients: string | null
  source_id: string | null
  meal_order: number
}

type LogRow = {
  id: string
  athlete_id: string
  logged_on: string
  slot: MealSlot
  title: string
  kcal: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  grams: number | null
  created_at: string
}

function parsePlan(row: PlanRow): MealPlan {
  return {
    id: row.id,
    coachId: row.coach_id,
    athleteId: row.athlete_id,
    title: row.title,
    targetKcal: row.target_kcal,
    targetProteinG: row.target_protein_g,
    targetCarbsG: row.target_carbs_g,
    targetFatG: row.target_fat_g,
    notes: row.notes,
    isTemplate: row.is_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const parseMeal = (row: MealRow): Meal => ({
  id: row.id,
  mealPlanId: row.meal_plan_id,
  slot: row.slot,
  title: row.title,
  kcal: row.kcal,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatG: row.fat_g,
  recipe: row.recipe,
  imageUrl: row.image_url,
  ingredients: row.ingredients,
  sourceId: row.source_id,
  mealOrder: row.meal_order,
})

const parseLog = (row: LogRow): FoodLogEntry => ({
  id: row.id,
  athleteId: row.athlete_id,
  loggedOn: row.logged_on,
  slot: row.slot,
  title: row.title,
  kcal: row.kcal,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatG: row.fat_g,
  grams: row.grams != null ? Number(row.grams) : null,
  createdAt: row.created_at,
})

// ── Planai ────────────────────────────────────────────────────────────

export async function listMealPlans(coachId: string): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as PlanRow[]).map(parsePlan)
}

export async function getAthleteMealPlan(athleteId: string): Promise<(MealPlan & { meals: Meal[] }) | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*, meals(*)')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as PlanRow & { meals: MealRow[] }
  return {
    ...parsePlan(row),
    meals: (row.meals ?? []).map(parseMeal).sort((a, b) => a.mealOrder - b.mealOrder),
  }
}

export async function getMealPlan(planId: string): Promise<(MealPlan & { meals: Meal[] }) | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*, meals(*)')
    .eq('id', planId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as PlanRow & { meals: MealRow[] }
  return {
    ...parsePlan(row),
    meals: (row.meals ?? []).map(parseMeal).sort((a, b) => a.mealOrder - b.mealOrder),
  }
}

export async function createMealPlan(input: {
  coachId: string
  title: string
  athleteId?: string | null
  targetKcal?: number | null
  targetProteinG?: number | null
  targetCarbsG?: number | null
  targetFatG?: number | null
}): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      coach_id: input.coachId,
      title: input.title.trim(),
      athlete_id: input.athleteId ?? null,
      is_template: !input.athleteId,
      target_kcal: input.targetKcal ?? null,
      target_protein_g: input.targetProteinG ?? null,
      target_carbs_g: input.targetCarbsG ?? null,
      target_fat_g: input.targetFatG ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parsePlan(data as PlanRow)
}

export async function deleteMealPlan(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addMeal(input: {
  mealPlanId: string
  slot: MealSlot
  title: string
  kcal?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  recipe?: string | null
  imageUrl?: string | null
  ingredients?: string | null
  sourceId?: string | null
  mealOrder: number
}): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .insert({
      meal_plan_id: input.mealPlanId,
      slot: input.slot,
      title: input.title.trim(),
      kcal: input.kcal ?? null,
      protein_g: input.proteinG ?? null,
      carbs_g: input.carbsG ?? null,
      fat_g: input.fatG ?? null,
      recipe: input.recipe?.trim() || null,
      image_url: input.imageUrl ?? null,
      ingredients: input.ingredients ?? null,
      source_id: input.sourceId ?? null,
      meal_order: input.mealOrder,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parseMeal(data as MealRow)
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Kalorijų žymėjimasis ──────────────────────────────────────────────

export async function listFoodLog(athleteId: string, loggedOn: string): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('logged_on', loggedOn)
    .order('created_at')

  if (error) throw new Error(error.message)
  return (data as LogRow[]).map(parseLog)
}

/** Paskutinių dienų sumos, savaitės vidurkiui ir juostelėms. */
export async function listFoodLogRange(
  athleteId: string,
  fromDate: string,
  toDate: string
): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('*')
    .eq('athlete_id', athleteId)
    .gte('logged_on', fromDate)
    .lte('logged_on', toDate)
    .order('logged_on')

  if (error) throw new Error(error.message)
  return (data as LogRow[]).map(parseLog)
}

export async function addFoodLog(input: {
  athleteId: string
  loggedOn: string
  slot: MealSlot
  title: string
  kcal: number
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  grams?: number | null
}): Promise<FoodLogEntry> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .insert({
      athlete_id: input.athleteId,
      logged_on: input.loggedOn,
      slot: input.slot,
      title: input.title.trim(),
      kcal: input.kcal,
      protein_g: input.proteinG ?? null,
      carbs_g: input.carbsG ?? null,
      fat_g: input.fatG ?? null,
      grams: input.grams ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parseLog(data as LogRow)
}

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_log_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface MacroTotals { kcal: number; protein: number; carbs: number; fat: number }

export function sumMacros(entries: { kcal: number; proteinG?: number | null; carbsG?: number | null; fatG?: number | null }[]): MacroTotals {
  return entries.reduce<MacroTotals>(
    (acc, entry) => ({
      kcal: acc.kcal + (entry.kcal || 0),
      protein: acc.protein + (entry.proteinG ?? 0),
      carbs: acc.carbs + (entry.carbsG ?? 0),
      fat: acc.fat + (entry.fatG ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export async function updateMealPlanTargets(id: string, targets: {
  targetKcal: number | null
  targetProteinG: number | null
  targetCarbsG: number | null
  targetFatG: number | null
}): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .update({
      target_kcal: targets.targetKcal,
      target_protein_g: targets.targetProteinG,
      target_carbs_g: targets.targetCarbsG,
      target_fat_g: targets.targetFatG,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Vienos dienos įrašų kopija į kitą dieną vienu užklausimu. */
export async function copyFoodLogDay(athleteId: string, fromDate: string, toDate: string): Promise<FoodLogEntry[]> {
  const source = await listFoodLog(athleteId, fromDate)
  if (source.length === 0) return []
  const { data, error } = await supabase
    .from('food_log_entries')
    .insert(source.map((entry) => ({
      athlete_id: athleteId,
      logged_on: toDate,
      slot: entry.slot,
      title: entry.title,
      kcal: entry.kcal,
      protein_g: entry.proteinG ?? null,
      carbs_g: entry.carbsG ?? null,
      fat_g: entry.fatG ?? null,
      grams: entry.grams ?? null,
    })))
    .select('*')
  if (error) throw error
  return (data as LogRow[]).map(parseLog)
}
