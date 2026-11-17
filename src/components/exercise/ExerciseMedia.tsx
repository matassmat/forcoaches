import { useEffect, useState } from 'react'
import { ImageOff, Pause, Play } from 'lucide-react'
import { exerciseImageUrl } from '@/data/exercises'
import { cn } from '@/lib/utils'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Pratimo judesys iš dviejų kadrų: pradinė ir galinė padėtis keičiasi
 * kas sekundę, todėl matosi amplitudė, ne tik poza. Kas nenori judesio
 * (sistemos nustatymas), mato pirmą kadrą ir gali paleisti ranka.
 */
export function ExerciseMedia({
  images,
  alt,
  className,
  size = 'lg',
  autoPlay = true,
}: {
  images: string[]
  alt: string
  className?: string
  size?: 'sm' | 'lg'
  autoPlay?: boolean
}) {
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(autoPlay && !prefersReducedMotion())
  const [failed, setFailed] = useState(false)
  const frames = images.slice(0, 2)
  const urls = frames.map((img) => (img.startsWith('http') ? img : exerciseImageUrl(img)))

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const t = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), size === 'sm' ? 1100 : 1000)
    return () => clearInterval(t)
  }, [playing, frames.length, size])

  if (urls.length === 0 || failed) {
    return (
      <span className={cn('grid place-items-center rounded-md bg-muted text-muted-foreground', className)}>
        <ImageOff className="h-4 w-4" />
      </span>
    )
  }

  return (
    <div
      className={cn('group relative overflow-hidden rounded-md bg-white', className)}
      // Sąraše judesys paleidžiamas tik užvedus pelę, kad šimtas paveikslėlių nemirgėtų vienu metu.
      onMouseEnter={size === 'sm' && !autoPlay ? () => setPlaying(true) : undefined}
      onMouseLeave={size === 'sm' && !autoPlay ? () => { setPlaying(false); setFrame(0) } : undefined}
    >
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={i === 0 ? `${alt}: pradinė padėtis` : `${alt}: galinė padėtis`}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            i === frame ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}

      {size === 'lg' && frames.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Sustabdyti judesį' : 'Rodyti judesį'}
            className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-foreground/70 text-background opacity-80 transition-opacity hover:opacity-100"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <div className="absolute bottom-3 left-3 flex gap-1">
            {frames.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setPlaying(false); setFrame(i) }}
                aria-label={i === 0 ? 'Pradinė padėtis' : 'Galinė padėtis'}
                className={cn('h-1.5 rounded-full transition-all', i === frame ? 'w-5 bg-foreground/80' : 'w-1.5 bg-foreground/30')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
