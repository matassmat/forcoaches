import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeatureSection } from '@/components/marketing/FeatureSection'
import { MarketingPage } from '@/components/marketing/SiteChrome'
import {
  MockBooking, MockNutrition, MockProgram, MockProgressChart, MockSession, MockWeek,
} from '@/components/marketing/mocks'
import { CASE_STUDIES } from '@/data/caseStudies'
import { trackEvent } from '@/lib/analytics'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { useJsonLd, useSeo } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

/*
 * Visi teiginiai šiame puslapyje patikrinti kode. Prieš pridedant naują,
 * įsitikinkite, kad funkcija iš tikrųjų veikia taip, kaip parašyta.
 */
const features = [
  {
    id: 'rezervacijos',
    label: 'Rezervacijos',
    title: 'Sportininkas užsirašo pats, jūs tik patvirtinate',
    lead: 'Laisvus laikus nutempiate kalendoriuje. Sportininkas mato tik tai, kas tikrai laisva, ir siunčia prašymą, o jums lieka paspausti „Patvirtinti“.',
    points: [
      'Laisvą laiką galima pakartoti 2-12 savaičių į priekį',
      'Patvirtinus laikas iškerpamas iš laisvų, likutis lieka kitiems',
      'Atšaukimo terminą valandomis nustatote patys',
      'Treniruotes galima eksportuoti į Google ar Apple kalendorių (.ics)',
    ],
    visual: <MockBooking />,
  },
  {
    id: 'programos',
    label: 'Programos',
    title: 'Programa su svoriais, kurią sportininkas atsiveria salėje',
    lead: 'Dienos, pratimai, serijos, kartojimai, svoris ir poilsis. Šabloną parašote kartą ir priskiriate bet kuriam sportininkui.',
    points: [
      '873 pratimai su nuotraukomis ir atlikimo aprašymu',
      'Kartojimus galima rašyti laisvai, pvz. „8-12“',
      'Atliktos serijos išsaugomos, matosi, kaip auga svoris',
    ],
    visual: <MockProgram />,
  },
  {
    id: 'progresas',
    label: 'Progresas',
    title: 'Matavimai, kurie parodo kryptį, o ne vieną blogą rytą',
    lead: 'Svoris, riebalų procentas ir penkios kūno apimtys viename grafike. Matavimą įveda sportininkas arba jūs.',
    points: [
      'Pokytis nuo pirmo matavimo matosi prie kiekvieno rodiklio',
      'Tos pačios dienos matavimas perrašomas, o ne dubliuojamas',
    ],
    visual: <MockProgressChart />,
  },
  {
    id: 'mityba',
    label: 'Mityba',
    title: 'Mitybos planas iš lietuviškų produktų, su kalorijomis',
    lead: 'Normas apskaičiuoja skaičiuoklė pagal svorį, ūgį ir tikslą. Valgius sudedate iš produktų su gramais, o sportininkas žymisi, ką suvalgė, ir mato, kiek liko.',
    points: [
      'Daugiau nei 2 000 produktų ir Lietuvos parduotuvių prekių',
      'Prekę galima nuskenuoti telefono kamera pagal brūkšninį kodą',
      'Porcijos vienetais: „1 kiaušinis“, „riekė duonos“, ne tik gramais',
      'Receptai su nuotraukomis iš receptų bibliotekos',
    ],
    visual: <MockNutrition />,
  },
]

const steps = [
  { n: '1', t: 'Susikuriate paskyrą', d: 'Vardas, el. paštas ir slaptažodis. Be kortelės ir be skambučio.' },
  { n: '2', t: 'Pakviečiate sportininkus', d: 'Kiekvienam sugeneruojamas šešių simbolių kodas. Su juo sportininkas užsiregistruoja pats.' },
  { n: '3', t: 'Paskelbiate laisvus laikus', d: 'Kalendoriuje nutempiate, kada dirbate. Prašymai pradeda ateiti tą pačią dieną.' },
]

