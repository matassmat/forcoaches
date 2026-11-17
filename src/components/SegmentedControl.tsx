import { motion } from 'framer-motion'
import { snappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Perjungiklis, kurio fonas nuslysta į pasirinktą pusę.
 * `layoutId` perkelia tą patį elementą, todėl judesį galima nutraukti
 * pusiaukelėje ir jis nesutriks.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  layoutId,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  /** Turi būti unikalus puslapyje, jei tokių perjungiklių yra keli. */
  layoutId: string
  className?: string
}) {
  return (
    <div
      className={cn('grid gap-1 rounded-lg bg-muted p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'relative h-8 rounded-sm px-3 text-sm transition-colors duration-150',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={snappy}
                className="absolute inset-0 -z-10 rounded-sm bg-card shadow-[0_0_0_1px_hsl(var(--border))]"
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
