import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/errors'
import { assertLoginAllowed, clearLoginFailures, RateLimitError, recordLoginFailure } from '@/lib/rateLimit'
import { homePathForRole } from '@/lib/routes'
import { useSeo } from '@/lib/seo'

export function Login() {
  useSeo({ title: 'Prisijungimas', description: 'Prisijunkite prie ForCoaches trenerio arba sportininko paskyros.', noindex: true })
  const { signIn, isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Jau prisijungusio žmogaus forma nebereikalinga.
  if (isAuthenticated && role && !submitting) return <Navigate to={homePathForRole[role]} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const cleanEmail = email.trim()
    try {
      await assertLoginAllowed(cleanEmail)
      await signIn(cleanEmail, password)
      await clearLoginFailures(cleanEmail)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(err.message)
      } else {
        const code = (err as { code?: string }).code
        const wrongPassword = code === 'invalid_credentials' || /invalid login credentials/i.test(String((err as Error).message))
        if (wrongPassword) {
          const left = await recordLoginFailure(cleanEmail)
          setError(left > 0
            ? `Neteisingas el. paštas arba slaptažodis. Liko bandymų: ${left}.`
            : 'Neteisingas el. paštas arba slaptažodis. Bandymai išnaudoti, bandykite vėl po 15 min.')
        } else {
          setError(errorMessage(err, 'Nepavyko prisijungti. Bandykite dar kartą.'))
        }
      }
      // Slaptažodis išvalomas, el. paštas paliekamas: perrašyti reikia tik jį.
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-medium">Sveiki sugrįžę</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Prisijunkite prie savo paskyros.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate={false}>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">El. paštas</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Slaptažodis</Label>
            <Link to="/slaptazodis" className="text-xs text-muted-foreground hover:text-foreground">
              Pamiršote?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Slėpti slaptažodį' : 'Rodyti slaptažodį'}
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Jungiamasi…' : 'Prisijungti'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Neturite paskyros?{' '}
        <Link to="/registracija" className="link-underline font-medium text-primary">
          Registruokitės
        </Link>
      </p>
    </AuthLayout>
  )
}
