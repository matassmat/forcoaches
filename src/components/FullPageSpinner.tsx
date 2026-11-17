import { motion } from 'framer-motion'

/**
 * Rodomas, kol tikrinama sesija. Atsiranda su uždelsimu, jei profilis
 * grįžta per 200 ms, sukutis net nespėja pasirodyti ir ekranas nemirkteli.
 */
export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }}
        className="h-8 w-8 rounded-full border-2 border-border border-t-primary anim-spin"
      />
    </div>
  )
}
