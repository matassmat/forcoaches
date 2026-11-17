import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { supabase } from '@/lib/supabase'

/** 1 žingsnis: el. paštas, į kurį siunčiama atkūrimo nuoroda. */
export function ForgotPassword() {
  useSeo({ title: 'Slaptažodžio atkūrimas', description: 'Atkurkite ForCoaches paskyros slaptažodį.', noindex: true })
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/naujas-slaptazodis`,
      })
      if (resetError) throw resetError
      // Ar paskyra yra, nesakome: kitaip forma taptų įrankiu tikrinti, kas užsiregistravęs.
      setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Nepavyko išsiųsti laiško. Bandykite dar kartą.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-foreground">
            <MailCheck className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-medium">Patikrinkite el. paštą</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Jei paskyra adresu <span className="text-foreground">{email}</span> yra, išsiuntėme nuorodą naujam slaptažodžiui.
            Ji galioja vieną valandą.
          </p>
          <Link to="/prisijungti"><Button variant="outline" className="mt-6 w-full">Į prisijungimą</Button></Link>
        </div>
      ) : (
        <>
          <h1 className="text-center text-2xl font-medium">Pamiršote slaptažodį?</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Atsiųsime nuorodą naujam slaptažodžiui.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <ErrorBox text={error} />}
            <div className="space-y-2">
              <Label htmlFor="fp-email">El. paštas</Label>
              <Input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={sending}>Siųsti nuorodą</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Prisiminėte? <Link to="/prisijungti" className="link-underline font-medium text-primary">Prisijunkite</Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}

/** 2 žingsnis: atėjus per nuorodą iš laiško, įrašomas naujas slaptažodis. */
export function ResetPassword() {
  useSeo({ title: 'Naujas slaptažodis', description: 'Įrašykite naują ForCoaches paskyros slaptažodį.', noindex: true })
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Supabase sesiją iš nuorodos susikuria pats (detectSessionInUrl).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Slaptažodis turi būti bent 8 simbolių.'); return }
    if (password !== repeat) { setError('Slaptažodžiai nesutampa.'); return }
    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      toast.success('Slaptažodis pakeistas')
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Nepavyko pakeisti slaptažodžio.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-medium">Naujas slaptažodis</h1>
      {!ready ? (
        <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
          Nuoroda netinka arba nebegalioja. <Link to="/slaptazodis" className="link-underline text-foreground">Paprašykite naujos</Link>.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <ErrorBox text={error} />}
          <div className="space-y-2">
            <Label htmlFor="rp-1">Naujas slaptažodis</Label>
            <Input id="rp-1" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-2">Pakartokite</Label>
            <Input id="rp-2" type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={saving}>Išsaugoti</Button>
        </form>
      )}
    </AuthLayout>
  )
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
