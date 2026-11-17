import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/AuthLayout'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { enter, exit } from '@/lib/motion'
import type { UserRole } from '@/types'

export function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('coach')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { needsEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
        firstName,
        lastName,
        role,
        phone: phone.trim() || undefined,
        inviteCode: role === 'athlete' ? inviteCode : undefined,
      })
      if (needsEmailConfirmation) {
        setAwaitingConfirmation(true)
      } else {
        navigate('/', { replace: true })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko sukurti paskyros')
    } finally {
      setSubmitting(false)
    }
  }

  if (awaitingConfirmation) {
    return (
      <AuthLayout>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { ...enter, delay: 0.05 } }}
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-foreground"
          >
            <MailCheck className="h-7 w-7" />
          </motion.div>
          <h1 className="text-xl font-medium">Patvirtinkite el. paštą</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Išsiuntėme nuorodą adresu <span className="font-medium text-foreground">{email}</span>.
            Paspaudę ją, galėsite prisijungti.
          </p>
          <Button variant="outline" className="mt-6 w-full" onClick={() => navigate('/prisijungti')}>
            Į prisijungimą
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-medium">Registracija</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Užtrunka mažiau nei minutę.</p>

      {/* Rolė renkama pirmiausia, nuo jos priklauso likusi forma. */}
      <SegmentedControl
        className="mt-6"
        layoutId="signup-role"
        value={role}
        onChange={setRole}
        options={[
          { value: 'coach', label: 'Esu treneris' },
          { value: 'athlete', label: 'Esu sportininkas' },
        ]}
      />

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">Vardas</Label>
            <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Pavardė</Label>
            <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        {/* Laukas ne šoka į formą, o išsiskleidžia, akis nepameta vietos. */}
        <AnimatePresence initial={false}>
          {role === 'athlete' && (
            <motion.div
              key="invite"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transition: enter }}
              exit={{ height: 0, opacity: 0, transition: exit }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pb-px">
                <Label htmlFor="inviteCode">Trenerio pakvietimo kodas</Label>
                <Input
                  id="inviteCode"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="pvz. 7KX2QP"
                  maxLength={6}
                  className="code h-12 text-center text-lg uppercase tracking-[0.3em]"
                />
                <p className="text-xs text-muted-foreground">Kodą gausite iš savo trenerio.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
          <Label htmlFor="phone">
            Telefonas <span className="font-normal text-muted-foreground">(nebūtina)</span>
          </Label>
          <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Slaptažodis</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Bent 8 simboliai.</p>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Kuriama…' : 'Sukurti paskyrą'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Jau turite paskyrą?{' '}
        <Link to="/prisijungti" className="link-underline font-medium text-primary">
          Prisijunkite
        </Link>
      </p>
    </AuthLayout>
  )
}
