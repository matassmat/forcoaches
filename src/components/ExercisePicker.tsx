import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  displayName, EQUIPMENT_LABELS, MUSCLE_LABELS, searchExercises,
  type Equipment, type MuscleGroup,
} from '@/data/exercises'
import { useAuth } from '@/contexts/AuthContext'
import {
  ExerciseInfo, ExerciseThumb, exerciseTitle, useExerciseCatalog, type AnyExercise,
} from '@/components/exercise/ExerciseInfo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { saveCustomExercise, youtubeId } from '@/lib/customExercises'
import { errorMessage } from '@/lib/errors'
import { easeOutQuint } from '@/lib/motion'
import { matches } from '@/lib/search'
import { cn } from '@/lib/utils'

type View = { kind: 'list' } | { kind: 'detail'; item: AnyExercise } | { kind: 'create'; name: string }

/**
 * Pratimų paieška: biblioteka su judančiais paveikslėliais, raumenų schema
 * ir trenerio savi pratimai su vaizdo įrašais. Paspaudus pratimą pirma
 * parodoma, kaip jį atlikti, tada jis pridedamas į programą.
 */
export function ExercisePicker({ onPick }: { onPick: (name: string) => void }) {
  const catalog = useExerciseCatalog()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [view, setView] = useState<View>({ kind: 'list' })

  const results = useMemo(
    () => (catalog.library ? searchExercises(catalog.library, query, { muscle, equipment }) : []),
    [catalog.library, query, muscle, equipment]
  )
  const customResults = useMemo(
    () => catalog.custom.filter((ex) =>
      (!muscle || ex.muscle === muscle) && (!equipment || ex.equipment === equipment) && matches(ex.name, query)
    ),
    [catalog.custom, query, muscle, equipment]
  )

  if (view.kind === 'detail') {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setView({ kind: 'list' })} />
        <div>
          <h3 className="text-xl text-foreground">{exerciseTitle(view.item)}</h3>
          {view.item.kind === 'library' && (
            <p className="mt-1 text-xs text-muted-foreground">
              {view.item.exercise.nameLt ? `${view.item.exercise.name} · ` : ''}{MUSCLE_LABELS[view.item.exercise.muscle]}
            </p>
          )}
        </div>
        <ExerciseInfo item={view.item} />
        <Button className="sticky bottom-0 w-full" onClick={() => onPick(exerciseTitle(view.item))}>
          Pridėti į programą
        </Button>
      </div>
    )
  }

  if (view.kind === 'create') {
    return (
      <CreateExerciseForm
        initialName={view.name}
        onBack={() => setView({ kind: 'list' })}
        onCreated={async (name) => {
          await catalog.refreshCustom()
          onPick(name)
        }}
      />
    )
  }

  const trimmed = query.trim()
  const exact = [...results, ...customResults.map((c) => ({ nameLt: c.name, name: c.name }))]
    .some((r) => (r.nameLt ?? r.name).toLowerCase() === trimmed.toLowerCase())

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti pratimo lietuviškai ar angliškai…" className="pl-9" autoFocus />
      </div>

      <ChipRow>
        <Chip active={muscle === null} onClick={() => setMuscle(null)}>Visos grupės</Chip>
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((key) => (
          <Chip key={key} active={muscle === key} onClick={() => setMuscle(muscle === key ? null : key)}>{MUSCLE_LABELS[key]}</Chip>
        ))}
      </ChipRow>

      <ChipRow>
        <Chip active={equipment === null} onClick={() => setEquipment(null)}>Visas inventorius</Chip>
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((key) => (
          <Chip key={key} active={equipment === key} onClick={() => setEquipment(equipment === key ? null : key)}>{EQUIPMENT_LABELS[key]}</Chip>
        ))}
      </ChipRow>

      {!catalog.ready && (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      )}

      {catalog.ready && (
        <>
          <p className="text-xs tabular-nums text-muted-foreground">
            {results.length + customResults.length} pratimų · užveskite pelę ant paveikslėlio, kad pamatytumėte judesį
          </p>

          <div className="max-h-[24rem] space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setView({ kind: 'create', name: trimmed })}
              className="flex w-full items-center gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              {trimmed && !exact
                ? <span>Sukurti savo pratimą „<span className="font-medium">{trimmed}</span>“</span>
                : 'Sukurti savo pratimą su vaizdo įrašu'}
            </button>

            {customResults.map((ex, i) => (
              <Row key={ex.id} item={{ kind: 'custom', exercise: ex }} index={i} onOpen={(item) => setView({ kind: 'detail', item })} />
            ))}

            {results.slice(0, 120).map((exercise, i) => (
              <Row
                key={exercise.id}
                item={{ kind: 'library', exercise }}
                index={i + customResults.length}
                onOpen={(item) => setView({ kind: 'detail', item })}
              />
            ))}

            {results.length > 120 && (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                Rodoma 120 iš {results.length}, patikslinkite paiešką
              </p>
            )}

            {results.length + customResults.length === 0 && (
              <p className="px-1 py-4 text-sm text-muted-foreground">Nieko nerasta. Sukurkite savo pratimą.</p>
            )}

            {trimmed && !exact && (
              <button
                type="button"
                onClick={() => onPick(trimmed)}
                className="w-full px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
              >
                Arba pridėti tik pavadinimą „{trimmed}“ be aprašymo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Row({ item, index, onOpen }: { item: AnyExercise; index: number; onOpen: (item: AnyExercise) => void }) {
  const muscle = item.exercise.muscle
  const equipment = item.exercise.equipment
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.01, 0.15), duration: 0.2, ease: easeOutQuint }}
      className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-muted"
    >
      <ExerciseThumb item={item} className="h-12 w-16" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm text-foreground">
          {item.kind === 'custom' && <Star className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Jūsų pratimas" />}
          <span className="truncate">{item.kind === 'library' ? displayName(item.exercise) : item.exercise.name}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {MUSCLE_LABELS[muscle] ?? ''} · {EQUIPMENT_LABELS[equipment] ?? 'Kita'}
          {item.kind === 'library' && item.exercise.nameLt ? ` · ${item.exercise.name}` : ''}
        </span>
      </span>
    </motion.button>
  )
}

