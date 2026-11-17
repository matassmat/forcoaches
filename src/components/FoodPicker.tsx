import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import {
  FOOD_GROUP_LABELS, scaleFood, searchFoods, type Food, type FoodGroup,
} from '@/data/foods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { easeOutQuint } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface LoggedFood {
  title: string
  grams: number
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

/**
 * Produktų paieška su porcijos svoriu. Sportininkas įveda gramus, o
 * kalorijos ir makro apskaičiuojami, tai vienintelis būdas, kad skaičiai
 * būtų teisingi ir jų nereikėtų ieškoti pakuotėje.
 */
export function FoodPicker({ onPick }: { onPick: (food: LoggedFood) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<FoodGroup | null>(null)
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const [saving, setSaving] = useState(false)

  const results = useMemo(() => searchFoods(query, group), [query, group])

  if (selected) {
    const amount = Number(grams.replace(',', '.')) || 0
    const scaled = scaleFood(selected, amount)

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          ← Kitas produktas
        </button>

        <div>
          <h3 className="text-lg text-foreground">{selected.name}</h3>
          <p className="mono mt-1 text-xs text-muted-foreground">
            100 g: {selected.kcal} kcal · B {selected.protein} · A {selected.carbs} · R {selected.fat}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fp-grams">Kiek suvalgėte, g</Label>
          <Input
            id="fp-grams"
            inputMode="numeric"
            className="mono text-lg"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            autoFocus
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {[50, 100, 150, 200, 250, 300].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrams(String(g))}
                className="mono rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {g} g
              </button>
            ))}
          </div>
        </div>

        <div className="panel grid grid-cols-4 gap-2 p-4 text-center">
          {[
            ['kcal', scaled.kcal],
            ['B, g', scaled.protein],
            ['A, g', scaled.carbs],
            ['R, g', scaled.fat],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="eyebrow">{label}</p>
              <p className="stat-num mt-1 text-xl text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          loading={saving}
          disabled={amount <= 0}
          onClick={async () => {
            setSaving(true)
            try {
              await onPick({
                title: `${selected.name}, ${amount} g`,
                grams: amount,
                kcal: scaled.kcal,
                proteinG: scaled.protein,
                carbsG: scaled.carbs,
                fatG: scaled.fat,
              })
            } finally {
              setSaving(false)
            }
          }}
        >
          Pridėti {scaled.kcal} kcal
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti produkto…" className="pl-9" autoFocus />
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={group === null} onClick={() => setGroup(null)}>Viskas</Chip>
        {(Object.keys(FOOD_GROUP_LABELS) as FoodGroup[]).map((key) => (
          <Chip key={key} active={group === key} onClick={() => setGroup(group === key ? null : key)}>
            {FOOD_GROUP_LABELS[key]}
          </Chip>
        ))}
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {results.length === 0 && (
          <p className="px-1 py-4 text-sm text-muted-foreground">
            Nieko nerasta. Įrašykite savo valgį gretimoje skiltyje.
          </p>
        )}

        {results.map((food, i) => (
          <motion.button
            key={food.name}
            type="button"
            onClick={() => { setSelected(food); setGrams('100') }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.012, 0.2), duration: 0.2, ease: easeOutQuint }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150 hover:bg-muted"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{food.name}</span>
            <span className="mono shrink-0 text-xs text-foreground">{food.kcal}</span>
            <span className="mono shrink-0 text-xs text-muted-foreground">kcal/100g</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'mono rounded-md px-3 py-1 text-xs transition-colors duration-150',
        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
