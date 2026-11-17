import { supabase } from '@/lib/supabase'
import { normalizeTime } from '@/lib/time'
import type { Booking, BookingStatus } from '@/types'

/**
 * Rezervacijos. Laisvų langų inventorius gyvena atskirai -
 * `src/lib/availability.ts` (`available_time_slots`), kaip Tutorly.
 */

type BookingRow = {
  id: string
  coach_id: string
  athlete_id: string
  session_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  location: string | null
  price: number | null
  notes: string | null
  cancelled_by: 'coach' | 'athlete' | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

function parseBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    coachId: row.coach_id,
    athleteId: row.athlete_id,
    sessionDate: row.session_date,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    status: row.status,
    location: row.location,
    price: row.price,
    notes: row.notes,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Rezervacija kartu su sportininko vardu, treneriui sąraše to visada reikia. */
export interface BookingWithAthlete extends Booking {
  athleteName: string
}

export async function listCoachBookings(
  coachId: string,
  opts: { fromDate?: string; toDate?: string; status?: BookingStatus } = {}
): Promise<BookingWithAthlete[]> {
  let query = supabase
    .from('bookings')
    .select('*, athlete_profiles!inner(first_name, last_name)')
    .eq('coach_id', coachId)
    .order('session_date')
    .order('start_time')

  if (opts.fromDate) query = query.gte('session_date', opts.fromDate)
  if (opts.toDate) query = query.lte('session_date', opts.toDate)
  if (opts.status) query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data as (BookingRow & { athlete_profiles: { first_name: string | null; last_name: string | null } })[])
    .map((row) => ({
      ...parseBooking(row),
      athleteName: `${row.athlete_profiles?.first_name ?? ''} ${row.athlete_profiles?.last_name ?? ''}`.trim() || 'Be vardo',
    }))
}

export async function listAthleteBookings(athleteId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('session_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as BookingRow[]).map(parseBooking)
}

export async function createBooking(input: {
  coachId: string
  athleteId: string
  sessionDate: string
  startTime: string
  endTime: string
  status?: BookingStatus
  price?: number | null
  location?: string | null
  notes?: string | null
}): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      coach_id: input.coachId,
      athlete_id: input.athleteId,
      session_date: input.sessionDate,
      start_time: input.startTime,
      end_time: input.endTime,
      status: input.status ?? 'pending',
      price: input.price ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) {
    // bookings_no_overlap_idx, kažkas spėjo užimti tą patį laiką.
    if (error.code === '23505') {
      throw new Error('Šis laikas ką tik buvo užimtas, pasirinkite kitą')
    }
    throw new Error(error.message)
  }
  return parseBooking(data as BookingRow)
}

export async function setBookingStatus(
  id: string,
  status: BookingStatus,
  opts: { cancelledBy?: 'coach' | 'athlete'; notes?: string } = {}
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      status,
      ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
      ...(status === 'cancelled'
        ? { cancelled_by: opts.cancelledBy ?? null, cancelled_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/** Treniruotės perkėlimas į kitą laiką, kalendoriaus vilkimui ir redagavimui. */
export async function rescheduleBooking(
  id: string,
  sessionDate: string,
  startTime: string,
  endTime: string
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ session_date: sessionDate, start_time: startTime, end_time: endTime })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') throw new Error('Tuo metu jau yra kita treniruotė')
    throw new Error(error.message)
  }
}
