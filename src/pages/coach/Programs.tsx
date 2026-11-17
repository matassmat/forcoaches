import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ClipboardList, Copy, Plus, Trash2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { listAthletes } from '@/lib/athletes'
import {
  addDay, addExercise, assignTemplate, createProgram, deleteDay, deleteExercise, deleteProgram,
  getFullProgram, listPrograms, type FullProgram,
} from '@/lib/programs'
import { exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { ExercisePicker } from '@/components/ExercisePicker'
import { PageHeader } from '@/components/PageHeader'
import { ProgramExerciseRow } from '@/components/ProgramExerciseRow'
import { ExerciseInfoDialog, useExerciseCatalog } from '@/components/exercise/ExerciseInfo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { AthleteProfile, Program } from '@/types'
import { errorMessage } from '@/lib/errors'

export function CoachPrograms() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [programList, athleteList] = await Promise.all([listPrograms(user.id), listAthletes(user.id)])
      setPrograms(programList)
      setAthletes(athleteList)
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti programų'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  if (openId) {
    return <ProgramEditor programId={openId} athletes={athletes} onBack={() => { setOpenId(null); void load() }} />
  }

  const athleteName = (id: string | null | undefined) => {
    if (!id) return null
    const athlete = athletes.find((a) => a.id === id)
    return athlete ? `${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim() || 'Be vardo' : null
  }

  return (
    <div>
      <PageHeader
        title="Treniruočių programos"
        subtitle="Šablonus rašote kartą ir priskiriate keliems sportininkams"
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nauja programa</Button>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : programs.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList className="h-6 w-6" />}
          title="Programų dar nėra"
          text="Pradėkite nuo šablono. Jį galėsite priskirti bet kuriam sportininkui."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nauja programa</Button>}
        />
      ) : (
        <motion.div variants={staggerParent} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {programs.map((program) => (
              <motion.button
                key={program.id}
                layout
                variants={riseItem}
                exit={{ opacity: 0, scale: 0.96, transition: exit }}
                type="button"
                onClick={() => setOpenId(program.id)}
                className="panel card-lift flex flex-col items-stretch justify-start p-5 text-left"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-lg text-foreground">{program.title}</h2>
                  <Badge variant={program.isTemplate ? 'secondary' : 'success'}>
                    {program.isTemplate ? 'Šablonas' : 'Priskirta'}
                  </Badge>
                </div>
                {program.description && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{program.description}</p>
                )}
                {athleteName(program.athleteId) && (
                  <p className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    {athleteName(program.athleteId)}
                  </p>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateProgramDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        coachId={user?.id}
        athletes={athletes}
        onCreated={(program) => { setPrograms((list) => [program, ...list]); setOpenId(program.id) }}
      />
    </div>
  )
}

// ── Programos redaktorius ─────────────────────────────────────────────

function ProgramEditor({
  programId, athletes, onBack,
}: {
  programId: string
  athletes: AthleteProfile[]
  onBack: () => void
}) {
  const { user } = useAuth()
  const [program, setProgram] = useState<FullProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [dayTitle, setDayTitle] = useState('')
  const [pickerDay, setPickerDay] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [infoName, setInfoName] = useState<string | null>(null)
  const catalog = useExerciseCatalog()

  const load = useCallback(async () => {
    try {
      setProgram(await getFullProgram(programId))
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti programos'))
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => { void load() }, [load])

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!program || !dayTitle.trim()) return
    try {
      await addDay(program.id, dayTitle, program.days.length)
      setDayTitle('')
      await load()
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko pridėti dienos'))
    }
  }

  const handleAddExercise = async (name: string) => {
    if (!pickerDay || !program) return
    const day = program.days.find((d) => d.id === pickerDay)
    try {
      await addExercise({
        programDayId: pickerDay,
        name,
        sets: 3,
        reps: '10',
        exerciseOrder: day?.exercises.length ?? 0,
      })
      setPickerDay(null)
      await load()
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko pridėti pratimo'))
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />
  if (!program) return <EmptyPanel icon={<ClipboardList className="h-6 w-6" />} title="Programa nerasta" text="Ji galėjo būti ištrinta." />

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Visos programos
      </button>

      <PageHeader
        eyebrow={program.isTemplate ? 'Šablonas' : 'Priskirta programa'}
        title={program.title}
        subtitle={program.description ?? undefined}
        action={
          <div className="flex gap-2">
            {program.isTemplate && (
              <Button variant="outline" onClick={() => setAssignOpen(true)}>
                <Copy className="h-4 w-4" />
                Priskirti
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                await deleteProgram(program.id)
                toast.success('Programa ištrinta')
                onBack()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <motion.div variants={staggerParent} initial="hidden" animate="visible" className="space-y-4">
        <AnimatePresence mode="popLayout">
          {program.days.map((day) => (
            <motion.section
              key={day.id}
              layout
              variants={riseItem}
              exit={{ opacity: 0, scale: 0.98, transition: exit }}
              className="panel overflow-hidden"
            >
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="flex-1 text-base text-foreground">{day.title}</h2>
                <span className="mono text-xs text-muted-foreground">{day.exercises.length} pratimai</span>
                <button
                  type="button"
                  onClick={async () => { await deleteDay(day.id); await load() }}
                  aria-label={`Ištrinti dieną ${day.title}`}
                  className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-border">
                {day.exercises.map((exercise, index) => (
                  <ProgramExerciseRow
                    key={exercise.id}
                    index={index}
                    exercise={exercise}
                    item={catalog.ready ? catalog.find(exercise.name) : undefined}
                    onInfo={() => setInfoName(exercise.name)}
                    onDelete={async () => { await deleteExercise(exercise.id); await load() }}
                  />
                ))}
              </div>

              <div className="border-t border-border p-3">
                <Button variant="ghost" size="sm" onClick={() => setPickerDay(day.id)}>
                  <Plus className="h-4 w-4" />
                  Pridėti pratimą
                </Button>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>

        <form onSubmit={handleAddDay} className="panel flex gap-2 p-3">
          <Input
            value={dayTitle}
            onChange={(e) => setDayTitle(e.target.value)}
            placeholder="Nauja diena, pvz. „A diena, kojos“"
          />
          <Button type="submit" disabled={!dayTitle.trim()}>
            <Plus className="h-4 w-4" />
            Diena
          </Button>
        </form>
      </motion.div>

      <Dialog open={pickerDay !== null} onOpenChange={(open) => !open && setPickerDay(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pridėti pratimą</DialogTitle>
            <DialogDescription>
              873 pratimai su judesiu, raumenų schema ir aprašymu. Galite sukurti ir savo pratimą su vaizdo įrašu.
            </DialogDescription>
          </DialogHeader>
          <ExercisePicker onPick={handleAddExercise} />
        </DialogContent>
      </Dialog>

      <ExerciseInfoDialog
        name={infoName}
        item={infoName ? catalog.find(infoName) : null}
        onClose={() => setInfoName(null)}
      />

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        athletes={athletes}
        onAssign={async (athleteId) => {
          if (!user) return
          await assignTemplate(program.id, athleteId, user.id)
          toast.success('Programa priskirta')
          setAssignOpen(false)
        }}
      />
    </div>
  )
}

function CreateProgramDialog({
  open, onOpenChange, coachId, athletes, onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coachId?: string
  athletes: AthleteProfile[]
  onCreated: (program: Program) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [athleteId, setAthleteId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachId) return
    setSaving(true)
    try {
      const program = await createProgram({
        coachId,
        title,
        description,
        athleteId: athleteId || null,
      })
      onCreated(program)
      onOpenChange(false)
      setTitle(''); setDescription(''); setAthleteId('')
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko sukurti'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nauja programa</DialogTitle>
          <DialogDescription>
            Nepasirinkus sportininko programa lieka šablonu, kurį galėsite priskirti vėliau.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-title">Pavadinimas</Label>
            <Input id="p-title" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pvz. Jėgos ciklas, 8 sav." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">Aprašymas <span className="font-normal text-muted-foreground">(nebūtina)</span></Label>
            <Textarea id="p-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-athlete">Sportininkas</Label>
            <select
              id="p-athlete"
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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit" loading={saving}>Sukurti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssignDialog({
  open, onOpenChange, athletes, onAssign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  athletes: AthleteProfile[]
  onAssign: (athleteId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Priskirti sportininkui</DialogTitle>
          <DialogDescription>
            Sukuriama atskira kopija, vėliau ją taisant šablonas nepasikeis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {athletes.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Sportininkų dar nėra.</p>
          )}
          {athletes.map((athlete) => (
            <button
              key={athlete.id}
              type="button"
              disabled={busy !== null}
              onClick={async () => {
                setBusy(athlete.id)
                try { await onAssign(athlete.id) } finally { setBusy(null) }
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors duration-150 hover:bg-muted disabled:opacity-50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-medium text-foreground">
                {`${athlete.firstName?.[0] ?? ''}${athlete.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
              </span>
              <span className="flex-1 truncate font-medium text-foreground">
                {`${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim() || 'Be vardo'}
              </span>
              {busy === athlete.id && <span className="mono text-xs text-muted-foreground">…</span>}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
