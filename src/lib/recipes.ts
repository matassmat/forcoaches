/**
 * Receptų biblioteka, TheMealDB (nemokama, be rakto).
 *
 * Duoda tai, ko trūko mitybos planams: patiekalo nuotrauką, ingredientus su
 * kiekiais ir gaminimo aprašymą. Kalorijų API neduoda, todėl treneris jas
 * įrašo pats, sąsaja to ir prašo, o ne apsimeta žinanti.
 */

const BASE = 'https://www.themealdb.com/api/json/v1/1'

export interface Recipe {
  id: string
  title: string
  category: string
  area: string
  imageUrl: string
  instructions: string
  /** „Vištienos krūtinėlė, 200 g“ eilutėmis. */
  ingredients: string[]
  sourceUrl: string | null
}

type RawMeal = Record<string, string | null> & {
  idMeal: string
  strMeal: string
  strMealThumb: string
}

function parseMeal(raw: RawMeal): Recipe {
  const ingredients: string[] = []
  // API laiko ingredientus 20 atskirų laukų, kitaip jų nesurinksi.
  for (let i = 1; i <= 20; i++) {
    const name = raw[`strIngredient${i}`]?.trim()
    if (!name) continue
    const measure = raw[`strMeasure${i}`]?.trim()
    ingredients.push(measure ? `${name}, ${measure}` : name)
  }

  return {
    id: raw.idMeal,
    title: raw.strMeal,
    category: raw.strCategory ?? '',
    area: raw.strArea ?? '',
    imageUrl: raw.strMealThumb,
    instructions: raw.strInstructions ?? '',
    ingredients,
    sourceUrl: raw.strSource || null,
  }
}

async function get(path: string): Promise<RawMeal[]> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Receptų paslauga neatsako (${res.status})`)
  const json = await res.json() as { meals: RawMeal[] | null }
  return json.meals ?? []
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const q = query.trim()
  if (!q) return []
  return (await get(`/search.php?s=${encodeURIComponent(q)}`)).map(parseMeal)
}

/** Kategorijos naršymui, kai treneris dar nežino, ko ieško. */
export async function recipesByCategory(category: string): Promise<Recipe[]> {
  // filter.php grąžina tik id, pavadinimą ir nuotrauką, pilnas receptas
  // paimamas atskirai, kai patiekalas atidaromas.
  const list = await get(`/filter.php?c=${encodeURIComponent(category)}`)
  return list.map((raw) => ({
    id: raw.idMeal,
    title: raw.strMeal,
    category,
    area: '',
    imageUrl: raw.strMealThumb,
    instructions: '',
    ingredients: [],
    sourceUrl: null,
  }))
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const meals = await get(`/lookup.php?i=${encodeURIComponent(id)}`)
  return meals[0] ? parseMeal(meals[0]) : null
}

export const RECIPE_CATEGORIES = [
  { value: 'Chicken', label: 'Vištiena' },
  { value: 'Beef', label: 'Jautiena' },
  { value: 'Pork', label: 'Kiauliena' },
  { value: 'Seafood', label: 'Žuvis, jūros gėrybės' },
  { value: 'Pasta', label: 'Makaronai' },
  { value: 'Breakfast', label: 'Pusryčiai' },
  { value: 'Vegetarian', label: 'Vegetariški' },
  { value: 'Vegan', label: 'Veganiški' },
  { value: 'Side', label: 'Garnyrai' },
  { value: 'Dessert', label: 'Desertai' },
] as const
