import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumbs, MarketingPage } from '@/components/marketing/SiteChrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { trackEvent } from '@/lib/analytics'
import { errorMessage } from '@/lib/errors'
import { useSeo } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { supabase } from '@/lib/supabase'

const TOPICS = ['Klausimas apie programą', 'Pagalba su paskyra', 'Pasiūlymas', 'Kita']

export function Contact() {
  useSeo({
    title: 'Kontaktai',
    description: `Parašykite ForCoaches komandai. Atsakome per ${SITE.responseTime}.`,
  })
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')
  // Paslėptas laukas robotams: žmogus jo nemato ir nepildo.
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (website) return
    if (message.trim().length < 10) {
      toast.error('Žinutė per trumpa, parašykite bent kelis žodžius.')
      return
    }
    setSending(true)
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      })
      if (error) throw error
      trackEvent('contact_message_sent', { topic })
      navigate('/aciu', { state: { kind: 'message' } })
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko išsiųsti žinutės. Bandykite dar kartą.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <MarketingPage>
      <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <Breadcrumbs items={[{ label: 'Kontaktai' }]} />

        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h1 className="display-lg text-foreground">Parašykite mums</h1>
            <p className="mt-4 max-w-md leading-7 text-muted-foreground">
              Klausimai apie programą, pagalba su paskyra ar pasiūlymai, ko trūksta jūsų darbe.
              Kiekvieną žinutę skaito žmogus.
            </p>

            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-foreground">Atsakome per {SITE.responseTime}</span>
                  <span className="text-muted-foreground">Darbo dienomis, Lietuvos laiku.</span>
                </span>
              </li>
              {SITE.contactEmail && (
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${SITE.contactEmail}`} className="link-underline text-foreground">{SITE.contactEmail}</a>
                </li>
              )}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="panel space-y-4 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-name">Vardas</Label>
                <Input id="c-name" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-email">El. paštas</Label>
                <Input id="c-email" type="email" required maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-topic">Tema</Label>
              <select
                id="c-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
              >
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-message">Žinutė</Label>
              <Textarea id="c-message" required rows={6} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            <div aria-hidden className="absolute left-[-9999px] h-0 overflow-hidden">
              <label htmlFor="c-website">Svetainė</label>
              <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Siųsdami sutinkate, kad jūsų vardą ir el. paštą naudosime tik atsakymui. Plačiau{' '}
              <Link to="/privatumas" className="link-underline">privatumo politikoje</Link>.
            </p>

            <Button type="submit" className="w-full" loading={sending}>Siųsti žinutę</Button>
          </form>
        </div>
      </div>
    </MarketingPage>
  )
}
