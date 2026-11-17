import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Timer, X } from 'lucide-react'
import { enter, exit } from '@/lib/motion'

/**
 * Poilsio laikmatis tarp serijų. Pažymėjus seriją, apačioje atsiranda
 * atgalinis skaičiavimas pagal trenerio nurodytą poilsį; pasibaigus
 * telefonas suvibruoja ir trumpai pyptelėja.
 */
export function RestTimer({
  seconds, label, startedAt, onDone,
}: {
  seconds: number
  label: string
  /** Pakeitus reikšmę laikmatis pradeda iš naujo. */
  startedAt: number | null
  onDone: () => void
}) {
  const [left, setLeft] = useState(seconds)
  const [extra, setExtra] = useState(0)
  const finished = useRef(false)

  useEffect(() => {
    setExtra(0)
    finished.current = false
  }, [startedAt])

  useEffect(() => {
    if (startedAt == null) return
    const tick = () => {
      const remaining = Math.ceil(seconds + extra - (Date.now() - startedAt) / 1000)
      setLeft(remaining)
      if (remaining <= 0 && !finished.current) {
        finished.current = true
        navigator.vibrate?.([200, 100, 200])
        beep()
        window.setTimeout(onDone, 1500)
      }
    }
    tick()
    const t = window.setInterval(tick, 250)
    return () => clearInterval(t)
  }, [startedAt, seconds, extra, onDone])

  const total = seconds + extra
  const progress = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
  const mm = Math.floor(Math.max(0, left) / 60)
  const ss = String(Math.max(0, left) % 60).padStart(2, '0')

  return (
    <AnimatePresence>
      {startedAt != null && (
        <motion.div
          role="timer"
          aria-live="polite"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: enter }}
          exit={{ y: 80, opacity: 0, transition: exit }}
          className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_30px_hsl(var(--foreground)/0.1)] lg:left-[calc(15rem+0.75rem)]"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Timer className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{left > 0 ? `Poilsis po: ${label}` : 'Laikas kitai serijai'}</p>
              <p className="stat-num text-2xl text-foreground">{left > 0 ? `${mm}:${ss}` : 'Pirmyn'}</p>
            </div>
            <button
              type="button"
              onClick={() => setExtra((e) => e + 15)}
              className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-foreground hover:bg-foreground/10"
            >
              +15 s
            </button>
            <button
              type="button"
              onClick={onDone}
              aria-label="Praleisti poilsį"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => void ctx.close()
  } catch {
    // garsas neprivalomas
  }
}
