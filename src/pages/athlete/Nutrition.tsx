import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Apple, ChevronLeft, ChevronRight, ImageOff, Link2Off, Pencil, Plus, Trash2, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import {
  addFoodLog, deleteFoodLog, getAthleteMealPlan, listFoodLog, MEAL_SLOTS, MEAL_SLOT_LABELS,
  sumMacros,
} from '@/lib/nutrition'
import { addDays, formatDateLt, toDateKey } from '@/lib/time'
import { easeOutQuint, enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { FoodPicker } from '@/components/FoodPicker'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatNum } from '@/lib/utils'
import type { FoodLogEntry, Meal, MealPlan, MealSlot } from '@/types'

export function AthleteNutrition() {
  const { athlete, loading: contextLoading } = useAthleteContext()
  const [plan, setPlan] = useState<(MealPlan & { meals: Meal[] }) | null>(null)
  const [entries, setEntries] = useState<FoodLogEntry[]>([])
  const [date, setDate] = useState(toDateKey(new Date()))
  const [loading, setLoading] = useState(true)
  const [addSlot, setAddSlot] = useState<MealSlot | null>(null)

  const load = useCallback(async () => {
    if (!athlete) return
    try {
      const [planData, log] = await Promise.all([
        getAthleteMealPlan(athlete.id),
        listFoodLog(athlete.id, date),
      ])
      setPlan(planData)
      setEntries(log)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko įkelti mitybos')
    } finally {
      setLoading(false)
    }
  }, [athlete, date])

  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => sumMacros(entries), [entries])

  const handleDelete = async (id: string) => {
    const previous = entries
    setEntries((list) => list.filter((entry) => entry.id !== id))
    try {
      await deleteFoodLog(id)
    } catch (e) {
      setEntries(previous)
      toast.error(e instanceof Error ? e.message : 'Nepavyko ištrinti')
    }
  }

  if (contextLoading || loading) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Mityba" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div>
        <PageHeader eyebrow="Sportininko sritis" title="Mityba" />
        <EmptyPanel
          icon={<Link2Off className="h-6 w-6" />}
          title="Paskyra nesusieta su treneriu"
          text="Registruojantis nebuvo panaudotas pakvietimo kodas. Paprašykite trenerio naujo kodo."
        />
      </div>
    )
  }

  const macros = [
    { label: 'Baltymai', value: totals.protein, target: plan?.targetProteinG ?? null, unit: 'g' },
    { label: 'Angliavandeniai', value: totals.carbs, target: plan?.targetCarbsG ?? null, unit: 'g' },
    { label: 'Riebalai', value: totals.fat, target: plan?.targetFatG ?? null, unit: 'g' },
  ]

  return (
    <div>
      <PageHeader
        title="Mityba"
        subtitle={plan ? plan.title : 'Trenerio plano dar nėra, bet valgius žymėtis jau galite.'}
      />

      {/* Dienos perjungimas */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" onClick={() => setDate(toDateKey(addDays(new Date(date), -1)))} aria-label="Ankstesnė diena">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium text-foreground">{formatDateLt(date)}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDate(toDateKey(addDays(new Date(date), 1)))}
          disabled={date >= toDateKey(new Date())}
          aria-label="Kita diena"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dienos suvestinė */}
      <div className="panel mb-6 p-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Suvalgyta</p>
            <p className="stat-num mt-2 flex items-baseline gap-2 text-4xl text-foreground">
              {formatNum(totals.kcal)}
              {plan?.targetKcal != null && (
                <span className="text-base font-medium text-muted-foreground">/ {formatNum(plan.targetKcal)} kcal</span>
              )}
              {plan?.targetKcal == null && <span className="text-base font-medium text-muted-foreground">kcal</span>}
            </p>
          </div>

          {plan?.targetKcal != null && (
            <p className={cn(
              'mono text-sm',
              totals.kcal > plan.targetKcal ? 'text-destructive' : 'text-foreground'
            )}>
              {totals.kcal > plan.targetKcal ? '+' : ''}{Math.round(totals.kcal - plan.targetKcal)}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {macros.map((macro, i) => {
            const ratio = macro.target ? Math.min(1, macro.value / macro.target) : 0
            return (
              <div key={macro.label}>
                <div className="mb-2 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{macro.label}</span>
                  <span className="mono text-foreground">
                    {Math.round(macro.value)}
                    {macro.target != null && <span className="text-muted-foreground">/{macro.target}</span>}
                    {macro.unit}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: ratio }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: easeOutQuint }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Valgiai pagal dienos metą */}
      <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-4">
        {MEAL_SLOTS.map((slot) => {
          const slotEntries = entries.filter((entry) => entry.slot === slot)
          const planned = plan?.meals.filter((meal) => meal.slot === slot) ?? []
          const slotKcal = slotEntries.reduce((sum, entry) => sum + entry.kcal, 0)

          return (
            <motion.section key={slot} variants={riseItem} className="panel overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="flex-1 text-base text-foreground">{MEAL_SLOT_LABELS[slot]}</h2>
                {slotKcal > 0 && <span className="mono text-xs text-foreground">{slotKcal} kcal</span>}
                <Button variant="ghost" size="sm" onClick={() => setAddSlot(slot)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {planned.length > 0 && (
                <div className="border-b border-dashed border-border px-5 py-3">
                  <p className="eyebrow mb-3">Trenerio siūlymas</p>
                  <div className="space-y-2">
                    {planned.map((meal) => (
                      <div key={meal.id} className="flex items-center gap-3">
                        <MealThumb url={meal.imageUrl} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{meal.title}</p>
                          {meal.kcal != null && (
                            <p className="mono text-xs text-muted-foreground">{meal.kcal} kcal</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {slotEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0, transition: enter }}
                      exit={{ opacity: 0, height: 0, transition: exit }}
                      className="group flex items-center gap-3 px-5 py-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{entry.title}</span>
                      <span className="mono shrink-0 text-xs text-foreground">{entry.kcal} kcal</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        aria-label={`Ištrinti ${entry.title}`}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {slotEntries.length === 0 && (
                  <p className="px-5 py-4 text-sm text-muted-foreground">Dar nieko nepažymėta.</p>
                )}
              </div>
            </motion.section>
          )
        })}
      </motion.div>

      <AddFoodDialog
        slot={addSlot}
        onClose={() => setAddSlot(null)}
        athleteId={athlete.id}
        date={date}
        suggestions={plan?.meals ?? []}
        onAdded={(entry) => setEntries((list) => [...list, entry])}
      />
    </div>
  )
}

function MealThumb({ url }: { url?: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </span>
    )
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-md object-cover"
    />
  )
}

function AddFoodDialog({
  slot, onClose, athleteId, date, suggestions, onAdded,
}: {
  slot: MealSlot | null
  onClose: () => void
  athleteId: string
  date: string
  suggestions: Meal[]
  onAdded: (entry: FoodLogEntry) => void
}) {
  const [title, setTitle] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  const slotSuggestions = slot ? suggestions.filter((meal) => meal.slot === slot) : []

  const reset = () => { setTitle(''); setKcal(''); setProtein(''); setCarbs(''); setFat('') }

  const submit = async (values: {
    title: string; kcal: number; proteinG?: number | null; carbsG?: number | null
    fatG?: number | null; grams?: number | null
  }) => {
    if (!slot) return
    onAdded(await addFoodLog({ athleteId, loggedOn: date, slot, ...values }))
    onClose()
    reset()
  }

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const kcalNum = Number(kcal.replace(',', '.'))
    if (!title.trim() || Number.isNaN(kcalNum) || kcalNum <= 0) {
      toast.error('Įrašykite pavadinimą ir kalorijas')
      return
    }
    const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null)
    setSaving(true)
    try {
      await submit({ title: title.trim(), kcal: Math.round(kcalNum), proteinG: num(protein), carbsG: num(carbs), fatG: num(fat) })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko pridėti')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={slot !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{slot ? MEAL_SLOT_LABELS[slot] : ''}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={slotSuggestions.length > 0 ? 'plan' : 'food'}>
          <TabsList className="mb-4">
            {slotSuggestions.length > 0 && (
              <TabsTrigger value="plan">
                <Utensils className="mr-2 h-4 w-4" />
                Iš plano
              </TabsTrigger>
            )}
            <TabsTrigger value="food">
              <Apple className="mr-2 h-4 w-4" />
              Produktai
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Pencil className="mr-2 h-4 w-4" />
              Savas
            </TabsTrigger>
          </TabsList>

          {slotSuggestions.length > 0 && (
            <TabsContent value="plan">
              <div className="space-y-2">
                {slotSuggestions.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true)
                      try {
                        await submit({
                          title: meal.title,
                          kcal: meal.kcal ?? 0,
                          proteinG: meal.proteinG,
                          carbsG: meal.carbsG,
                          fatG: meal.fatG,
                        })
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Nepavyko pridėti')
                      } finally {
                        setSaving(false)
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-md border border-border p-2 text-left transition-colors duration-150 hover:border-foreground/25 hover:bg-muted disabled:opacity-50"
                  >
                    <MealThumb url={meal.imageUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{meal.title}</span>
                      {meal.kcal != null && (
                        <span className="mono block text-xs text-muted-foreground">{meal.kcal} kcal</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="food">
            <FoodPicker
              onPick={async (food) => {
                try {
                  await submit(food)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Nepavyko pridėti')
                }
              }}
            />
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleManual} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="f-title">Ką valgėte</Label>
                <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pvz. Mamos cepelinai" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="f-kcal">kcal</Label>
                  <Input id="f-kcal" inputMode="numeric" className="mono" value={kcal} onChange={(e) => setKcal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-p">B, g</Label>
                  <Input id="f-p" inputMode="numeric" className="mono" value={protein} onChange={(e) => setProtein(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-c">A, g</Label>
                  <Input id="f-c" inputMode="numeric" className="mono" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-f">R, g</Label>
                  <Input id="f-f" inputMode="numeric" className="mono" value={fat} onChange={(e) => setFat(e.target.value)} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>Atšaukti</Button>
                <Button type="submit" loading={saving}>Pridėti</Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
