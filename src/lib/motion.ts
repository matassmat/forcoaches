import type { Transition, Variants } from 'framer-motion'

/**
 * Bendri judesio parametrai: viena kreivė ir kelios trukmės visai sąsajai.
 * Reikšmės tos pačios kaip index.css kintamuosiuose (--ease, --dur-*).
 * Framer Motion CSS kintamųjų neskaito, todėl jos kartojamos čia.
 */

export const ease = [0.22, 1, 0.36, 1] as const

/** Senas vardas, paliktas, kad nereikėtų keisti kiekvieno importo. */
export const easeOutQuint = ease

export const enter: Transition = { duration: 0.32, ease }
/** Išėjimas trumpesnis už atsiradimą, kad sąsaja neatrodytų klampi. */
export const exit: Transition = { duration: 0.18, ease }

/** Aktyvaus punkto fonas, perjungikliai. Be spyruoklių ir atšokimo. */
export const snappy: Transition = { duration: 0.2, ease }
/** Stalčius ir kiti didesni paviršiai. */
export const gentle: Transition = { duration: 0.32, ease }

/** Sąrašo tėvas: vaikai atsiranda vienas po kito su mažu tarpu. */
export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
}

/** Sąrašo elementas. Poroje su staggerParent. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: enter },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: enter },
  out: { opacity: 0, y: -4, transition: exit },
}

/**
 * Modalo langas. Centravimą daro išorinis konteineris, todėl čia tik
 * mažas pakilimas ir permatomumas.
 */
export const dialogPanel: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease } },
  out: { opacity: 0, scale: 0.98, y: 4, transition: exit },
}

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'linear' } },
  out: { opacity: 0, transition: { duration: 0.15, ease: 'linear' } },
}
