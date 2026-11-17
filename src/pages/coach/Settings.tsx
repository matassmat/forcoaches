import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getCoachProfile, updateCoachProfile } from '@/lib/coachProfile'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'

export function CoachSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clubName, setClubName] = useState('')
  const [bio, setBio] = useState('')
  const [price, setPrice] = useState('0')
  const [minutes, setMinutes] = useState('60')
  const [cancelHours, setCancelHours] = useState('24')

  const load = useCallback(async () => {
    if (!user) return
    try {
      const profile = await getCoachProfile(user.id)
      if (profile) {
        setClubName(profile.clubName ?? '')
        setBio(profile.bio ?? '')
        setPrice(String(profile.defaultSessionPrice))
        setMinutes(String(profile.defaultSessionMinutes))
        setCancelHours(String(profile.cancellationHoursBefore))
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti nustatymų'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const priceNum = Number(price.replace(',', '.'))
    const minutesNum = Number(minutes)
    const hoursNum = Number(cancelHours)

    if (Number.isNaN(priceNum) || priceNum < 0) return toast.error('Neteisinga kaina')
    if (!Number.isInteger(minutesNum) || minutesNum < 15) return toast.error('Trukmė turi būti bent 15 min.')
    if (!Number.isInteger(hoursNum) || hoursNum < 0) return toast.error('Neteisingas atšaukimo terminas')

    setSaving(true)
    try {
      await updateCoachProfile(user.id, {
        clubName: clubName.trim() || null,
        bio: bio.trim() || null,
        defaultSessionPrice: priceNum,
        defaultSessionMinutes: minutesNum,
        cancellationHoursBefore: hoursNum,
      })
      toast.success('Nustatymai išsaugoti')
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko išsaugoti'))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user) return
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      toast.success('Slaptažodžio keitimo nuoroda išsiųsta į el. paštą')
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko išsiųsti nuorodos'))
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div>
      <PageHeader
        title="Nustatymai"
        subtitle="Šie parametrai naudojami rezervacijose ir kainose"
      />

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <section className="panel p-6">
          <p className="eyebrow mb-5">Anketa</p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="club">Klubas <span className="font-normal text-muted-foreground">(nebūtina)</span></Label>
              <Input id="club" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="pvz. Ozo g. salė" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Apie save <span className="font-normal text-muted-foreground">(nebūtina)</span></Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <p className="eyebrow mb-5">Treniruotės</p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Kaina, €</Label>
              <Input id="price" inputMode="decimal" className="mono" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutes">Trukmė, min.</Label>
              <Input id="minutes" inputMode="numeric" className="mono" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel">Atšaukimas, val.</Label>
              <Input id="cancel" inputMode="numeric" className="mono" value={cancelHours} onChange={(e) => setCancelHours(e.target.value)} />
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Atšaukimo terminas, kiek valandų prieš treniruotę sportininkas dar gali ją atšaukti pats.
          </p>
        </section>

        <section className="panel p-6">
          <p className="eyebrow mb-5">Paskyra</p>
          <p className="mb-4 text-sm text-muted-foreground">{user?.email}</p>
          <Button type="button" variant="outline" onClick={handlePasswordReset}>
            Keisti slaptažodį
          </Button>
        </section>

        <Button type="submit" size="lg" loading={saving}>Išsaugoti</Button>
      </form>
    </div>
  )
}
