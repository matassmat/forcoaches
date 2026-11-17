import { SITE } from '@/lib/site'

/**
 * Google Analytics 4. Skriptas įkeliamas tik žmogui sutikus su analitikos
 * slapukais (BDAR ir Lietuvos elektroninių ryšių įstatymas to reikalauja).
 * Matavimo ID nurodomas `VITE_GA_ID`; jo nėra, nieko neįkeliama.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export type Consent = 'granted' | 'denied'
export const CONSENT_KEY = 'forcoaches_cookie_consent_v1'

export function getConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // be saugyklos sutikimas galioja tik šiam apsilankymui
  }
  if (value === 'granted') loadAnalytics()
  else window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
}

let loaded = false

export function loadAnalytics() {
  if (loaded || !SITE.gaId || getConsent() !== 'granted') return
  loaded = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  window.gtag('js', new Date())
  // Puslapių peržiūros siunčiamos rankiniu būdu, keičiantis maršrutui.
  window.gtag('config', SITE.gaId, { send_page_view: false, anonymize_ip: true })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(SITE.gaId)}`
  document.head.appendChild(script)
}

/** Programos vidus (/treneris, /sportininkas) nematuojamas: ten asmeniniai duomenys. */
export function trackPageView(path: string) {
  if (!loaded || !window.gtag) return
  if (path.startsWith('/treneris') || path.startsWith('/sportininkas')) return
  window.gtag('event', 'page_view', { page_path: path, page_title: document.title })
}

export function trackEvent(name: string, params: Record<string, string | number> = {}) {
  if (!loaded || !window.gtag) return
  window.gtag('event', name, params)
}