function CreateExerciseForm({
  initialName, onBack, onCreated,
}: {
  initialName: string
  onBack: () => void
  onCreated: (name: string) => Promise<void>
}) {
  const { user } = useAuth()
  const [name, setName] = useState(initialName)
  const [muscle, setMuscle] = useState<MuscleGroup>('fullbody')
  const [equipment, setEquipment] = useState<Equipment>('other')
  const [videoUrl, setVideoUrl] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)

  const videoOk = !videoUrl.trim() || Boolean(youtubeId(videoUrl))

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!user || !videoOk) return
        setSaving(true)
        try {
          const saved = await saveCustomExercise({
            coachId: user.id, name, muscle, equipment, videoUrl: videoUrl || null, imageUrl: null, instructions: instructions || null,
          })
          toast.success('Pratimas sukurtas')
          await onCreated(saved.name)
        } catch (err) {
          toast.error(errorMessage(err, 'Nepavyko sukurti pratimo'))
        } finally {
          setSaving(false)
        }
      }}
    >
      <BackLink onClick={onBack} />
      <div>
        <h3 className="text-lg text-foreground">Savas pratimas</h3>
        <p className="mt-1 text-sm text-muted-foreground">Jį matysite jūs ir jūsų sportininkai, galėsite naudoti visose programose.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ce-name">Pavadinimas</Label>
        <Input id="ce-name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="pvz. Klubų kėlimas ant suolo su guma" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ce-muscle">Pagrindinė raumenų grupė</Label>
          <Select id="ce-muscle" value={muscle} onChange={(v) => setMuscle(v as MuscleGroup)} options={MUSCLE_LABELS} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ce-eq">Inventorius</Label>
          <Select id="ce-eq" value={equipment} onChange={(v) => setEquipment(v as Equipment)} options={EQUIPMENT_LABELS} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ce-video">Vaizdo įrašas YouTube (nebūtina)</Label>
        <Input id="ce-video" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." aria-invalid={!videoOk} />
        {!videoOk && <p className="text-xs text-destructive">Įklijuokite YouTube nuorodą, pvz. https://youtu.be/abc123XYZ00</p>}
        <p className="text-xs text-muted-foreground">Galite įkelti savo filmuotą pratimą į YouTube kaip „Neįtrauktas į sąrašą“ ir įklijuoti nuorodą.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ce-instr">Kaip atlikti (nebūtina)</Label>
        <Textarea id="ce-instr" rows={4} maxLength={4000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Pradinė padėtis, judesys, į ką atkreipti dėmesį." />
      </div>

      <Button type="submit" className="w-full" loading={saving} disabled={!videoOk || name.trim().length < 2}>
        Sukurti ir pridėti į programą
      </Button>
    </form>
  )
}

function Select({ id, value, onChange, options }: { id: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
    >
      {Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Atgal į sąrašą
    </button>
  )
}

function ChipRow({ children }: { children: React.ReactNode }) {
  // Telefone žymos slenka horizontaliai, kad neužimtų pusės ekrano.
  return <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">{children}</div>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-md px-3 py-1 text-xs transition-colors duration-150',
        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
