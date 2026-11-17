import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // Kur eiti toliau, nusprendžia RootRoute pagal rolę, čia rolės dar
      // nežinome, nes profilis kraunamas asinchroniškai.
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko prisijungti')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-medium">Sveiki sugrįžę</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Prisijunkite prie savo paskyros.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">El. paštas</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Slaptažodis</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
