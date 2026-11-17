import { useEffect, useRef, useState } from 'react'
import { CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Brūkšninio kodo skaitytuvas. Kur naršyklė turi `BarcodeDetector`
 * (Chrome, Android), naudojamas jis; kitur, pvz. iPhone, ZXing biblioteka,
 * įkeliama tik atidarius skaitytuvą. Kodą visada galima įvesti ir ranka.
 */
export function BarcodeScanner({ onCode, busy }: { onCode: (code: string) => void; busy?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const handled = useRef(false)

  useEffect(() => {
    let stopped = false
    let stop: (() => void) | null = null

    const done = (code: string) => {
      if (handled.current || stopped) return
      handled.current = true
      navigator.vibrate?.(40)
      onCode(code)
    }

    async function start() {
      const video = videoRef.current
      if (!video) return
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Ši naršyklė neleidžia naudoti kameros. Įveskite kodą ranka.')
        return
      }

      type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
      const NativeDetector = (window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => Detector
      }).BarcodeDetector

      try {
        if (NativeDetector) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
          video.srcObject = stream
          await video.play()
          const detector = new NativeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
          let frame = 0
          const tick = async () => {
            if (stopped || handled.current) return
            try {
              const found = await detector.detect(video)
              if (found[0]?.rawValue) { done(found[0].rawValue); return }
            } catch { /* kadras dar neparuoštas */ }
            frame = window.setTimeout(tick, 200)
          }
          void tick()
          stop = () => { clearTimeout(frame); stream.getTracks().forEach((t) => t.stop()) }
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (stopped) return
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: 'environment' } },
            video,
            (result) => { if (result) done(result.getText()) }
          )
          stop = () => controls.stop()
          if (stopped) stop()
        }
      } catch (e) {
        const denied = e instanceof DOMException && e.name === 'NotAllowedError'
        setCameraError(denied
          ? 'Kamera neleista. Leiskite ją naršyklės nustatymuose arba įveskite kodą ranka.'
          : 'Nepavyko įjungti kameros. Įveskite kodą ranka.')
      }
    }

    void start()
    return () => { stopped = true; stop?.() }
  }, [onCode])

  return (
    <div className="space-y-4">
      {cameraError ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
          <CameraOff className="mt-0.5 h-4 w-4 shrink-0" />
          {cameraError}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-foreground/90">
          <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
          {/* Taikiklis: brūkšninis kodas turi tilpti šiame rėmelyje. */}
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 rounded-md border-2 border-background/80" />
          <p className="absolute inset-x-0 bottom-3 text-center text-xs text-background/80">
            Nukreipkite kamerą į brūkšninį kodą
          </p>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const code = manual.replace(/\D/g, '')
          if (code.length >= 8) onCode(code)
        }}
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          inputMode="numeric"
          placeholder="arba įveskite kodą, pvz. 4770535047738"
          className="code"
        />
        <Button type="submit" variant="outline" loading={busy}>Ieškoti</Button>
      </form>
    </div>
  )
}
