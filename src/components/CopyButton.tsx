import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { enter, exit } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Nukopijuota – varnelė vietoj teksto „Nukopijuota!“; grįžta po 1,5 s. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopy = async (event: React.MouseEvent) => {
    // Kortelė aplink irgi klausosi paspaudimo, jo čia praleisti negalima.
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Clipboard API neveikia be HTTPS arba be leidimo, kodas vis tiek
      // matomas ekrane, tad tylime.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Nukopijuota' : 'Kopijuoti kodą'}
      className={cn(
        'relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground',
        'transition-colors duration-150 hover:bg-muted hover:text-foreground',
        className
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={copied ? 'ok' : 'copy'}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, transition: enter }}
          exit={{ opacity: 0, scale: 0.6, transition: exit }}
          className="absolute grid place-items-center"
        >
          {copied ? <Check className="h-4 w-4 text-foreground" /> : <Copy className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
