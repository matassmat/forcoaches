import { supabase } from '@/lib/supabase'
import { toDateKey } from '@/lib/time'

/**
 * Finansai. Modelis perimtas iš Tutorly: viena lentelė abiem kryptims,
 * balansas skaičiuojamas iš įrašų, o ne laikomas atskirai, todėl jis
 * niekada neišsiderina su istorija.
 */

export type FinType = 'credit' | 'debit'
export type FinStatus = 'paid' | 'pending'

export interface FinRecord {
  id: string
  coachId: string
  athleteId: string
  bookingId: string | null
  type: FinType
  status: FinStatus
  amount: number
  description: string | null
  date: string
  createdAt: string
}

export interface FinRecordWithAthlete extends FinRecord {
  athleteName: string
}

type Row = {
  id: string
  coach_id: string
  athlete_id: string
  booking_id: string | null
  type: FinType
  status: FinStatus
  amount: number
  description: string | null
  date: string
  created_at: string
  athlete_profiles?: { first_name: string | null; last_name: string | null }
}

function parse(row: Row): FinRecord {
  return {
    id: row.id,
    coachId: row.coach_id,
    athleteId: row.athlete_id,
    bookingId: row.booking_id,
    type: row.type,
    status: row.status,
    amount: Number(row.amount),
    description: row.description,
    date: row.date,
    createdAt: row.created_at,
  }
}

export async function listRecords(coachId: string): Promise<FinRecordWithAthlete[]> {
  const { data, error } = await supabase
    .from('financial_records')
    .select('*, athlete_profiles!inner(first_name, last_name)')
    .eq('coach_id', coachId)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)

  return (data as Row[]).map((row) => ({
    ...parse(row),
    athleteName: `${row.athlete_profiles?.first_name ?? ''} ${row.athlete_profiles?.last_name ?? ''}`.trim() || 'Be vardo',
  }))
}

export async function listAthleteRecords(athleteId: string): Promise<FinRecord[]> {
  const { data, error } = await supabase
    .from('financial_records')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as Row[]).map(parse)
}

