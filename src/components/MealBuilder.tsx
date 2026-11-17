import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { FoodPicker, type LoggedFood } from '@/components/FoodPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { enter, exit } from '@/lib/motion'
import { formatNum } from '@/lib/utils'

export interface BuiltMeal {
  title: string
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  ingredients: string
  recipe: string | null
}

/**
 * Valgis iš produktų: treneris sudeda ingredientus su gramais, o kalorijos
 * ir makro susumuojami patys. Sportininkas plane mato ir sąrašą, ką pirkti.
 */
export function MealBuilder({ onSave }: { onSave: (meal: BuiltMeal) => Promise<void> }) {
  const [items, setItems] = useState<(LoggedFood & { key: string })[]>([])
  const [title, setTitle] = useState('')
  const [recipe, setRecipe] = useState('')
  const [picking, setPicking] = useState(true)
  const [saving, setSaving] = useState(false)

  const totals = items.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      protein: sum.protein + item.proteinG,
      carbs: sum.carbs + item.carbsG,
      fat: sum.fat + item.fatG,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  if (picking) {
    return (
      <div className="space-y-3">
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="w-full rounded-md border border-border bg-muted/60 px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            Valgyje {items.length} produkt{items.length === 1 ? 'as' : items.length < 10 ? 'ai' : 'ų'} · {formatNum(totals.kcal)} kcal. Grįžti prie valgio
          </button>
        )}
        <FoodPicker
          actionLabel="Įdėti į valgį"
          onPick={(food) => {
            setItems((list) => [...list, { ...food, key: crypto.randomUUID() }])
            setPicking(false)
          }}
        />
      </div>
    )
  }

  const defaultTitle = items.slice(0, 3).map((i) => i.food.name.split(',')[0]).join(', ')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mb-title">Valgio pavadinimas</Label>
        <Input id="mb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle || 'pvz. Varškė su uogomis'} />
      </div>

      <div className="panel overflow-hidden">
        <div className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0, transition: enter }}
                exit={{ opacity: 0, height: 0, transition: exit }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
                <span className="mono shrink-0 text-xs text-muted-foreground">{item.kcal} kcal</span>
                <button
                  type="button"
                  onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                  aria-label={`Išimti ${item.food.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Pridėti produktą
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {([
          ['kcal', totals.kcal, 0],
          ['B, g', totals.protein, 1],
          ['A, g', totals.carbs, 1],
          ['R, g', totals.fat, 1],
        ] as const).map(([label, value, digits]) => (
          <div key={label} className="rounded-md bg-muted/60 py-2">
            <p className="eyebrow">{label}</p>
            <p className="stat-num mt-1 text-lg text-foreground">{formatNum(value, digits)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mb-recipe">Paruošimas (nebūtina)</Label>
        <Textarea id="mb-recipe" rows={3} value={recipe} onChange={(e) => setRecipe(e.target.value)} placeholder="pvz. Varškę sumaišyti su jogurtu, ant viršaus uogos." />
      </div>

      <Button
        className="w-full"
        loading={saving}
        disabled={items.length === 0}
        onClick={async () => {
          setSaving(true)
          try {
            await onSave({
              title: title.trim() || defaultTitle,
              kcal: Math.round(totals.kcal),
              proteinG: Math.round(totals.protein),
              carbsG: Math.round(totals.carbs),
              fatG: Math.round(totals.fat),
              ingredients: items.map((i) => i.title).join('\n'),
              recipe: recipe.trim() || null,
            })
            setItems([]); setTitle(''); setRecipe(''); setPicking(true)
          } finally {
            setSaving(false)
          }
        }}
      >
        Išsaugoti valgį
      </Button>
    </div>
  )
}
