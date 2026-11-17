import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Target, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { createAthlete, listAthletes } from '@/lib/athletes'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { AthleteDetail } from '@/pages/coach/AthleteDetail'
import { PageHeader } from '@/components/PageHeader'
import { CopyButton } from '@/components/CopyButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import type { AthleteProfile } from '@/types'
import { errorMessage } from '@/lib/errors'

const statusLabel: Record<AthleteProfile['status'], { text: string; variant: 'warning' | 'success' | 'secondary' }> = {
  invited: { text: 'Pakviestas', variant: 'warning' },
  active: { text: 'Aktyvus', variant: 'success' },
  inactive: { text: 'Neaktyvus', variant: 'secondary' },
}

export function CoachAthletes() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setAthletes(await listAthletes(user.id))
    } catch (error) {
      toast.error(errorMessage(error, 'Nepavyko įkelti sportininkų'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const open = athletes.find((a) => a.id === openId)
  if (open) {
    return (
      <AthleteDetail
        athlete={open}
        onBack={() => setOpenId(null)}
        onDeleted={() => {
          setAthletes((list) => list.filter((a) => a.id !== open.id))
          setOpenId(null)
        }}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Sportininkai"
        subtitle="Kiekvienam sugeneruojamas kodas, su kuriuo jis užsiregistruoja pats"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Pridėti sportininką
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : athletes.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {/* popLayout, ištrynus kortelę likusios sklandžiai užima jos vietą. */}
          <AnimatePresence mode="popLayout">
            {athletes.map((athlete) => (
              <motion.div key={athlete.id} layout variants={riseItem} exit={{ opacity: 0, scale: 0.96, transition: exit }}>
                <AthleteCard athlete={athlete} onOpen={() => setOpenId(athlete.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AddAthleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coachId={user?.id}
        onCreated={(athlete) => setAthletes((prev) => [athlete, ...prev])}
      />
    </div>
  )
}

function AthleteCard({ athlete, onOpen }: { athlete: AthleteProfile; onOpen: () => void }) {
  const status = statusLabel[athlete.status]
  const name = `${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim() || 'Be vardo'
  const initials = `${athlete.firstName?.[0] ?? ''}${athlete.lastName?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    // role + onKeyDown, o ne <button>: viduje yra kopijavimo mygtukas, o
    // mygtukas mygtuke yra neteisingas HTML.
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
      }}
      className="card-lift h-full cursor-pointer"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground/10 text-sm font-medium text-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{name}</p>
              {athlete.email && <p className="truncate text-xs text-muted-foreground">{athlete.email}</p>}
            </div>
          </div>
          <Badge variant={status.variant}>{status.text}</Badge>
        </div>

        {athlete.goal && (
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Target className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-2">{athlete.goal}</span>
          </p>
        )}

        {(athlete.sessionPrice != null || athlete.location) && (
          <div className="mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {athlete.sessionPrice != null && <span className="text-foreground">{athlete.sessionPrice} €</span>}
            {athlete.location && <span>{athlete.location}</span>}
          </div>
        )}

        {/* Kodas rodomas tik kol nepanaudotas, po registracijos jis nebeaktualus. */}
        {!athlete.inviteUsed && (
          <div className="mt-5 flex items-center justify-between rounded-md border border-dashed border-border bg-muted/60 py-2 pl-4 pr-2">
            <div className="min-w-0">
              <p className="eyebrow">Pakvietimo kodas</p>
              <p className="code text-lg tracking-[0.2em] text-foreground">{athlete.inviteCode}</p>
            </div>
            <CopyButton value={athlete.inviteCode} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: enter }}>
      <Card className="border-dashed">
        <CardContent className="grid place-items-center px-6 py-16 text-center">
          <span className="mb-5 grid h-16 w-16 place-items-center rounded-lg bg-foreground/10 text-foreground">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="text-xl text-foreground">Kol kas nė vieno sportininko</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Pridėkite pirmąjį, gausite kodą, kurį jam nusiųsite. Užsiregistravęs jis atsiras čia kaip aktyvus.
          </p>
          <Button className="mt-6" onClick={onAdd}>
            <UserPlus className="h-4 w-4" />
            Pridėti pirmą sportininką
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AddAthleteDialog({
  open,
  onOpenChange,
  coachId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coachId?: string
  onCreated: (athlete: AthleteProfile) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [goal, setGoal] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setBirthDate('')
    setGoal(''); setPrice(''); setLocation(''); setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachId) return
    setSubmitting(true)
    try {
      const priceNum = price.trim() ? Number(price.replace(',', '.')) : null
      if (priceNum !== null && Number.isNaN(priceNum)) {
        toast.error('Neteisinga kaina')
        setSubmitting(false)
        return
      }
      const athlete = await createAthlete({
        coachId, firstName, lastName, email, phone, birthDate, goal,
        sessionPrice: priceNum, location, notes,
      })
      onCreated(athlete)
      onOpenChange(false)
      reset()
      toast.success(`Pakvietimo kodas ${athlete.inviteCode}`)
    } catch (error) {
      toast.error(errorMessage(error, 'Nepavyko sukurti'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Naujas sportininkas</DialogTitle>
          <DialogDescription>
            Pakvietimo kodas sugeneruojamas automatiškai. Likusius duomenis sportininkas patikslins pats.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-first">Vardas</Label>
              <Input id="a-first" required autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-last">Pavardė</Label>
              <Input id="a-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-email">El. paštas</Label>
              <Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-phone">Telefonas</Label>
              <Input id="a-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-price">Kaina už treniruotę, €</Label>
              <Input
                id="a-price"
                inputMode="decimal"
                className="mono"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="tuščia, trenerio numatytoji"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-loc">Vieta</Label>
              <Input id="a-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="pvz. Ozo g. salė" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-birth">Gimimo data</Label>
              <Input id="a-birth" type="date" className="mono" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-goal">Tikslas</Label>
              <Input
                id="a-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="pvz. numesti 6 kg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-notes">Pastabos apie žmogų</Label>
            <Textarea
              id="a-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Traumos, ribojimai, ką reikia atsiminti"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Atšaukti
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? 'Kuriama…' : 'Sukurti ir gauti kodą'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
