import { supabase } from '@/lib/supabase'

/**
 * Prisijungimo bandymų riba: 5 nesėkmės per 15 min.
 *
 * Tikroji riba saugoma duomenų bazėje (`login_attempt_status`,
 * `record_login_failure`), ji galioja ir kitame įrenginyje. Naršyklės kopija
 * leidžia atsakyti iškart ir veikia, net jei serveris tuo metu nepasiekiamas.
 */

const MAX = 5
const WINDOW_MS = 15 * 60 * 1000
const KEY = 'forcoaches_login_fail_v1'

type Store = Record<string, number[]>

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // saugykla užblokuota: lieka tik serverio riba
  }
}

const recent = (list: number[] = []) => list.filter((t) => Date.now() - t < WINDOW_MS)

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
    super(`Per daug nesėkmingų bandymų. Bandykite vėl po ${minutes} min.`)
  }
}

/** Meta `RateLimitError`, jei šiam el. paštui bandymų jau per daug. */
export async function assertLoginAllowed(email: string): Promise<void> {
  const id = email.trim().toLowerCase()
  const local = recent(read()[id])
  if (local.length >= MAX) {
    throw new RateLimitError((local[0] + WINDOW_MS - Date.now()) / 1000)
  }

  const { data, error } = await supabase.rpc('login_attempt_status', { p_email: id })
  // Jei migracija dar nepaleista arba funkcija nepasiekiama, nestabdome žmogaus.
  const status = data as { allowed?: unknown; retry_after?: number } | null
  if (error || !status || typeof status.allowed !== 'boolean') return
  if (!status.allowed) throw new RateLimitError(status.retry_after ?? WINDOW_MS / 1000)
}

export async function recordLoginFailure(email: string): Promise<number> {
  const id = email.trim().toLowerCase()
  const store = read()
  store[id] = [...recent(store[id]), Date.now()]
  write(store)
  await supabase.rpc('record_login_failure', { p_email: id }).then(() => undefined, () => undefined)
  return Math.max(0, MAX - store[id].length)
}

export async function clearLoginFailures(email: string): Promise<void> {
  const id = email.trim().toLowerCase()
  const store = read()
  delete store[id]
  write(store)
  await supabase.rpc('clear_login_failures', { p_email: id }).then(() => undefined, () => undefined)
}
