import { supabase } from '@/lib/supabase'
import type { AthleteProfile } from '@/types'

type Row = {
  id: string
  user_id: string | null
  coach_id: string
  invite_code: string
  invite_used: boolean
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  goal: string | null
  session_price: number | null
  location: string | null
  status: AthleteProfile['status']
  notes: string | null
  created_at: string
  updated_at: string
}

function parse(row: Row): AthleteProfile {
  return {
    id: row.id,
    userId: row.user_id,
    coachId: row.coach_id,
    inviteCode: row.invite_code,
    inviteUsed: row.invite_used,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date,
    goal: row.goal,
    sessionPrice: row.session_price != null ? Number(row.session_price) : null,
    location: row.location,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** RLS jau apriboja iki savo sportininkų, bet filtras leidžia panaudoti indeksą. */
export async function listAthletes(coachId: string): Promise<AthleteProfile[]> {
  const { data, error } = await supabase
    .from('athlete_profiles')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as Row[]).map(parse)
}

export async function createAthlete(input: {
  coachId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  birthDate?: string
  goal?: string
  sessionPrice?: number | null
  location?: string
  notes?: string
}): Promise<AthleteProfile> {
  // invite_code nesiunčiamas, jį sugeneruoja DB numatytoji reikšmė
  // (gen_invite_code), todėl kodas visada unikalus be lenktynių tarp klientų.
  const { data, error } = await supabase
    .from('athlete_profiles')
    .insert({
      coach_id: input.coachId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      birth_date: input.birthDate?.trim() || null,
      goal: input.goal?.trim() || null,
      session_price: input.sessionPrice ?? null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return parse(data as Row)
}

export async function deleteAthlete(id: string): Promise<void> {
  const { error } = await supabase.from('athlete_profiles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Kortelės redagavimas, treneris keičia kainą, vietą, tikslą, pastabas. */
export async function updateAthlete(
  id: string,
  patch: Partial<Pick<AthleteProfile,
    'firstName' | 'lastName' | 'email' | 'phone' | 'birthDate' | 'goal' |
    'sessionPrice' | 'location' | 'notes' | 'status'>>
): Promise<void> {
  const columns: Record<string, unknown> = {}
  if (patch.firstName !== undefined) columns.first_name = patch.firstName
  if (patch.lastName !== undefined) columns.last_name = patch.lastName
  if (patch.email !== undefined) columns.email = patch.email
  if (patch.phone !== undefined) columns.phone = patch.phone
  if (patch.birthDate !== undefined) columns.birth_date = patch.birthDate
  if (patch.goal !== undefined) columns.goal = patch.goal
  if (patch.sessionPrice !== undefined) columns.session_price = patch.sessionPrice
  if (patch.location !== undefined) columns.location = patch.location
  if (patch.notes !== undefined) columns.notes = patch.notes
  if (patch.status !== undefined) columns.status = patch.status

  const { error } = await supabase.from('athlete_profiles').update(columns).eq('id', id)
  if (error) throw new Error(error.message)
}
