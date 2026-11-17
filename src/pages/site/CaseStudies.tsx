import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumbs, MarketingPage } from '@/components/marketing/SiteChrome'
import { CASE_STUDIES } from '@/data/caseStudies'
import { riseItem, staggerParent } from '@/lib/motion'
import { useSeo } from '@/lib/seo'

export function CaseStudies() {
  useSeo({
    title: 'Kaip dirba treneriai',
    description: 'Trys tipiniai scenarijai: kaip asmeninis treneris tvarko rezervacijas, programas ir mitybos planus su ForCoaches.',
  })

  return (
    <MarketingPage>
      <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <Breadcrumbs items={[{ label: 'Pavyzdžiai' }]} />
        <h1 className="display-lg max-w-2xl text-foreground">Kaip treneriai dirba su ForCoaches</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Trys dažniausi darbo būdai: kas buvo prieš tai, kaip viskas sutvarkoma per pirmą vakarą ir kaip atrodo įprasta savaitė.
          Tai pavyzdiniai scenarijai, ne klientų atsiliepimai.
        </p>

        <motion.div variants={staggerParent} initial="hidden" animate="visible" className="mt-12 grid gap-4 md:grid-cols-3">
          {CASE_STUDIES.map((study, i) => (
            <motion.div key={study.slug} variants={riseItem}>
              <Link to={`/pavyzdziai/${study.slug}`} className="panel card-lift flex h-full flex-col p-6">
                <span className="text-sm tabular-nums text-muted-foreground">0{i + 1}</span>
                <h2 className="mt-4 text-lg leading-snug text-foreground">{study.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{study.summary}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm text-primary">
                  Skaityti
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </MarketingPage>
  )
}

export function CaseStudyPage() {
  const { slug } = useParams()
  const study = CASE_STUDIES.find((s) => s.slug === slug)
  useSeo({
    title: study?.title ?? 'Pavyzdys nerastas',
    description: study?.summary ?? '',
    noindex: !study,
  })

  if (!study) return <Navigate to="/pavyzdziai" replace />
  const others = CASE_STUDIES.filter((s) => s.slug !== study.slug)

  return (
    <MarketingPage>
      <article className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <Breadcrumbs items={[{ label: 'Pavyzdžiai', to: '/pavyzdziai' }, { label: study.title }]} />

        <p className="text-sm text-primary">Pavyzdinis scenarijus</p>
        <h1 className="display-lg mt-3 text-foreground">{study.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">{study.who}</p>

        <Section title="Kaip buvo">
          <ul className="space-y-2">
            {study.before.map((item) => (
              <li key={item} className="flex gap-3 text-muted-foreground">
                <span className="mt-3 h-1 w-3 shrink-0 rounded-full bg-foreground/25" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Pirmas vakaras: kas nustatoma">
          <ol className="space-y-5">
            {study.setup.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-sm tabular-nums text-foreground">{i + 1}</span>
                <span>
                  <span className="block text-foreground">{step.title}</span>
                  <span className="mt-1 block leading-7 text-muted-foreground">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Įprasta savaitė">
          <ul className="space-y-2">
            {study.week.map((item) => (
              <li key={item} className="flex gap-3 text-muted-foreground">
                <span className="mt-3 h-1 w-3 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Susijusios funkcijos:{' '}
            {study.features.map((f, i) => (
              <span key={f.href}>
                {i > 0 && ', '}
                <Link to={f.href} className="link-underline text-foreground">{f.label}</Link>
              </span>
            ))}
          </p>
        </Section>

        <div className="panel mt-14 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground">Pabandykite su vienu klientu</p>
            <p className="mt-1 text-sm text-muted-foreground">Reikia tik vardo, el. pašto ir slaptažodžio. Kortelės nereikia.</p>
          </div>
          <Link to="/registracija"><Button>Sukurti paskyrą</Button></Link>
        </div>

        <div className="mt-14">
          <p className="eyebrow mb-4">Kiti pavyzdžiai</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((o) => (
              <Link key={o.slug} to={`/pavyzdziai/${o.slug}`} className="panel card-lift p-5 text-sm text-foreground">
                {o.title}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </MarketingPage>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-5 text-xl text-foreground">{title}</h2>
      {children}
    </section>
  )
}
