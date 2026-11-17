import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, PlayCircle } from 'lucide-react'
import {
  displayName, EQUIPMENT_LABELS, LEVEL_LABELS, loadExercises, MUSCLE_LABELS, type Exercise,
} from '@/data/exercises'
import { listCustomExercises, youtubeId, type CustomExercise } from '@/lib/customExercises'
import { ExerciseMedia } from '@/components/exercise/ExerciseMedia'
import { MuscleMap } from '@/components/exercise/MuscleMap'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fold } from '@/lib/search'

/** Bibliotekos ar trenerio pratimas, rodomas vienodai. */
export type AnyExercise =
  | { kind: 'library'; exercise: Exercise }
  | { kind: 'custom'; exercise: CustomExercise }

let customCache: Promise<CustomExercise[]> | null = null

/** Bibliotekos ir savų pratimų katalogas su paieška pagal pavadinimą. */
export function useExerciseCatalog() {
  const [library, setLibrary] = useState<Exercise[] | null>(null)
  const [custom, setCustom] = useState<CustomExercise[]>([])

  useEffect(() => {
    let alive = true
    loadExercises().then((list) => alive && setLibrary(list)).catch(() => alive && setLibrary([]))
    customCache ??= listCustomExercises().catch(() => [])
    customCache.then((list) => alive && setCustom(list))
    return () => { alive = false }
  }, [])

  const byName = useMemo(() => {
    const map = new Map<string, AnyExercise>()
    for (const ex of library ?? []) {
      map.set(fold(ex.name), { kind: 'library', exercise: ex })
      if (ex.nameLt) map.set(fold(ex.nameLt), { kind: 'library', exercise: ex })
    }
    // Savi pratimai svarbesni: treneris galėjo pavadinti taip pat kaip bibliotekos.
    for (const ex of custom) map.set(fold(ex.name), { kind: 'custom', exercise: ex })
    return map
  }, [library, custom])

  return {
    library,
    custom,
    ready: library !== null,
    find: (name: string) => byName.get(fold(name.trim())) ?? null,
    refreshCustom: async () => {
      customCache = listCustomExercises().catch(() => [])
      setCustom(await customCache)
    },
  }
}

export function exerciseTitle(item: AnyExercise) {
  return item.kind === 'library' ? displayName(item.exercise) : item.exercise.name
}

/** Mažas judantis paveiksliukas sąrašams. */
export function ExerciseThumb({ item, className }: { item: AnyExercise | null; className?: string }) {
  if (!item) {
    return <span className={`grid shrink-0 place-items-center rounded-md bg-muted text-[10px] text-muted-foreground ${className ?? ''}`}>-</span>
  }
  const images = item.kind === 'library'
    ? item.exercise.images
    : item.exercise.imageUrl
      ? [item.exercise.imageUrl]
      : youtubeId(item.exercise.videoUrl)
        ? [`https://i.ytimg.com/vi/${youtubeId(item.exercise.videoUrl)}/mqdefault.jpg`]
        : []
  return <ExerciseMedia images={images} alt={exerciseTitle(item)} size="sm" autoPlay={false} className={`shrink-0 ${className ?? ''}`} />
}

/** Pilnas pratimo aprašymas: judesys, raumenys, žingsniai, vaizdo įrašas. */
export function ExerciseInfo({ item }: { item: AnyExercise }) {
  const title = exerciseTitle(item)
  const lib = item.kind === 'library' ? item.exercise : null
  const custom = item.kind === 'custom' ? item.exercise : null
  const videoId = youtubeId(custom?.videoUrl)
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${lib?.name ?? title} exercise technique`)}`

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        {videoId ? (
          <div className="aspect-video overflow-hidden rounded-md bg-foreground/90 sm:col-span-2">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
              title={`${title}, vaizdo įrašas`}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="h-full w-full"
            />
          </div>
        ) : (
          <ExerciseMedia
            images={lib?.images ?? (custom?.imageUrl ? [custom.imageUrl] : [])}
            alt={title}
            className="aspect-[4/3] w-full border border-border"
          />
        )}
        <div className={videoId ? 'sm:col-span-2 sm:mx-auto sm:w-1/2' : ''}>
          <MuscleMap primary={(lib ?? custom)!.muscle} secondary={lib?.secondary ?? []} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1 text-foreground">{EQUIPMENT_LABELS[(lib ?? custom)!.equipment] ?? 'Kita'}</span>
        {lib && <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{LEVEL_LABELS[lib.level]}</span>}
        {lib && <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{lib.mechanic === 'compound' ? 'Bazinis' : 'Izoliuojantis'}</span>}
        {custom && <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">Trenerio pratimas</span>}
      </div>

      {custom?.instructions && (
        <div>
          <p className="eyebrow mb-2">Kaip atlikti</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{custom.instructions}</p>
        </div>
      )}

      {lib && lib.instructions.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Kaip atlikti <span className="text-muted-foreground/70">(aprašymas anglų kalba)</span></p>
          <ol className="space-y-2">
            {lib.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground" lang="en">
                <span className="mt-0.5 w-4 shrink-0 text-xs tabular-nums text-foreground">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!videoId && (
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary"
        >
          <PlayCircle className="h-4 w-4" />
          Žiūrėti vaizdo įrašų YouTube
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>
      )}
    </div>
  )
}

/** Pratimo aprašymas dialoge, ieškomas pagal programoje įrašytą pavadinimą. */
export function ExerciseInfoDialog({
  name, item, onClose,
}: {
  name: string | null
  item: AnyExercise | null
  onClose: () => void
}) {
  return (
    <Dialog open={name !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? exerciseTitle(item) : name}</DialogTitle>
          {item?.kind === 'library' && item.exercise.nameLt && (
            <DialogDescription>{item.exercise.name} · {MUSCLE_LABELS[item.exercise.muscle]}</DialogDescription>
          )}
        </DialogHeader>
        {item ? (
          <ExerciseInfo item={item} />
        ) : name ? (
          <p className="text-sm text-muted-foreground">
            Šio pratimo aprašymo bibliotekoje nėra. Paklauskite trenerio arba{' '}
            <a
              className="link-underline text-foreground"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              ieškokite YouTube
            </a>.
          </p>
        ) : <Skeleton className="h-64 w-full" />}
      </DialogContent>
    </Dialog>
  )
}
