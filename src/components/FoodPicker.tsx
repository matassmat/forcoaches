import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ScanBarcode, Search } from 'lucide-react'
import { toast } from 'sonner'
import { FOOD_GROUP_LABELS, scaleFood, type FoodGroup } from '@/data/foods'
import {
  findByBarcode, getRecentFoods, loadStoreFoods, rememberFood, searchFoods, type FoodItem,
} from '@/lib/foodDb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { easeOutQuint } from '@/lib/motion'
import { cn, formatNum } from '@/lib/utils'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })))

export interface LoggedFood {
  title: string
  grams: number
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  food: FoodItem
}

/**
 * Produktų paieška su porcijos dydžiu. Žmogus įveda gramus arba vienetus,
 * o kalorijos ir makro apskaičiuojami, tad skaičių nereikia ieškoti pakuotėje.
 */
export function FoodPicker({
  onPick,
  actionLabel = 'Pridėti',
}: {
  onPick: (food: LoggedFood) => Promise<void> | void
  actionLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<FoodGroup | null>(null)
  const [store, setStore] = useState<FoodItem[] | null>(null)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [initialGrams, setInitialGrams] = useState<number | undefined>()
  const [scanning, setScanning] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [lookingUp, setLookingUp] = useState(false)
  const [recent, setRecent] = useState(getRecentFoods)

  useEffect(() => {
    loadStoreFoods().then(setStore).catch(() => setStore([]))
  }, [])

  const results = useMemo(() => searchFoods(query, { group, store }), [query, group, store])

  const open = (food: FoodItem, grams?: number) => { setSelected(food); setInitialGrams(grams) }

  const handleCode = useCallback(async (code: string) => {
    setLookingUp(true)
    try {
      const food = await findByBarcode(code)
      if (food) {
        setScanning(false)
        open(food)
      } else {
        toast.error(`Prekės ${code} duomenų bazėje nėra. Įrašykite ją skiltyje „Savas“.`)
        setScanKey((k) => k + 1)
      }
    } finally {
      setLookingUp(false)
    }
  }, [])

  if (selected) {
    return (
      <PortionForm
        food={selected}
        initialGrams={initialGrams}
        actionLabel={actionLabel}
        onBack={() => setSelected(null)}
        onConfirm={async (logged) => {
          await onPick(logged)
          rememberFood(selected, logged.grams)
          setRecent(getRecentFoods())
          setSelected(null)
        }}
      />
    )
  }

  if (scanning) {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setScanning(false)}>Atgal į paiešką</BackLink>
        <Suspense fallback={<Skeleton className="aspect-[4/3] w-full" />}>
          <BarcodeScanner key={scanKey} onCode={handleCode} busy={lookingUp} />
        </Suspense>
      </div>
    )
  }

  const showRecent = !query.trim() && !group && recent.length > 0

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti produkto ar prekės…" className="pl-9" autoFocus />
        </div>
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setScanning(true)} aria-label="Skenuoti brūkšninį kodą">
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={group === null} onClick={() => setGroup(null)}>Viskas</Chip>
        {(Object.keys(FOOD_GROUP_LABELS) as FoodGroup[]).map((key) => (
          <Chip key={key} active={group === key} onClick={() => setGroup(group === key ? null : key)}>
            {FOOD_GROUP_LABELS[key]}
          </Chip>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto pr-1">
        {showRecent && (
          <div className="mb-3">
            <p className="eyebrow px-3 pb-1">Neseniai</p>
            {recent.slice(0, 6).map((food, i) => (
              <FoodRow key={`r-${food.id}`} food={food} index={i} grams={food.lastGrams} onClick={() => open(food, food.lastGrams)} />
            ))}
            <p className="eyebrow px-3 pb-1 pt-3">Visi produktai</p>
          </div>
        )}

        {results.map((food, i) => (
          <FoodRow key={food.id} food={food} index={i} onClick={() => open(food)} />
        ))}

        {query.trim() && !store && (
          <p className="px-3 py-3 text-xs text-muted-foreground">Kraunamos parduotuvių prekės…</p>
        )}

        {results.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Nieko nerasta. Nuskenuokite brūkšninį kodą arba įrašykite valgį skiltyje „Savas“.
          </p>
        )}
      </div>

      <p className="text-[11px] leading-4 text-muted-foreground">
        Parduotuvių prekės: Open Food Facts (ODbL). Vertės 100 g produkto.
      </p>
    </div>
  )
}

