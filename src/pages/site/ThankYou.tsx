import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarketingPage } from '@/components/marketing/SiteChrome'
import { enter } from '@/lib/motion'
import { useSeo } from '@/lib/seo'
import { SITE } from '@/lib/site'

type ThankYouState = { kind?: 'signup' | 'message'; email?: string; role?: 'coach' | 'athlete' }

/** Padėkos puslapis po registracijos arba išsiųstos žinutės. */
export function ThankYou() {
  const state = (useLocation().state ?? {}) as ThankYouState
  const kind = state.kind ?? 'signup'
  useSeo({ title: 'Ačiū', description: 'Ačiū, kad pasirinkote ForCoaches.', noindex: true })

  const steps = kind === 'message'
    ? [
        `Žinutę gavome. Atsakysime per ${SITE.responseTime} į nurodytą el. paštą.`,
        'Jei klausimas skubus, parašykite dar kartą ir temoje nurodykite „Skubu“.',
      ]
    : state.role === 'athlete'
      ? [
          'Atsidarykite laišką ir paspauskite patvirtinimo nuorodą.',
          'Prisijunkite: matysite savo programą, mitybos planą ir laisvus trenerio laikus.',
          'Užsiregistruokite į pirmą treniruotę, treneris gaus prašymą iškart.',
        ]
      : [
          'Atsidarykite laišką ir paspauskite patvirtinimo nuorodą.',
          'Prisijunkite ir skiltyje „Sportininkai“ sukurkite pirmą kortelę: gausite pakvietimo kodą.',
          'Kalendoriuje nutempkite laisvus laikus, sportininkai galės užsirašyti patys.',
        ]

  return (
    <MarketingPage>
      <section className="mx-auto max-w-xl px-6 py-20 sm:py-28">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: enter }}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground"
        >
          {kind === 'message' ? <Check className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}
        </motion.span>

        <h1 className="display-lg mt-6 text-foreground">
          {kind === 'message' ? 'Ačiū, žinutė išsiųsta' : 'Ačiū, paskyra sukurta'}
        </h1>
        {kind === 'signup' && state.email && (
          <p className="mt-3 text-muted-foreground">
            Patvirtinimo laišką išsiuntėme adresu <span className="text-foreground">{state.email}</span>.
            Jei jo nematote, patikrinkite „Reklamos“ ar „Šlamšto“ aplanką.
          </p>
        )}

        <ol className="mt-8 space-y-4">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-sm tabular-nums">{i + 1}</span>
              <span className="pt-0.5 text-sm leading-6 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          {kind === 'signup'
            ? <Link to="/prisijungti"><Button>Į prisijungimą</Button></Link>
            : <Link to="/"><Button>Į pradžią</Button></Link>}
          <Link to="/pavyzdziai"><Button variant="outline">Kaip dirba kiti treneriai</Button></Link>
        </div>
      </section>
    </MarketingPage>
  )
}
