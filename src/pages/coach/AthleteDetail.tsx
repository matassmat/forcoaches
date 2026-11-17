import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Mail, MapPin, Pencil, Phone, StickyNote, Target, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAthlete, updateAthlete } from '@/lib/athletes'
import { listAthletePrograms } from '@/lib/programs'
import { CopyButton } from '@/components/CopyButton'
import { MeasurementsPanel } from '@/components/MeasurementsPanel'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AthleteProfile, Program } from '@/types'

export function AthleteDetail({
  athlete: initial,
  onBack,
  onDeleted,
}: {
  athlete: AthleteProfile
  onBack: () => void
  onDeleted: () => void
}) {
  // Vietinė kopija, kad išsaugojus kortelė atsinaujintų iškart, nelaukiant
  // viso sąrašo perkrovimo.
  const [athlete, setAthlete] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const name = `${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim() || 'Be vardo'

  const load = useCallback(async () => {
    try {
      setPrograms(await listAthletePrograms(athlete.id))
    } catch {
      // Programų sąrašas, papildoma informacija, dėl jos puslapio negriauname.
    }
  }, [athlete.id])

  useEffect(() => { void load() }, [load])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAthlete(athlete.id)
      toast.success('Sportininkas ištrintas')
      onDeleted()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nepavyko ištrinti')
      setDeleting(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Visi sportininkai
      </button>

      <PageHeader
        eyebrow="Sportininkas"
        title={name}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Redaguoti
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="info">
        <TabsList className="mb-6">
          <TabsTrigger value="info">Informacija</TabsTrigger>
          <TabsTrigger value="progress">Progresas</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid items-start gap-4 sm:grid-cols-[3fr_2fr]">
            <div className="panel p-5">
              <p className="eyebrow mb-4">Kontaktai</p>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  {athlete.email || '-'}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  {athlete.phone || '-'}
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Target className="mt-0.5 h-4 w-4 shrink-0" />
                  {athlete.goal || 'Tikslas nenurodytas'}
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {athlete.location || 'Vieta nenurodyta'}
                </p>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <p className="eyebrow">Kaina už treniruotę</p>
                <p className="stat-num mt-2 text-2xl text-foreground">
                  {athlete.sessionPrice != null ? `${athlete.sessionPrice} €` : '-'}
                </p>
                {athlete.sessionPrice == null && (
                  <p className="mt-1 text-xs text-muted-foreground">Imama trenerio numatytoji</p>
                )}
              </div>
            </div>

            <div className="panel p-5">
              <p className="eyebrow mb-4">Būsena</p>
              <Badge variant={athlete.status === 'active' ? 'success' : athlete.status === 'invited' ? 'warning' : 'secondary'}>
                {athlete.status === 'active' ? 'Aktyvus' : athlete.status === 'invited' ? 'Pakviestas' : 'Neaktyvus'}
              </Badge>

              {!athlete.inviteUsed && (
                <div className="mt-4 flex items-center justify-between rounded-md border border-dashed border-border bg-muted/60 py-2 pl-4 pr-2">
                  <div>
                    <p className="eyebrow">Pakvietimo kodas</p>
                    <p className="code text-lg tracking-[0.2em] text-foreground">{athlete.inviteCode}</p>
                  </div>
                  <CopyButton value={athlete.inviteCode} />
                </div>
              )}
            </div>

            <div className="panel p-5 sm:col-span-2">
              <p className="eyebrow mb-3 flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Pastabos
              </p>
              {athlete.notes
                ? <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{athlete.notes}</p>
                : <p className="text-sm text-muted-foreground">Pastabų nėra. Traumos, ribojimai, ką reikia atsiminti.</p>}
            </div>

            <div className="panel p-5 sm:col-span-2">
              <p className="eyebrow mb-4">Priskirtos programos</p>
              {programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Programų dar nepriskirta.</p>
              ) : (
                <ul className="space-y-2">
                  {programs.map((program) => (
                    <li key={program.id} className="text-sm text-foreground">{program.title}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <MeasurementsPanel athleteId={athlete.id} />
        </TabsContent>
      </Tabs>

      <EditAthleteDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        athlete={athlete}
        onSaved={(patch) => setAthlete((current) => ({ ...current, ...patch }))}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ištrinti {name}?</DialogTitle>
            <DialogDescription>
              Kartu bus ištrinti jo matavimai, rezervacijos, programos ir mitybos planai.
              Šio veiksmo atšaukti negalima.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Atšaukti</Button>
            <Button variant="destructive" loading={deleting} onClick={handleDelete}>Ištrinti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditAthleteDialog({
  open, onOpenChange, athlete, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  athlete: AthleteProfile
  onSaved: (patch: Partial<AthleteProfile>) => void
}) {
  const [firstName, setFirstName] = useState(athlete.firstName ?? '')
  const [lastName, setLastName] = useState(athlete.lastName ?? '')
  const [email, setEmail] = useState(athlete.email ?? '')
  const [phone, setPhone] = useState(athlete.phone ?? '')
  const [price, setPrice] = useState(athlete.sessionPrice != null ? String(athlete.sessionPrice) : '')
  const [location, setLocation] = useState(athlete.location ?? '')
  const [goal, setGoal] = useState(athlete.goal ?? '')
  const [notes, setNotes] = useState(athlete.notes ?? '')
  const [saving, setSaving] = useState(false)

  // Atidarius iš naujo laukai turi rodyti tai, kas yra dabar.
  useEffect(() => {
    if (!open) return
    setFirstName(athlete.firstName ?? '')
    setLastName(athlete.lastName ?? '')
    setEmail(athlete.email ?? '')
    setPhone(athlete.phone ?? '')
    setPrice(athlete.sessionPrice != null ? String(athlete.sessionPrice) : '')
    setLocation(athlete.location ?? '')
    setGoal(athlete.goal ?? '')
    setNotes(athlete.notes ?? '')
  }, [open, athlete])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const priceNum = price.trim() ? Number(price.replace(',', '.')) : null
    if (priceNum !== null && Number.isNaN(priceNum)) {
      toast.error('Neteisinga kaina')
      return
    }

    const patch = {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      sessionPrice: priceNum,
      location: location.trim() || null,
      goal: goal.trim() || null,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      await updateAthlete(athlete.id, patch)
      onSaved(patch)
      onOpenChange(false)
      toast.success('Išsaugota')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nepavyko išsaugoti')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redaguoti kortelę</DialogTitle>
          <DialogDescription>Kaina ir vieta automatiškai užpildo naujos treniruotės formą.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-first">Vardas</Label>
              <Input id="e-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-last">Pavardė</Label>
              <Input id="e-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-email">El. paštas</Label>
              <Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-phone">Telefonas</Label>
              <Input id="e-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-price">Kaina, €</Label>
              <Input
                id="e-price"
                inputMode="decimal"
                className="mono"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="tuščia, numatytoji"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-loc">Vieta</Label>
              <Input id="e-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-goal">Tikslas</Label>
            <Input id="e-goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-notes">Pastabos</Label>
            <Textarea id="e-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
