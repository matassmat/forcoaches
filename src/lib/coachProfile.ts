import { supabase } from '@/lib/supabase'
import type { AthleteProfile, CoachProfile } from '@/types'

type CoachRow = {
  id: string
  user_id: string
  club_name: string | null
  bio: string | null
  default_session_price: number
  default_session_minutes: number
  cancellation_hours_before: number
  created_at: string
  updated_at: string
}

function parseCoach(row: CoachRow): CoachProfile {
  return {
    id: row.id,
    userId: row.user_id,
    clubName: row.club_name,
    bio: row.bio,
    defaultSessionPrice: Number(row.default_session_price),
    defaultSessionMinutes: row.default_session_minutes,
    cancellationHoursBefore: row.cancellation_hours_before,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCoachProfile(userId: string): Promise<CoachProfile | null> {
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? parseCoach(data as CoachRow) : null
}

export async function updateCoachProfile(
  userId: string,
  patch: Partial<Pick<CoachProfile, 'clubName' | 'bio' | 'defaultSessionPrice' | 'defaultSessionMinutes' | 'cancellationHoursBefore'>>
): Promise<void> {
  const { error } = await supabase
    .from('coach_profiles')
    .update({
      ...(patch.clubName !== undefined ? { club_name: patch.clubName } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.defaultSessionPrice !== undefined ? { default_session_price: patch.defaultSessionPrice } : {}),
      ...(patch.defaultSessionMinutes !== undefined ? { default_session_minutes: patch.defaultSessionMinutes } : {}),
      ...(patch.cancellationHoursBefore !== undefined ? { cancellation_hours_before: patch.cancellationHoursBefore } : {}),
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

/**
 * Prisijungusio sportininko kortelė. Sportininkas savo athlete_profiles.id
 * nežino, visos jo užklausos remiasi šiuo įrašu, tad jis kraunamas pirmas.
 */
export async function getMyAthleteProfile(userId: string): Promise<AthleteProfile | null> {
  const { data, error } = await supabase
    .from('athlete_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    coachId: data.coach_id,
    inviteCode: data.invite_code,
    inviteUsed: data.invite_used,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    birthDate: data.birth_date,
    goal: data.goal,
    status: data.status,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/** Sportininko trenerio nustatymai, trukmė ir atšaukimo terminas. */
export async function getCoachProfileByUserId(coachUserId: string): Promise<CoachProfile | null> {
  return getCoachProfile(coachUserId)
}
