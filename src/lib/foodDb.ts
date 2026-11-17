import { FOODS, type Food, type FoodGroup } from '@/data/foods'
import { fold, matches } from '@/lib/search'

/**
 * Viena maisto paieška trims šaltiniams:
 *  1. bendrųjų produktų lentelė (`data/foods.ts`), lietuviškai, su porcijomis;
 *  2. Lietuvoje parduodamos prekės su brūkšniniais kodais (`public/foods-lt.json`,
 *     Open Food Facts, ODbL), parsiunčiamos tik atidarius paiešką;
 *  3. Open Food Facts API pagal brūkšninį kodą, kai prekės vietinėje lentelėje nėra.
 */

export interface FoodItem {
  id: string
  name: string
  brand?: string | null
  group?: FoodGroup
  kcal: number
  protein: number
  carbs: number
  fat: number
  unit?: { label: string; grams: number } | null
  source: 'generic' | 'store'
  barcode?: string
}

const fromGeneric = (food: Food, i: number): FoodItem => ({
  id: `g${i}`,
  name: food.name,
  group: food.group,
  kcal: food.kcal,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
  unit: food.unit ?? null,
  source: 'generic',
})

export const GENERIC_FOODS: FoodItem[] = FOODS.map(fromGeneric)

/** [kodas, pavadinimas, gamintojas, kcal, B, A, R, porcija g] */
type StoreRow = [string, string, string, number, number, number, number, number | null]

const fromStore = (row: StoreRow): FoodItem => ({
  id: `s${row[0]}`,
  barcode: row[0],
  name: row[1],
  brand: row[2] || null,
  kcal: row[3],
  protein: row[4],
  carbs: row[5],
  fat: row[6],
  unit: row[7] ? { label: 'porcija', grams: row[7] } : null,
  source: 'store',
})

let storeCache: FoodItem[] | null = null
let storePending: Promise<FoodItem[]> | null = null

export function loadStoreFoods(): Promise<FoodItem[]> {
  if (storeCache) return Promise.resolve(storeCache)
  if (storePending) return storePending
  storePending = fetch('/foods-lt.json')
    .then((res) => {
      if (!res.ok) throw new Error('Nepavyko įkelti prekių sąrašo')
      return res.json() as Promise<StoreRow[]>
    })
    .then((rows) => {
      storeCache = rows.map(fromStore)
      return storeCache
    })
    .finally(() => { storePending = null })
  return storePending
}

/** Bendrieji produktai pirmi: „varškė“ pirmiausia turi rasti varškę, o ne sūrelį. */
export function searchFoods(
  query: string,
  opts: { group?: FoodGroup | null; store?: FoodItem[] | null; limit?: number } = {}
): FoodItem[] {
  const q = query.trim()
  const generic = GENERIC_FOODS.filter((food) =>
    (!opts.group || food.group === opts.group) && matches(food.name, q)
  )
  if (!q || opts.group || !opts.store) return generic.slice(0, opts.limit ?? 400)

  const folded = fold(q)
  const store = opts.store
    .filter((food) => matches(`${food.name} ${food.brand ?? ''}`, q))
    // Prasidedantys užklausa pavadinimai aukščiau.
    .sort((a, b) => Number(fold(b.name).startsWith(folded)) - Number(fold(a.name).startsWith(folded)))

  return [...generic, ...store].slice(0, opts.limit ?? 80)
}

/** Paieška pagal brūkšninį kodą: pirma vietinė lentelė, tada Open Food Facts. */
export async function findByBarcode(code: string): Promise<FoodItem | null> {
  const clean = code.replace(/\D/g, '')
  if (clean.length < 8) return null

  const store = await loadStoreFoods().catch(() => [] as FoodItem[])
  const local = store.find((food) => food.barcode === clean)
  if (local) return local

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,product_name_lt,brands,nutriments,serving_quantity`,
      { signal: controller.signal }
    )
    if (!res.ok) return null
    const data = await res.json() as {
      status?: number
      product?: {
        product_name?: string
        product_name_lt?: string
        brands?: string
        serving_quantity?: number | string
        nutriments?: Record<string, number | string | undefined>
      }
    }
    const p = data.product
    if (!p || data.status === 0) return null
    const n = p.nutriments ?? {}
    const val = (key: string) => {
      const v = Number(n[`${key}_100g`])
      return Number.isFinite(v) ? Math.round(v * 10) / 10 : null
    }
    const kcal = val('energy-kcal') ?? (val('energy') != null ? Math.round((val('energy') as number) / 4.184) : null)
    if (kcal == null) return null
    const serving = Number(p.serving_quantity)
    return {
      id: `s${clean}`,
      barcode: clean,
      name: (p.product_name_lt || p.product_name || 'Prekė be pavadinimo').trim(),
      brand: p.brands?.split(',')[0]?.trim() || null,
      kcal: Math.round(kcal),
      protein: val('proteins') ?? 0,
      carbs: val('carbohydrates') ?? 0,
      fat: val('fat') ?? 0,
      unit: Number.isFinite(serving) && serving > 0 ? { label: 'porcija', grams: Math.round(serving) } : null,
      source: 'store',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── Neseniai naudoti produktai ──
// Laikomi naršyklėje: tai patogumas vienam žmogui, ne duomenys, kuriuos reikėtų sinchronizuoti.

const RECENT_KEY = 'forcoaches_recent_foods_v1'

export function getRecentFoods(): (FoodItem & { lastGrams?: number })[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function rememberFood(food: FoodItem, grams: number) {
  try {
    const list = getRecentFoods().filter((item) => item.id !== food.id)
    list.unshift({ ...food, lastGrams: grams })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 12)))
  } catch {
    // privatus langas arba užblokuota saugykla: tiesiog nieko neprisimenam
  }
}