function FoodRow({ food, index, grams, onClick }: { food: FoodItem; index: number; grams?: number; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.01, 0.15), duration: 0.2, ease: easeOutQuint }}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{food.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {food.source === 'store' ? (food.brand || 'Prekė') : FOOD_GROUP_LABELS[food.group ?? 'dish']}
          {grams ? ` · paskutinį kartą ${grams} g` : ''}
        </span>
      </span>
      <span className="mono shrink-0 text-right text-xs">
        <span className="text-foreground">{food.kcal}</span>
        <span className="text-muted-foreground"> kcal</span>
      </span>
    </motion.button>
  )
}

function PortionForm({
  food, initialGrams, actionLabel, onBack, onConfirm,
}: {
  food: FoodItem
  initialGrams?: number
  actionLabel: string
  onBack: () => void
  onConfirm: (food: LoggedFood) => Promise<void>
}) {
  const unit = food.unit
  // Jei produktas turi įprastą porciją, pradedama nuo jos: „1 kiaušinis“ suprantamiau nei „55 g“.
  const [mode, setMode] = useState<'g' | 'unit'>(unit && !initialGrams ? 'unit' : 'g')
  const [amount, setAmount] = useState(initialGrams ? String(initialGrams) : unit ? '1' : '100')
  const [saving, setSaving] = useState(false)

  const value = Number(amount.replace(',', '.')) || 0
  const grams = Math.round(mode === 'unit' && unit ? value * unit.grams : value)
  const scaled = scaleFood(food, grams)

  const switchMode = (next: 'g' | 'unit') => {
    if (next === mode || !unit) return
    setAmount(next === 'g' ? String(grams || 100) : String(Math.max(1, Math.round((grams / unit.grams) * 2) / 2)))
    setMode(next)
  }

  const portionText = mode === 'unit' && unit
    ? `${formatNum(value, 1)} × ${unit.label} (${grams} g)`
    : `${grams} g`

  return (
    <div className="space-y-4">
      <BackLink onClick={onBack}>Kitas produktas</BackLink>

      <div>
        <h3 className="text-lg text-foreground">{food.name}</h3>
        <p className="mono mt-1 text-xs text-muted-foreground">
          {food.brand ? `${food.brand} · ` : ''}100 g: {food.kcal} kcal · B {formatNum(food.protein, 1)} · A {formatNum(food.carbs, 1)} · R {formatNum(food.fat, 1)}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="fp-amount">Kiekis</Label>
          {unit && (
            <div className="flex rounded-md bg-muted p-0.5 text-xs">
              {(['unit', 'g'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    'rounded-[5px] px-2.5 py-1 transition-colors duration-150',
                    mode === m ? 'bg-card text-foreground shadow-[0_0_0_1px_hsl(var(--border))]' : 'text-muted-foreground'
                  )}
                >
                  {m === 'g' ? 'gramai' : unit.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          id="fp-amount"
          inputMode="decimal"
          className="mono text-lg"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {(mode === 'unit' ? [0.5, 1, 2, 3] : [50, 100, 150, 200, 250, 300]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className="mono rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {mode === 'unit' ? formatNum(q, 1) : `${q} g`}
            </button>
          ))}
        </div>
      </div>

      <div className="panel grid grid-cols-4 gap-2 p-4 text-center">
        {([
          ['kcal', scaled.kcal],
          ['B, g', scaled.protein],
          ['A, g', scaled.carbs],
          ['R, g', scaled.fat],
        ] as const).map(([label, v]) => (
          <div key={label}>
            <p className="eyebrow">{label}</p>
            <p className="stat-num mt-1 text-xl text-foreground">{formatNum(v, 1)}</p>
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        loading={saving}
        disabled={grams <= 0}
        onClick={async () => {
          setSaving(true)
          try {
            await onConfirm({
              title: `${food.name}, ${portionText}`,
              grams,
              kcal: scaled.kcal,
              proteinG: scaled.protein,
              carbsG: scaled.carbs,
              fatG: scaled.fat,
              food,
            })
          } finally {
            setSaving(false)
          }
        }}
      >
        {actionLabel} · {formatNum(scaled.kcal)} kcal
      </Button>
    </div>
  )
}

function BackLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </button>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md px-3 py-1 text-xs transition-colors duration-150',
        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
