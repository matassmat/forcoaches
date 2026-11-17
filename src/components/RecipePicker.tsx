import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, ImageOff, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  getRecipe, RECIPE_CATEGORIES, recipesByCategory, searchRecipes, type Recipe,
} from '@/lib/recipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { easeOutQuint } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface PickedMeal {
  title: string
  imageUrl: string | null
  ingredients: string | null
  recipe: string | null
  sourceId: string | null
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

/**
 * Receptų naršyklė mitybos planui. Kalorijų TheMealDB neduoda, todėl prieš
 * pridedant treneris jas įrašo, geriau tuščias laukas nei prasimanytas skaičius.
 */
export function RecipePicker({ onPick }: { onPick: (meal: PickedMeal) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('Chicken')
  const [results, setResults] = useState<Recipe[] | null>(null)
  const [detail, setDetail] = useState<Recipe | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    let cancelled = false
    setResults(null)

    const run = async () => {
      try {
        const list = query.trim() ? await searchRecipes(query) : await recipesByCategory(category)
        if (!cancelled) setResults(list)
      } catch (e) {
        if (!cancelled) {
          setResults([])
          toast.error(e instanceof Error ? e.message : 'Nepavyko įkelti receptų')
        }
      }
    }

    // Rašant nesiunčiame užklausos po kiekvienos raidės.
    const timer = setTimeout(run, query.trim() ? 350 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, category])

  const open = async (recipe: Recipe) => {
    if (recipe.instructions) { setDetail(recipe); return }
    setLoadingDetail(true)
    try {
      setDetail(await getRecipe(recipe.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko įkelti recepto')
    } finally {
      setLoadingDetail(false)
    }
  }

  if (detail) {
    return <RecipeDetail recipe={detail} onBack={() => setDetail(null)} onPick={onPick} />
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti patiekalo (angliškai)…" className="pl-9" />
      </div>

      {!query.trim() && (
        <div className="flex flex-wrap gap-2">
          {RECIPE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              className={cn(
                'mono rounded-md px-3 py-1 text-xs transition-colors duration-150',
                category === c.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {(!results || loadingDetail) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[4/3] w-full" />)}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nieko nerasta. Pabandykite kitą žodį.</p>
      )}

      {results && results.length > 0 && (
        <div className="grid max-h-[24rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {results.slice(0, 30).map((recipe, i) => (
            <motion.button
              key={recipe.id}
              type="button"
              onClick={() => open(recipe)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.25), duration: 0.25, ease: easeOutQuint }}
              className="group overflow-hidden rounded-md border border-border text-left transition-colors duration-150 hover:border-foreground/25"
            >
              <Thumb src={recipe.imageUrl} alt={recipe.title} />
              <span className="block px-2 py-1.5 text-xs font-medium leading-snug text-foreground">
                {recipe.title}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="grid aspect-[4/3] w-full place-items-center bg-muted text-muted-foreground">
        <ImageOff className="h-5 w-5" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-[4/3] w-full object-cover"
    />
  )
}

function RecipeDetail({
  recipe, onBack, onPick,
}: {
  recipe: Recipe
  onBack: () => void
  onPick: (meal: PickedMeal) => Promise<void>
}) {
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  const num = (v: string) => (v.trim() ? Math.round(Number(v.replace(',', '.'))) : null)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Atgal
      </button>

      <img src={recipe.imageUrl} alt={recipe.title} className="aspect-[16/9] w-full rounded-md object-cover" />

      <div>
        <h3 className="text-xl text-foreground">{recipe.title}</h3>
        <p className="mono mt-1 text-xs text-muted-foreground">
          {[recipe.category, recipe.area].filter(Boolean).join(' · ')}
        </p>
      </div>

      {recipe.ingredients.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Ingredientai</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {recipe.ingredients.map((line) => (
              <li key={line} className="text-sm text-muted-foreground">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {recipe.instructions && (
        <div className="max-h-40 overflow-y-auto pr-1">
          <p className="eyebrow mb-2">Gaminimas</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{recipe.instructions}</p>
        </div>
      )}

      <div className="rounded-md border border-dashed border-border p-4">
        <p className="eyebrow mb-1">Maistinė vertė porcijai</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Receptų bazė kalorijų neturi, įrašykite patys, kad sportininkas matytų dienos likutį.
        </p>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-2">
            <Label htmlFor="r-kcal">kcal</Label>
            <Input id="r-kcal" inputMode="numeric" className="mono" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-p">B, g</Label>
            <Input id="r-p" inputMode="numeric" className="mono" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-c">A, g</Label>
            <Input id="r-c" inputMode="numeric" className="mono" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-f">R, g</Label>
            <Input id="r-f" inputMode="numeric" className="mono" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline">
              <ExternalLink className="h-4 w-4" />
              Šaltinis
            </Button>
          </a>
        )}
        <Button
          className="flex-1"
          loading={saving}
          onClick={async () => {
            setSaving(true)
            try {
              await onPick({
                title: recipe.title,
                imageUrl: recipe.imageUrl,
                ingredients: recipe.ingredients.join('\n') || null,
                recipe: recipe.instructions || null,
                sourceId: recipe.id,
                kcal: num(kcal),
                proteinG: num(protein),
                carbsG: num(carbs),
                fatG: num(fat),
              })
            } finally {
              setSaving(false)
            }
          }}
        >
          Pridėti į valgiaraštį
        </Button>
      </div>
    </div>
  )
}
