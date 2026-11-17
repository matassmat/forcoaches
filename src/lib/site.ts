/**
 * Viešoji svetainės informacija. Reikšmės ateina iš aplinkos kintamųjų
 * (`.env`, Vercel/Netlify nustatymai), kad keičiant domeną ar el. paštą
 * nereikėtų liesti kodo. Čia nėra nieko slapto: visa tai rodoma puslapyje.
 */

const env = import.meta.env

export const SITE = {
  name: 'ForCoaches',
  /** Be pasvirojo brūkšnio gale, pvz. https://forcoaches.lt */
  url: (env.VITE_SITE_URL || 'https://forcoaches.lt').replace(/\/$/, ''),
  contactEmail: env.VITE_CONTACT_EMAIL || '',
  /** Per kiek laiko atsakome. Keiskite tik tada, kai tikrai to laikotės. */
  responseTime: env.VITE_RESPONSE_TIME || '1 darbo dieną',
  /** Įmonės rekvizitai privatumo politikai ir struktūrizuotiems duomenims. */
  company: {
    legalName: env.VITE_COMPANY_NAME || '',
    code: env.VITE_COMPANY_CODE || '',
    street: env.VITE_COMPANY_STREET || '',
    city: env.VITE_COMPANY_CITY || 'Vilnius',
    postalCode: env.VITE_COMPANY_POSTAL || '',
    phone: env.VITE_COMPANY_PHONE || '',
  },
  gaId: env.VITE_GA_ID || '',
  ogImage: '/og-image.png',
}
