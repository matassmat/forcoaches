/**
 * Klaidų pranešimai lietuviškai.
 *
 * Supabase, PostgREST ir naršyklė grąžina angliškus pranešimus („Invalid
 * login credentials“, „Failed to fetch“). Žmogui jų rodyti negalima, todėl
 * kiekviena klaida, prieš patekdama į ekraną, praeina pro `errorMessage()`.
 * Mūsų pačių mestos klaidos jau lietuviškos ir paliekamos kaip yra.
 */

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown; name?: unknown }

const NETWORK = 'Nepavyko susisiekti su serveriu. Patikrinkite interneto ryšį ir bandykite dar kartą.'
const RATE = 'Per daug bandymų. Palaukite kelias minutes ir bandykite vėl.'

/** Pagal klaidos kodą (Supabase Auth ir Postgres). */
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'Neteisingas el. paštas arba slaptažodis.',
  email_not_confirmed: 'El. paštas dar nepatvirtintas. Atsidarykite laišką ir paspauskite patvirtinimo nuorodą.',
  user_already_exists: 'Paskyra su šiuo el. paštu jau yra. Prisijunkite arba atkurkite slaptažodį.',
  email_exists: 'Paskyra su šiuo el. paštu jau yra. Prisijunkite arba atkurkite slaptažodį.',
  weak_password: 'Slaptažodis per silpnas. Naudokite bent 8 simbolius su raidėmis ir skaičiais.',
  same_password: 'Naujas slaptažodis turi skirtis nuo dabartinio.',
  email_address_invalid: 'Šis el. pašto adresas netinkamas.',
  over_request_rate_limit: RATE,
  over_email_send_rate_limit: 'Išsiųsta per daug laiškų. Pabandykite vėl po valandos.',
  over_sms_send_rate_limit: RATE,
  session_expired: 'Sesija baigėsi. Prisijunkite iš naujo.',
  session_not_found: 'Sesija baigėsi. Prisijunkite iš naujo.',
  refresh_token_not_found: 'Sesija baigėsi. Prisijunkite iš naujo.',
  user_not_found: 'Tokios paskyros nėra.',
  user_banned: 'Ši paskyra užblokuota.',
  signup_disabled: 'Registracija šiuo metu išjungta.',
  captcha_failed: 'Nepavyko patikrinti, ar esate žmogus. Bandykite dar kartą.',
  // Postgres
  '23505': 'Toks įrašas jau yra.',
  '23503': 'Susijęs įrašas nerastas arba dar naudojamas kitur.',
  '23514': 'Netinkama reikšmė.',
  '23502': 'Neužpildytas privalomas laukas.',
  '22P02': 'Netinkamas reikšmės formatas.',
  '42501': 'Neturite teisės atlikti šio veiksmo.',
  P0001: '', // mūsų funkcijų RAISE EXCEPTION: rodomas pats pranešimas
  PGRST116: 'Įrašas nerastas.',
  PGRST301: 'Sesija baigėsi. Prisijunkite iš naujo.',
}

/** Pagal pranešimo tekstą, kai kodo nėra. */
const BY_TEXT: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/user already registered|already been registered/i, BY_CODE.user_already_exists],
  [/password should be at least (\d+)/i, (m) => `Slaptažodis turi būti bent ${m[1]} simbolių.`],
  [/password should contain/i, 'Slaptažodyje turi būti didžiųjų, mažųjų raidžių ir skaičių.'],
  [/new password should be different/i, BY_CODE.same_password],
  [/email rate limit|email.*send.*rate/i, BY_CODE.over_email_send_rate_limit],
  [/only request this after (\d+) seconds/i, (m) => `Saugumo sumetimais palaukite ${m[1]} s ir bandykite vėl.`],
  [/rate limit|too many requests|too many attempts/i, RATE],
  [/unable to validate email|invalid format|email address .* is invalid/i, BY_CODE.email_address_invalid],
  [/signup requires a valid password/i, 'Įveskite slaptažodį.'],
  [/jwt expired|invalid jwt|refresh token/i, BY_CODE.session_expired],
  [/database error saving new user/i, 'Nepavyko sukurti paskyros. Bandykite dar kartą po minutės.'],
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed|err_name_not_resolved|err_internet_disconnected/i, NETWORK],
  [/aborted|timeout|timed out/i, 'Serveris neatsakė laiku. Bandykite dar kartą.'],
  [/duplicate key value/i, BY_CODE['23505']],
  [/row-level security|permission denied/i, BY_CODE['42501']],
  [/violates foreign key/i, BY_CODE['23503']],
  [/violates check constraint/i, BY_CODE['23514']],
  [/violates not-null/i, BY_CODE['23502']],
  [/invalid input syntax/i, BY_CODE['22P02']],
  [/storage.*(size|too large)|payload too large/i, 'Failas per didelis.'],
]

/** Angliškas sisteminis pranešimas, kurio žmogui rodyti nereikia. */
const looksEnglish = (text: string) =>
  /\b(the|is|not|to|of|failed|invalid|error|could|unable|cannot|must|should|found|unexpected|undefined|null)\b/i.test(text)

export function errorMessage(error: unknown, fallback = 'Įvyko klaida. Bandykite dar kartą.'): string {
  if (!error) return fallback
  const e = (typeof error === 'object' ? error : { message: String(error) }) as ErrorLike
  const message = typeof e.message === 'string' ? e.message.trim() : typeof error === 'string' ? error : ''
  const code = typeof e.code === 'string' ? e.code : undefined

  if (e.status === 429) return RATE
  if (code && BY_CODE[code]) return BY_CODE[code]
  if (code === 'P0001' && message) return message

  for (const [pattern, text] of BY_TEXT) {
    const match = message.match(pattern)
    if (match) return typeof text === 'function' ? text(match) : text
  }

  if (message && !looksEnglish(message)) return message

  if (message) console.error('Neišversta klaida:', error)
  return fallback
}
