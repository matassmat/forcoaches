import { BACK_IDS, BODY_BACK, BODY_FRONT, FRONT_IDS, MUSCLE_SVG } from '@/data/muscleShapes'
import { MUSCLE_LABELS, type MuscleGroup } from '@/data/exercises'
import { cn } from '@/lib/utils'

/** Mūsų raumenų grupės -> wger iliustracijų raumenys. */
const GROUP_TO_IDS: Record<MuscleGroup, number[]> = {
  chest: [4],
  back: [12, 9],
  shoulders: [2],
  biceps: [1, 13],
  triceps: [5],
  forearms: [13],
  quads: [10],
  hamstrings: [11],
  glutes: [8],
  calves: [7, 15],
  abs: [6, 14],
  fullbody: [4, 12, 9, 2, 1, 5, 6, 10, 11, 8, 7],
}

/**
 * Kūno schema iš priekio ir nugaros. Pagrindinis raumuo nuspalvinamas
 * akcentu, pagalbiniai blankiau, kiti lieka neutralūs.
 */
export function MuscleMap({
  primary,
  secondary = [],
  className,
  showLegend = true,
}: {
  primary: MuscleGroup
  secondary?: MuscleGroup[]
  className?: string
  showLegend?: boolean
}) {
  const main = new Set(GROUP_TO_IDS[primary])
  const extra = new Set(secondary.flatMap((g) => GROUP_TO_IDS[g]).filter((id) => !main.has(id)))

  const fillFor = (id: number) =>
    main.has(id) ? 'fill-primary' : extra.has(id) ? 'fill-primary/40' : 'fill-foreground/[0.07]'

  const figure = (body: string, ids: readonly number[], label: string) => (
    <figure className="flex-1">
      <svg viewBox="0 0 200 369" className="h-auto w-full" role="img" aria-label={label}>
        <g className="fill-foreground/[0.06]" dangerouslySetInnerHTML={{ __html: body }} />
        {ids.map((id) => (
          <g key={id} className={cn('transition-colors duration-300', fillFor(id))} dangerouslySetInnerHTML={{ __html: MUSCLE_SVG[id] }} />
        ))}
      </svg>
      <figcaption className="mt-1 text-center text-[11px] text-muted-foreground">{label.split(':')[0]}</figcaption>
    </figure>
  )

  const names = `${MUSCLE_LABELS[primary]}${secondary.length ? `, pagalbiniai: ${secondary.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(', ')}` : ''}`

  return (
    <div className={className}>
      <div className="flex gap-2">
        {figure(BODY_FRONT, FRONT_IDS, `Priekis: ${names}`)}
        {figure(BODY_BACK, BACK_IDS, `Nugara: ${names}`)}
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{MUSCLE_LABELS[primary]}</span>
          {secondary.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/40" />
              {secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
