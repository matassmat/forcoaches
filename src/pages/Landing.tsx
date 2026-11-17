import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { FeatureSection } from '@/components/marketing/FeatureSection'
import {
  MockBooking, MockNutrition, MockProgram, MockProgressChart, MockSession, MockWeek,
} from '@/components/marketing/mocks'
import { enter, riseItem, staggerParent } from '@/lib/motion'

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
      'Laisvą laiką galima pakartoti kelioms savaitėms į priekį',
      'Patvirtinus laikas iškerpamas iš laisvų, likutis lieka kitiems',
      'Atšaukimo terminą valandomis nustatote patys',
      'Neatvykimai lieka istorijoje',
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
    title: 'Kalorijų norma ir valgiaraštis su receptais',
    lead: 'Nustatote dienos kalorijas ir makro normas. Sportininkas žymisi, ką suvalgė, ir iškart mato, kiek liko.',
    points: [
      'Receptai su nuotraukomis ir ingredientais iš receptų bibliotekos',
      'Produktų lentelė lietuviškai: įvedate gramus, kalorijos suskaičiuojamos',
      'Valgį iš trenerio plano galima pažymėti vienu paspaudimu',
    ],
    visual: <MockNutrition />,
  },
]

const steps = [
  { n: '1', t: 'Susikuriate paskyrą', d: 'Vardas, el. paštas ir slaptažodis. Be kortelės ir be skambučio.' },
  { n: '2', t: 'Pakviečiate sportininkus', d: 'Kiekvienam sugeneruojamas šešių simbolių kodas. Su juo sportininkas užsiregistruoja pats.' },
  { n: '3', t: 'Paskelbiate laisvus laikus', d: 'Kalendoriuje nutempiate, kada dirbate. Prašymai pradeda ateiti tą pačią dieną.' },
]

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>

          <nav className="hidden items-center gap-8 md:flex">
            {features.map((f) => (
              <a key={f.id} href={`#${f.id}`} className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
                {f.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:grid" />
            <Link to="/prisijungti" className="hidden px-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground sm:block">
              Prisijungti
            </Link>
            <Link to="/registracija" className="hidden sm:block">
              <Button size="sm">Sukurti paskyrą</Button>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Uždaryti meniu' : 'Atidaryti meniu'}
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {features.map((f) => (
                <a key={f.id} href={`#${f.id}`} onClick={() => setMenuOpen(false)} className="py-2 text-sm text-foreground">
                  {f.label}
                </a>
              ))}
              <Link to="/prisijungti" className="py-2 text-sm text-foreground">Prisijungti</Link>
              <Link to="/registracija" className="mt-2"><Button className="w-full">Sukurti paskyrą</Button></Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero: tekstas kairėje, šiandienos treniruotė dešinėje. */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
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
              <Link to="/registracija">
                <Button size="lg">
                  Sukurti paskyrą
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/prisijungti">
                <Button size="lg" variant="outline">Prisijungti</Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { ...enter, delay: 0.12 } }}
            className="grid gap-4"
          >
            <MockSession />
            <MockWeek />
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

      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-24 md:flex-row md:items-center">
          <div>
            <h2 className="display-lg text-foreground">Išbandykite su vienu sportininku</h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Pakvieskite vieną žmogų ir po savaitės pažiūrėkite, ar mažiau laiko praleidžiate žinutėse.
            </p>
          </div>
          <Link to="/registracija">
            <Button size="lg">
              Sukurti paskyrą
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo size="sm" />
          <span className="text-xs tabular-nums text-muted-foreground">© {new Date().getFullYear()} ForCoaches</span>
        </div>
      </footer>
    </div>
  )
}