const faqs = [
  {
    q: 'Ar sportininkui reikia atsisiųsti programėlę?',
    a: 'Ne. ForCoaches veikia telefono naršyklėje. Sportininkas užsiregistruoja su jūsų duotu šešių simbolių pakvietimo kodu ir iškart mato savo programą, mitybos planą ir laisvus jūsų laikus.',
  },
  {
    q: 'Kaip vyksta registracija į treniruotę?',
    a: 'Jūs kalendoriuje pažymite, kada esate laisvi. Sportininkas pasirenka laiką ir išsiunčia prašymą, jūs gaunate pranešimą ir patvirtinate. Patvirtintas laikas dingsta iš laisvų, kad jo neužimtų kitas.',
  },
  {
    q: 'Ar galiu naudoti savo pratimus ir valgius?',
    a: 'Taip. Jei pratimo nėra bibliotekoje, įrašote savo pavadinimą. Valgius galima sudėti iš produktų su gramais, paimti iš receptų bibliotekos arba įrašyti ranka su kalorijomis.',
  },
  {
    q: 'Kas mato sportininko duomenis?',
    a: 'Tik pats sportininkas ir jo treneris. Prieigą riboja duomenų bazės taisyklės, ne vien programos sąsaja, todėl kito trenerio klientų duomenų nepamatysite net žinodami nuorodą.',
  },
  {
    q: 'Ar registruojantis reikia banko kortelės?',
    a: 'Ne. Paskyrai reikia tik vardo, el. pašto ir slaptažodžio. Atsiskaitymus su sportininkais skiltyje „Finansai“ registruojate patys, programa kortelių duomenų nerenka.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export function Landing() {
  useSeo({
    title: 'ForCoaches - rezervacijos, programos ir mityba asmeniniam treneriui',
    description: 'Laisvi laikai, rezervacijos, treniruočių programos su svoriais, mitybos planai su kalorijomis ir atsiskaitymai. Sportininkas viską mato telefone.',
  })
  useJsonLd('faq', faqSchema)

  return (
    <MarketingPage>
      {/* Hero: tekstas kairėje, šiandienos treniruotė dešinėje. */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
          <motion.div variants={staggerParent} initial="hidden" animate="visible">
            <motion.p variants={riseItem} className="text-sm text-muted-foreground">
              Asmeniniams treneriams sporto klubuose
            </motion.p>
            <motion.h1 variants={riseItem} className="display-xl mt-4 text-foreground">
              Treniruočių žurnalas, kurį sportininkas pildo pats
            </motion.h1>
            <motion.p variants={riseItem} className="mt-6 max-w-[34rem] text-lg leading-8 text-muted-foreground">
              Laisvi laikai, rezervacijos, programos su svoriais, mityba ir atsiskaitymai.
              Sportininkas užsirašo, žymisi serijas ir valgius telefone, o jūs viską matote jo kortelėje.
            </motion.p>
            <motion.div variants={riseItem} className="mt-8 flex flex-wrap gap-3">
              <Link to="/registracija" onClick={() => trackEvent('cta_click', { place: 'hero' })}>
                <Button size="lg">
                  Sukurti paskyrą
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pavyzdziai">
                <Button size="lg" variant="outline">Kaip tai atrodo darbe</Button>
              </Link>
            </motion.div>
            <motion.p variants={riseItem} className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Kortelės nereikia. Klausimus atsakome per {SITE.responseTime}.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { ...enter, delay: 0.12 } }}
            className="grid gap-4"
          >
            <MockSession />
            <MockWeek className="hidden sm:block" />
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-6 py-24 lg:space-y-32 lg:py-32">
        {features.map((feature, i) => (
          <section key={feature.id} id={feature.id} className="scroll-mt-24">
            <FeatureSection
              label={feature.label}
              title={feature.title}
              lead={feature.lead}
              points={feature.points}
              visual={feature.visual}
              flip={i % 2 === 1}
            />
          </section>
        ))}
      </div>

      <section className="border-y border-border bg-sidebar">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="display-lg max-w-lg text-foreground">Nuo registracijos iki pirmo prašymo</h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n}>
                <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-sm tabular-nums text-foreground">
                  {step.n}
                </span>
                <h3 className="mt-4 text-lg text-foreground">{step.t}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Darbo pavyzdžiai */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display-lg text-foreground">Kaip treneriai tai naudoja</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">Trys dažniausi darbo būdai, nuo pirmo vakaro iki įprastos savaitės.</p>
          </div>
          <Link to="/pavyzdziai" className="link-underline text-sm text-foreground">Visi pavyzdžiai</Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {CASE_STUDIES.map((study) => (
            <Link key={study.slug} to={`/pavyzdziai/${study.slug}`} className="panel card-lift flex flex-col p-6">
              <h3 className="text-base leading-snug text-foreground">{study.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{study.summary}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm text-primary">
                Skaityti <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* DUK */}
      <section id="duk" className="scroll-mt-24 border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="display-lg text-foreground">Dažni klausimai</h2>
            <p className="mt-4 max-w-sm leading-7 text-muted-foreground">
              Neradote atsakymo? <Link to="/kontaktai" className="link-underline text-foreground">Parašykite mums</Link>,
              atsakome per {SITE.responseTime}.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((faq, i) => <FaqItem key={faq.q} q={faq.q} a={faq.a} defaultOpen={i === 0} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-24 md:flex-row md:items-center">
          <div>
            <h2 className="display-lg text-foreground">Išbandykite su vienu sportininku</h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Pakvieskite vieną žmogų ir po savaitės pažiūrėkite, ar mažiau laiko praleidžiate žinutėse.
            </p>
          </div>
          <Link to="/registracija" onClick={() => trackEvent('cta_click', { place: 'bottom' })}>
            <Button size="lg">
              Sukurti paskyrą
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <StickyMobileCta />
    </MarketingPage>
  )
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-5 text-left text-foreground"
      >
        <span className="text-base">{q}</span>
        <Plus className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-45')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: enter }}
            exit={{ height: 0, opacity: 0, transition: exit }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-8 text-sm leading-7 text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Telefone, nuslinkus žemiau pirmo ekrano, apačioje lieka registracijos mygtukas. */
function StickyMobileCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 700
      setVisible(window.scrollY > 600 && !nearBottom)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0, transition: enter }}
          exit={{ y: 80, transition: exit }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden"
        >
          <Link to="/registracija" onClick={() => trackEvent('cta_click', { place: 'sticky_mobile' })}>
            <Button className="w-full" size="lg">
              Sukurti paskyrą
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
