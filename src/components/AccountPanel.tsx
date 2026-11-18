import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, KeyRound, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

/** Lentelės, kurias galima eksportuoti. Ką grąžinti, nusprendžia RLS taisyklės. */
const EXPORT_TABLES = [
  'users', 'coach_profiles', 'athlete_profiles', 'bookings', 'available_time_slots', 'measurements',
  'programs', 'program_days', 'program_exercises', 'exercise_logs', 'custom_exercises',
  'meal_plans', 'meals', 'food_log_entries', 'financial_records', 'notifications',
]

/**
 * Paskyros skiltis abiem rolėms: vardas ir telefonas, slaptažodžio
 * keitimas, duomenų atsisiuntimas ir paskyros ištrynimas.
 */
export function AccountPanel() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [password, setPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setPhone(user.phone ?? '')
  }, [user])

  if (!user) return null

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null })
        .eq('id', user.id)
      if (error) throw error
      // Atnaujina ir sesijos duomenis, tada vardas šoninėje juostoje pasikeičia iškart.
      await supabase.auth.updateUser({ data: { first_name: firstName.trim(), last_name: lastName.trim() } })
      toast.success('Duomenys išsaugoti')
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko išsaugoti'))
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Slaptažodis turi būti bent 8 simbolių.'); return }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      toast.success('Slaptažodis pakeistas')
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko pakeisti slaptažodžio'))
    } finally {
      setSavingPassword(false)
    }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const result: Record<string, unknown[]> = {}
      for (const table of EXPORT_TABLES) {
        const { data, error } = await supabase.from(table).select('*').limit(10000)
        if (!error) result[table] = data ?? []
      }
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), email: user.email, data: result }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forcoaches-duomenys-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko paruošti failo'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <p className="eyebrow mb-5">Asmeniniai duomenys</p>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ap-first">Vardas</Label>
              <Input id="ap-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-last">Pavardė</Label>
              <Input id="ap-last" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ap-phone">Telefonas <span className="text-muted-foreground">(nebūtina)</span></Label>
              <Input id="ap-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label>El. paštas</Label>
              <p className="flex h-10 items-center text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button type="submit" variant="outline" loading={savingProfile}>Išsaugoti</Button>
        </form>
      </section>

      <section className="panel p-6">
        <p className="eyebrow mb-5 flex items-center gap-2"><KeyRound className="h-4 w-4" />Slaptažodis</p>
        <form onSubmit={savePassword} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 space-y-2">
            <Label htmlFor="ap-pass">Naujas slaptažodis</Label>
            <Input id="ap-pass" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" loading={savingPassword} disabled={!password}>Pakeisti</Button>
        </form>
      </section>

      <section className="panel p-6">
        <p className="eyebrow mb-2">Jūsų duomenys</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Atsisiųskite viską, ką matote sistemoje, vienu JSON failu. Jį galima atsidaryti bet kokiu teksto redaktoriumi arba perkelti į kitą programą.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData} loading={exporting}>
            <Download className="h-4 w-4" />
            Atsisiųsti duomenis
          </Button>
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Ištrinti paskyrą
          </Button>
        </div>
      </section>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isCoach={role === 'coach'}
        onDeleted={async () => {
          await signOut()
          navigate('/', { replace: true })
          toast.success('Paskyra ištrinta')
        }}
      />
    </div>
  )
}

function DeleteAccountDialog({
  open, onOpenChange, isCoach, onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isCoach: boolean
  onDeleted: () => Promise<void>
}) {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const WORD = 'IŠTRINTI'

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setConfirm('') }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ištrinti paskyrą visam laikui?</DialogTitle>
          <DialogDescription>Šio veiksmo atšaukti negalima. Prieš tai galite atsisiųsti savo duomenis.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {isCoach ? (
            <>
              <li>Bus ištrinta jūsų paskyra, visų sportininkų kortelės, programos, mitybos planai, kalendorius ir finansų įrašai.</li>
              <li>Sportininkų paskyros liks, bet jie nebematys jūsų duomenų.</li>
            </>
          ) : (
            <>
              <li>Bus ištrinti jūsų matavimai, mitybos žymėjimai, atliktos serijos ir prisijungimas.</li>
              <li>Treneris pasiliks rezervacijų ir atsiskaitymų istoriją be jūsų kontaktų, nes ji reikalinga apskaitai.</li>
            </>
          )}
        </ul>

        <div className="space-y-2">
          <Label htmlFor="del-confirm">Patvirtinimui įrašykite <span className="code text-foreground">{WORD}</span></Label>
          <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
          <Button
            variant="destructive"
            loading={busy}
            disabled={confirm.trim().toUpperCase() !== WORD}
            onClick={async () => {
              setBusy(true)
              try {
                const { error } = await supabase.rpc('delete_my_account')
                if (error) throw error
                onOpenChange(false)
                await onDeleted()
              } catch (err) {
                toast.error(errorMessage(err, 'Nepavyko ištrinti paskyros'))
              } finally {
                setBusy(false)
              }
            }}
          >
            Ištrinti visam laikui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