export async function addRecord(input: {
  coachId: string
  athleteId: string
  type: FinType
  amount: number
  description?: string
  date?: string
  status?: FinStatus
  bookingId?: string | null
}): Promise<FinRecord> {
  const { data, error } = await supabase
    .from('financial_records')
    .insert({
      coach_id: input.coachId,
      athlete_id: input.athleteId,
      booking_id: input.bookingId ?? null,
      type: input.type,
      status: input.status ?? 'paid',
      amount: input.amount,
      description: input.description?.trim() || (input.type === 'credit' ? 'Mokėjimas gautas' : 'Treniruotė'),
      date: input.date ?? toDateKey(new Date()),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parse(data as Row)
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from('financial_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Įvykusi treniruotė virsta skola. Unikalus indeksas ant booking_id neleidžia
 * to padaryti du kartus, todėl pakartotinis „Įvyko“ paspaudimas yra saugus -
 * dublikato klaidą tyliai praryjame.
 *
 * Grąžina `false`, kai kainos nėra: tada įrašas nekuriamas, bet iškvietėjas
 * apie tai praneša treneriui, o ne tyli.
 */
export async function chargeForBooking(input: {
  coachId: string
  athleteId: string
  bookingId: string
  amount: number
  date: string
}): Promise<boolean> {
  if (!(input.amount > 0)) return false

  const { error } = await supabase.from('financial_records').insert({
    coach_id: input.coachId,
    athlete_id: input.athleteId,
    booking_id: input.bookingId,
    type: 'debit',
    status: 'pending',
    amount: input.amount,
    description: 'Treniruotė',
    date: input.date,
  })

  if (error && error.code !== '23505') throw new Error(error.message)
  return true
}

// ── Skaičiavimai ──────────────────────────────────────────────────────

export interface FinTotals {
  received: number
  charged: number
  balance: number
  unpaid: number
}

export function totals(records: FinRecord[]): FinTotals {
  const received = records.filter((r) => r.type === 'credit').reduce((s, r) => s + r.amount, 0)
  const charged = records.filter((r) => r.type === 'debit').reduce((s, r) => s + r.amount, 0)
  const unpaid = records
    .filter((r) => r.type === 'debit' && r.status === 'pending')
    .reduce((s, r) => s + r.amount, 0)

  return { received, charged, balance: received - charged, unpaid }
}

/** Balansas kiekvienam sportininkui. Neigiamas, jis skolingas. */
export function balancesByAthlete(records: FinRecord[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of records) {
    const current = map.get(r.athleteId) ?? 0
    map.set(r.athleteId, r.type === 'credit' ? current + r.amount : current - r.amount)
  }
  return map
}

/** Paskutinių N mėnesių pajamos ir priskaičiavimai grafikui. */
export function monthlySeries(records: FinRecord[], months = 6) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const inMonth = records.filter((r) => r.date?.startsWith(key))
    return {
      name: d.toLocaleDateString('lt-LT', { month: 'short' }),
      gauta: inMonth.filter((r) => r.type === 'credit').reduce((s, r) => s + r.amount, 0),
      priskaiciuota: inMonth.filter((r) => r.type === 'debit').reduce((s, r) => s + r.amount, 0),
    }
  })
}

/** Iš kurio sportininko kiek uždirbta, pyragui. */
export function revenueByAthlete(records: FinRecordWithAthlete[], limit = 6) {
  const map = new Map<string, number>()
  for (const r of records.filter((r) => r.type === 'debit')) {
    map.set(r.athleteName, (map.get(r.athleteName) ?? 0) + r.amount)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export const formatEur = (value: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value)

/**
 * Spausdinama ataskaita. Atidaroma naujame lange, iš kurio treneris
 * spausdina arba išsaugo PDF, jokios papildomos bibliotekos nereikia.
 */
export function openReport(
  records: FinRecordWithAthlete[],
  opts: { coachName: string; scope: string }
): void {
  const t = totals(records)
  const rows = records
    .map((r) => `
      <tr>
        <td>${r.date}</td>
        <td>${escapeHtml(r.athleteName)}</td>
        <td>${escapeHtml(r.description ?? '')}</td>
        <td class="type ${r.type}">${r.type === 'credit' ? 'Mokėjimas' : 'Priskaičiuota'}</td>
        <td class="num ${r.type}">${r.type === 'credit' ? '+' : '−'}${r.amount.toFixed(2)} €</td>
      </tr>`)
    .join('')

  const html = `<!doctype html>
<html lang="lt"><head><meta charset="utf-8">
<title>Finansų ataskaita</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 24px; letter-spacing: -0.02em; }
  .meta { color: #666; font-size: 13px; margin-top: 4px; }
  .cards { display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap; }
  .card { border: 1px solid #ddd; border-radius: 10px; padding: 14px 18px; min-width: 150px; }
  .card p { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #666; }
  .card strong { display: block; font-size: 22px; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
       color: #666; border-bottom: 2px solid #111; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #eee; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .credit { color: #15803d; }
  .debit { color: #b91c1c; }
  .type { font-size: 12px; }
  @media print { body { padding: 0; } .card { break-inside: avoid; } }
</style></head>
<body>
  <h1>Finansų ataskaita</h1>
  <p class="meta">${escapeHtml(opts.coachName)} · ${escapeHtml(opts.scope)} · sudaryta ${new Date().toLocaleDateString('lt-LT')}</p>

  <div class="cards">
    <div class="card"><p>Gauta</p><strong class="credit">${t.received.toFixed(2)} €</strong></div>
    <div class="card"><p>Priskaičiuota</p><strong>${t.charged.toFixed(2)} €</strong></div>
    <div class="card"><p>Neapmokėta</p><strong class="debit">${t.unpaid.toFixed(2)} €</strong></div>
    <div class="card"><p>Balansas</p><strong>${t.balance.toFixed(2)} €</strong></div>
  </div>

  <table>
    <thead><tr><th>Data</th><th>Sportininkas</th><th>Aprašymas</th><th>Tipas</th><th class="num">Suma</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">Įrašų nėra</td></tr>'}</tbody>
  </table>

  <script>window.onload = () => window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
