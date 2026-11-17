import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { getConsent, loadAnalytics, setConsent } from '@/lib/analytics'
import { enter, exit } from '@/lib/motion'
import { SITE } from '@/lib/site'

const OPEN_EVENT = 'forcoaches:cookie-settings'

/** Atidaro sutikimo juostą iš naujo (nuoroda puslapio apačioje). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

/**
 * Slapukų sutikimas. Rodoma tik tada, kai analitika apskritai įjungta
 * (`VITE_GA_ID`). Atsisakyti taip pat lengva kaip sutikti.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!SITE.gaId) return
    const consent = getConsent()
    if (consent === 'granted') loadAnalytics()
    if (consent === null) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  const choose = (value: 'granted' | 'denied') => {
    setConsent(value)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && SITE.gaId && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Slapukų sutikimas"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: enter }}
          exit={{ opacity: 0, y: 16, transition: exit }}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_hsl(var(--foreground)/0.08)] sm:bottom-5"
        >
          <p className="text-sm leading-6 text-foreground">
            Naudojame analitikos slapukus, kad suprastume, kurie puslapiai naudingi. Be sutikimo jų nėra.{' '}
            <Link to="/privatumas" className="link-underline text-muted-foreground">Daugiau</Link>
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => choose('denied')}>Atsisakyti</Button>
            <Button size="sm" className="flex-1" onClick={() => choose('granted')}>Sutinku</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
