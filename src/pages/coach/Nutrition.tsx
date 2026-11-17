import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Apple, ArrowLeft, BookOpen, Calculator, ImageOff, Pencil, Plus, Salad, Trash2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { listAthletes } from '@/lib/athletes'
import {
  addMeal, createMealPlan, deleteMeal, deleteMealPlan, getMealPlan, listMealPlans,
  MEAL_SLOTS, MEAL_SLOT_LABELS, sumMacros, updateMealPlanTargets,
} from '@/lib/nutrition'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { PageHeader } from '@/components/PageHeader'
import { MacroCalculator } from '@/components/MacroCalculator'
import { MealBuilder } from '@/components/MealBuilder'
import { RecipePicker, type PickedMeal } from '@/components/RecipePicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNum } from '@/lib/utils'
import type { AthleteProfile, Meal, MealPlan, MealSlot } from '@/types'
import { errorMessage } from '@/lib/errors'

export function CoachNutrition() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [planList, athleteList] = await Promise.all([listMealPlans(user.id), listAthletes(user.id)])
      setPlans(planList)
      setAthletes(athleteList)
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti planų'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  if (openId) {
    return <PlanEditor planId={openId} onBack={() => { setOpenId(null); void load() }} />
  }

  const athleteName = (id: string | null | undefined) => {
    if (!id) return null
    const athlete = athletes.find((a) => a.id === id)
    return athlete ? `${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim() || 'Be vardo' : null
  }

  return (
    <div>
      <PageHeader
        title="Mitybos planai"
        subtitle="Dienos normos ir valgiaraštis, kurį sportininkas mato telefone"
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Naujas planas</Button>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyPanel
          icon={<Salad className="h-6 w-6" />}
          title="Mitybos planų dar nėra"
          text="Nustatykite dienos kalorijų ir makro normas. Sportininkas iškart matys, kiek jam liko."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Naujas planas</Button>}
        />
      ) : (
        <motion.div variants={staggerParent} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {plans.map((plan) => (
              <motion.button
                key={plan.id}
                layout
                variants={riseItem}
                exit={{ opacity: 0, scale: 0.96, transition: exit }}
                type="button"
                onClick={() => setOpenId(plan.id)}
                className="panel card-lift flex flex-col items-stretch justify-start p-5 text-left"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-lg text-foreground">{plan.title}</h2>
                  <Badge variant={plan.isTemplate ? 'secondary' : 'success'}>
                    {plan.isTemplate ? 'Šablonas' : 'Priskirta'}
                  </Badge>
                </div>

                {plan.targetKcal != null && (
                  <p className="stat-num text-2xl text-foreground">
                    {formatNum(plan.targetKcal)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">kcal / d.</span>
                  </p>
                )}

                {athleteName(plan.athleteId) && (
                  <p className="mono mt-3 flex items-center gap-2 text-xs text-foreground">
                    <UserCheck className="h-4 w-4" />
                    {athleteName(plan.athleteId)}
                  </p>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        coachId={user?.id}
        athletes={athletes}
        onCreated={(plan) => { setPlans((list) => [plan, ...list]); setOpenId(plan.id) }}
      />
    </div>
  )
}

function PlanEditor({ planId, onBack }: { planId: string; onBack: () => void }) {
  const [plan, setPlan] = useState<(MealPlan & { meals: Meal[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [addSlot, setAddSlot] = useState<MealSlot | null>(null)
  const [editTargets, setEditTargets] = useState(false)

  const load = useCallback(async () => {
    try {
      setPlan(await getMealPlan(planId))
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti plano'))
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => { void load() }, [load])

  if (loading) return <Skeleton className="h-64 w-full" />
  if (!plan) return <EmptyPanel icon={<Salad className="h-6 w-6" />} title="Planas nerastas" text="Jis galėjo būti ištrintas." />

  const planned = sumMacros(plan.meals.map((m) => ({ kcal: m.kcal ?? 0, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG })))
  const targets = [
    { label: 'Kalorijos', value: plan.targetKcal, planned: planned.kcal, unit: 'kcal' },
    { label: 'Baltymai', value: plan.targetProteinG, planned: planned.protein, unit: 'g' },
    { label: 'Angliavandeniai', value: plan.targetCarbsG, planned: planned.carbs, unit: 'g' },
    { label: 'Riebalai', value: plan.targetFatG, planned: planned.fat, unit: 'g' },
  ]

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Visi planai
      </button>

      <PageHeader
        eyebrow={plan.isTemplate ? 'Šablonas' : 'Priskirtas planas'}
        title={plan.title}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditTargets(true)}>
              <Calculator className="h-4 w-4" />
              Normos
            </Button>
            <Button
              variant="ghost"
              aria-label="Ištrinti planą"
              onClick={async () => { await deleteMealPlan(plan.id); toast.success('Planas ištrintas'); onBack() }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {targets.map((target) => (
          <div key={target.label} className="panel p-4">
            <p className="eyebrow">{target.label}</p>
            <p className="stat-num mt-2 text-2xl text-foreground">
              {target.value != null ? formatNum(target.value) : '-'}
              <span className="ml-1 text-xs font-medium text-muted-foreground">{target.unit}</span>
            </p>
            {plan.meals.length > 0 && (
              <p className="mono mt-2 text-xs text-muted-foreground">
                valgiuose {formatNum(target.planned)}
              </p>
            )}
          </div>
        ))}
      </div>

      <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-4">
        {MEAL_SLOTS.map((slot) => {
          const meals = plan.meals.filter((meal) => meal.slot === slot)
          return (
            <motion.section key={slot} variants={riseItem} className="panel overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="flex-1 text-base text-foreground">{MEAL_SLOT_LABELS[slot]}</h2>
                <Button variant="ghost" size="sm" onClick={() => setAddSlot(slot)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {meals.map((meal) => (
                    <motion.div
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0, transition: enter }}
                      exit={{ opacity: 0, height: 0, transition: exit }}
                      className="group flex items-start gap-3 px-5 py-3"
                    >
                      <MealThumb url={meal.imageUrl} alt={`${meal.title}, nuotrauka`} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{meal.title}</p>
                        <p className="mono mt-0.5 text-xs text-muted-foreground">
                          {meal.kcal != null ? `${meal.kcal} kcal` : 'kcal nenurodyta'}
                          {meal.proteinG != null && ` · B ${meal.proteinG}`}
                          {meal.carbsG != null && ` · A ${meal.carbsG}`}
                          {meal.fatG != null && ` · R ${meal.fatG}`}
                        </p>
                        {meal.ingredients && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {meal.ingredients.split('\n').join(' · ')}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => { await deleteMeal(meal.id); await load() }}
                        aria-label={`Ištrinti ${meal.title}`}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {meals.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">Valgių dar nėra.</p>}
              </div>
            </motion.section>
          )
        })}
      </motion.div>

      <TargetsDialog
        open={editTargets}
        onOpenChange={setEditTargets}
        plan={plan}
        onSaved={load}
      />

      <AddMealDialog
        slot={addSlot}
        onClose={() => setAddSlot(null)}
        planId={plan.id}
        nextOrder={plan.meals.length}
        onAdded={load}
      />
    </div>
  )
}

function CreatePlanDialog({
  open, onOpenChange, coachId, athletes, onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coachId?: string
  athletes: AthleteProfile[]
  onCreated: (plan: MealPlan) => void
}) {
  const [title, setTitle] = useState('')
  const [athleteId, setAthleteId] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachId) return
    const num = (v: string) => (v.trim() ? Math.round(Number(v.replace(',', '.'))) : null)
    setSaving(true)
    try {
      const plan = await createMealPlan({
        coachId,
        title,
        athleteId: athleteId || null,
        targetKcal: num(kcal),
        targetProteinG: num(protein),
        targetCarbsG: num(carbs),
        targetFatG: num(fat),
      })
      onCreated(plan)
      onOpenChange(false)
      setTitle(''); setAthleteId(''); setKcal(''); setProtein(''); setCarbs(''); setFat('')
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko sukurti'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Naujas mitybos planas</DialogTitle>
          <DialogDescription>Normos nebūtinos, bet be jų sportininkas nematys, kiek jam liko.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="n-title">Pavadinimas</Label>
            <Input id="n-title" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pvz. Masės rinkimas, 2800 kcal" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="n-athlete">Sportininkas</Label>
            <select
              id="n-athlete"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/25"
            >
              <option value="">- šablonas, be sportininko -</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'Be vardo'}
                </option>
              ))}
            </select>
          </div>

          {calcOpen ? (
            <MacroCalculator
              athleteId={athleteId || null}
              onApply={(t) => {
                setKcal(String(t.kcal)); setProtein(String(t.protein)); setCarbs(String(t.carbs)); setFat(String(t.fat))
                setCalcOpen(false)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCalcOpen(true)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <Calculator className="h-4 w-4" />
              Apskaičiuoti normas pagal svorį, ūgį ir tikslą
            </button>
          )}

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-2">
              <Label htmlFor="n-kcal">kcal</Label>
              <Input id="n-kcal" inputMode="numeric" className="mono" value={kcal} onChange={(e) => setKcal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-p">B, g</Label>
              <Input id="n-p" inputMode="numeric" className="mono" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-c">A, g</Label>
              <Input id="n-c" inputMode="numeric" className="mono" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-f">R, g</Label>
              <Input id="n-f" inputMode="numeric" className="mono" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit" loading={saving}>Sukurti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MealThumb({ url, alt }: { url?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-md object-cover"
    />
  )
}

function AddMealDialog({
  slot, onClose, planId, nextOrder, onAdded,
}: {
  slot: MealSlot | null
  onClose: () => void
  planId: string
  nextOrder: number
  onAdded: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  const num = (v: string) => (v.trim() ? Math.round(Number(v.replace(',', '.'))) : null)

  const save = async (meal: Partial<PickedMeal> & { title: string }) => {
    if (!slot) return
    await addMeal({
      mealPlanId: planId,
      slot,
      title: meal.title,
      kcal: meal.kcal ?? null,
      proteinG: meal.proteinG ?? null,
      carbsG: meal.carbsG ?? null,
      fatG: meal.fatG ?? null,
      imageUrl: meal.imageUrl ?? null,
      ingredients: meal.ingredients ?? null,
      recipe: meal.recipe ?? null,
      sourceId: meal.sourceId ?? null,
      mealOrder: nextOrder,
    })
    onClose()
    setTitle(''); setKcal(''); setProtein(''); setCarbs(''); setFat('')
    await onAdded()
  }

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await save({ title: title.trim(), kcal: num(kcal), proteinG: num(protein), carbsG: num(carbs), fatG: num(fat) })
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko pridėti'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={slot !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pridėti valgį, {slot ? MEAL_SLOT_LABELS[slot] : ''}</DialogTitle>
          <DialogDescription>
            Sudėkite iš produktų, paimkite receptą su nuotrauka arba įrašykite savo.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="builder">
          <TabsList className="mb-4">
            <TabsTrigger value="builder">
              <Apple className="mr-2 h-4 w-4" />
              Iš produktų
            </TabsTrigger>
            <TabsTrigger value="library">
              <BookOpen className="mr-2 h-4 w-4" />
              Receptai
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Pencil className="mr-2 h-4 w-4" />
              Savas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <MealBuilder
              onSave={async (meal) => {
                try {
                  await save(meal)
                  toast.success('Valgis pridėtas')
                } catch (err) {
                  toast.error(errorMessage(err, 'Nepavyko pridėti'))
                }
              }}
            />
          </TabsContent>

          <TabsContent value="library">
            <RecipePicker
              onPick={async (meal) => {
                try {
                  await save(meal)
                  toast.success('Pridėta į valgiaraštį')
                } catch (err) {
                  toast.error(errorMessage(err, 'Nepavyko pridėti'))
                }
              }}
            />
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleManual} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="m-title">Pavadinimas</Label>
                <Input id="m-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pvz. Avižinė košė su uogomis" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="mm-kcal">kcal</Label>
                  <Input id="mm-kcal" inputMode="numeric" className="mono" value={kcal} onChange={(e) => setKcal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mm-p">B, g</Label>
                  <Input id="mm-p" inputMode="numeric" className="mono" value={protein} onChange={(e) => setProtein(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mm-c">A, g</Label>
                  <Input id="mm-c" inputMode="numeric" className="mono" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mm-f">R, g</Label>
                  <Input id="mm-f" inputMode="numeric" className="mono" value={fat} onChange={(e) => setFat(e.target.value)} />
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

function TargetsDialog({
  open, onOpenChange, plan, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: MealPlan
  onSaved: () => Promise<void>
}) {
  const str = (v?: number | null) => (v != null ? String(v) : '')
  const [kcal, setKcal] = useState(str(plan.targetKcal))
  const [protein, setProtein] = useState(str(plan.targetProteinG))
  const [carbs, setCarbs] = useState(str(plan.targetCarbsG))
  const [fat, setFat] = useState(str(plan.targetFatG))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setKcal(str(plan.targetKcal)); setProtein(str(plan.targetProteinG))
    setCarbs(str(plan.targetCarbsG)); setFat(str(plan.targetFatG))
  }, [open, plan])

  const num = (v: string) => (v.trim() ? Math.round(Number(v.replace(',', '.'))) : null)

  const fields = [
    { id: 't-kcal', label: 'kcal', value: kcal, set: setKcal },
    { id: 't-p', label: 'B, g', value: protein, set: setProtein },
    { id: 't-c', label: 'A, g', value: carbs, set: setCarbs },
    { id: 't-f', label: 'R, g', value: fat, set: setFat },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Dienos normos</DialogTitle>
          <DialogDescription>Sportininkas mato, kiek jam liko iki šių skaičių.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              await updateMealPlanTargets(plan.id, {
                targetKcal: num(kcal), targetProteinG: num(protein), targetCarbsG: num(carbs), targetFatG: num(fat),
              })
              await onSaved()
              onOpenChange(false)
              toast.success('Normos išsaugotos')
            } catch (err) {
              toast.error(errorMessage(err, 'Nepavyko išsaugoti'))
            } finally {
              setSaving(false)
            }
          }}
        >
          <MacroCalculator
            athleteId={plan.athleteId}
            onApply={(t) => { setKcal(String(t.kcal)); setProtein(String(t.protein)); setCarbs(String(t.carbs)); setFat(String(t.fat)) }}
          />

          <div className="grid grid-cols-4 gap-2">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input id={field.id} inputMode="numeric" className="mono" value={field.value} onChange={(e) => field.set(e.target.value)} />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit" loading={saving}>Išsaugoti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
