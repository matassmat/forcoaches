import { motion } from 'framer-motion'
import { enter } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Funkcijos skyrius: tekstas vienoje pusėje, produkto vaizdas kitoje.
 * Kas antras apverstas, kad slenkant akis judėtų zigzagu.
 */
export function FeatureSection({
  label,
  title,
  lead,
  points,
  visual,
  flip = false,
}: {
  label: string
  title: string
  lead: string
  points: string[]
  visual: React.ReactNode
  flip?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={enter}
      className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div className={cn(flip && 'lg:order-2')}>
        <p className="text-sm text-primary">{label}</p>
        <h2 className="display-lg mt-3 text-foreground">{title}</h2>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">{lead}</p>

        <ul className="mt-6 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex gap-3 text-sm leading-6 text-muted-foreground">
              <span className="mt-2.5 h-1 w-3 shrink-0 rounded-full bg-foreground/25" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className={cn(flip && 'lg:order-1')}>{visual}</div>
    </motion.div>
  )
}
