import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ease } from '@/lib/motion'

/*
 * Pradinio puslapio produkto vaizdai. Tai ne tikri komponentai ir jie
 * nenaudoja duomenų, bet atkartoja, kaip programa iš tikrųjų atrodo:
 * tie patys paviršiai, tie patys serijų langeliai, tie patys žodžiai.
 */

/** Serijų langeliai: tas pats ženklas, kurį sportininkas mato programoje. */
export function SetBoxes({ total, done, className }: { total: number; done: number; className?: string }) {
  return (
    <span className={cn('flex gap-1', className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-[5px] border text-[11px] tabular-nums',
            i < done
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground'
          )}
        >
          {i + 1}
        </span>
      ))}
    </span>
  )
}

const session = [
  { name: 'Pritūpimai su štanga', plan: '4 × 6', load: '95 kg', done: 4 },
  { name: 'Rumuniška trauka', plan: '3 × 8', load: '80 kg', done: 3 },
  { name: 'Bulgariški pritūpimai', plan: '3 × 10', load: '2 × 16 kg', done: 1 },
  { name: 'Blauzdų kėlimas stovint', plan: '4 × 15', load: '60 kg', done: 0 },
]

/** Šiandienos treniruotė: pagrindinis pradinio puslapio vaizdas. */
export function MockSession({ className }: { className?: string }) {
  return (
    <div className={cn('panel overflow-hidden', className)}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-medium">MK</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">Marius Kazlauskas</p>
          <p className="truncate text-xs text-muted-foreground">Šiandien 18:00-19:00 · Ozo g. salė</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">8 iš 14 serijų</span>
      </div>

      <div className="px-5 pb-2 pt-4">
        <p className="text-sm text-foreground">A diena · kojos</p>
      </div>

      <div className="divide-y divide-border">
        {session.map((ex) => (
          <div key={ex.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{ex.name}</p>
              <p className="text-xs tabular-nums text-muted-foreground">{ex.plan} · {ex.load}</p>
            </div>
            <SetBoxes total={Number(ex.plan[0])} done={ex.done} />
          </div>
        ))}
      </div>
    </div>
  )
}

const week = [
  { day: 'Pr', booked: 4, free: 2 },
  { day: 'An', booked: 5, free: 1 },
  { day: 'Tr', booked: 3, free: 3 },
  { day: 'Kt', booked: 6, free: 0 },
  { day: 'Pn', booked: 4, free: 2 },
  { day: 'Št', booked: 2, free: 2 },
  { day: 'Sk', booked: 0, free: 0 },
]

/** Savaitės užimtumas: kiek treniruočių užsakyta ir kiek langų liko. */
export function MockWeek({ className }: { className?: string }) {
  return (
    <div className={cn('panel p-5', className)}>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm text-foreground">Ši savaitė</p>
        <p className="text-xs tabular-nums text-muted-foreground">24 treniruotės · 10 laisvų</p>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {week.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-full flex-col-reverse gap-0.5">
              {Array.from({ length: d.booked }, (_, i) => (
                <span key={`b${i}`} className="h-2.5 rounded-[3px] bg-primary" />
              ))}
              {Array.from({ length: d.free }, (_, i) => (
                <span key={`f${i}`} className="h-2.5 rounded-[3px] bg-foreground/10" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const slots = [
  { time: '07:00-08:00', label: 'Marius K.', taken: true },
  { time: '08:00-09:00', label: 'Laisva', taken: false },
  { time: '10:00-11:00', label: 'Gabija P.', taken: true },
  { time: '11:00-12:00', label: 'Laisva', taken: false },
]

/** Rezervacijų langai vienai dienai. */
export function MockBooking({ className }: { className?: string }) {
  return (
    <div className={cn('panel p-5', className)}>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm text-foreground">Antradienis, 14 spalio</p>
        <p className="text-xs text-muted-foreground">2 laisvi</p>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => (
          <div
            key={slot.time}
            className={cn(
              'flex h-10 items-center gap-3 rounded-md border px-3 text-sm',
              slot.taken ? 'border-border bg-muted text-foreground' : 'border-dashed border-border text-muted-foreground'
            )}
          >
            <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{slot.time}</span>
            <span className="flex-1 truncate">{slot.label}</span>
            {slot.taken
              ? <Check className="h-4 w-4 text-muted-foreground" />
              : <Clock className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
    </div>
  )
}

const weightSeries = [86.4, 85.9, 85.1, 84.6, 84.8, 83.9, 83.2, 82.6, 82.9, 82.1, 81.4, 80.8]

/** Svorio kreivė, kuri nusipiešia įslinkusi į ekraną. */
export function MockProgressChart({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  const w = 320
  const h = 120
  const min = Math.min(...weightSeries) - 0.8
  const max = Math.max(...weightSeries) + 0.8
  const points = weightSeries.map((v, i) => {
    const x = (i / (weightSeries.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * h
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]

  return (
    <div ref={ref} className={cn('panel p-5', className)}>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="eyebrow">Svoris per 12 savaičių</p>
          <p className="stat-num mt-2 text-[28px] text-foreground">
            80,8 <span className="text-sm font-normal text-muted-foreground">kg</span>
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          <span className="text-positive">−5,6 kg</span> nuo pradžios
        </p>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full overflow-visible" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" y1={h * t} x2={w} y2={h * t} stroke="hsl(var(--border))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <motion.path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ duration: 1, ease }}
        />
        <circle cx={last[0]} cy={last[1]} r="3.5" fill="hsl(var(--primary))" />
      </svg>

      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Rugpjūtis</span>
        <span>Spalis</span>
      </div>
    </div>
  )
}

const exercises = [
  { name: 'Pritūpimai su štanga', sets: '4 × 6', load: '95 kg' },
  { name: 'Rumuniška trauka', sets: '3 × 8', load: '80 kg' },
  { name: 'Įtūpstai su hanteliais', sets: '3 × 10', load: '18 kg' },
  { name: 'Blauzdų kėlimas stovint', sets: '4 × 15', load: '60 kg' },
]

/** Programos diena su pratimų eilutėmis. */
export function MockProgram({ className }: { className?: string }) {
  return (
    <div className={cn('panel overflow-hidden', className)}>
      <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
        <p className="text-sm text-foreground">A diena · kojos</p>
        <p className="text-xs text-muted-foreground">Šablonas</p>
      </div>

      <div className="divide-y divide-border">
        {exercises.map((ex, i) => (
          <div key={ex.name} className="flex items-center gap-3 px-5 py-3">
            <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{ex.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{ex.sets}</span>
            <span className="w-16 shrink-0 text-right text-sm tabular-nums text-foreground">{ex.load}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const macros = [
  { label: 'Baltymai', value: 148, target: 170 },
  { label: 'Angliavandeniai', value: 212, target: 260 },
  { label: 'Riebalai', value: 61, target: 70 },
]

/** Dienos kalorijos ir makro juostos. */
export function MockNutrition({ className }: { className?: string }) {
  return (
    <div className={cn('panel p-5', className)}>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="eyebrow">Šiandien suvalgyta</p>
          <p className="stat-num mt-2 text-[28px] text-foreground">
            2 140 <span className="text-sm font-normal text-muted-foreground">iš 2 400 kcal</span>
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">liko 260</p>
      </div>

      <div className="space-y-4">
        {macros.map((macro, i) => (
          <div key={macro.label}>
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">{macro.label}</span>
              <span className="tabular-nums text-foreground">
                {macro.value} <span className="text-muted-foreground">/ {macro.target} g</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className={cn('h-full rounded-full', i === 0 ? 'bg-primary' : 'bg-foreground/40')}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: macro.value / macro.target }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.6, ease }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
