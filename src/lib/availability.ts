import { supabase } from '@/lib/supabase'
import { minutesToTime, normalizeTime, timeToMinutes } from '@/lib/time'

/**
 * Laisvi laikai, modelis paimtas iš Tutorly.
 *
 * Treneris sukuria konkrečius datuotus langus. Kai rezervacija patvirtinama,
 * užimtas ruožas iškerpamas iš lango, o kraštuose likę gabalai grąžinami į
 * laisvus. Atmetus rezervaciją langas atlaisvinamas ir sujungiamas su gretimais,
 * kad nesikauptų nulaužytų gabalėlių.
 */

export interface TimeSlot {
  id: string
  coachId: string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
  bookedByAthleteId: string | null
}

type Row = {
  id: string
  coach_id: string
  date: string
  start_time: string
  end_time: string
  is_booked: boolean
  booked_by_athlete_id: string | null
}

function parse(row: Row): TimeSlot {
  return {
    id: row.id,
    coachId: row.coach_id,
    date: row.date,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    isBooked: row.is_booked,
    bookedByAthleteId: row.booked_by_athlete_id,
  }
}

export async function listSlots(
  coachId: string,
  opts: { fromDate?: string; toDate?: string; onlyFree?: boolean } = {}
): Promise<TimeSlot[]> {
  let query = supabase
    .from('available_time_slots')
    .select('*')
    .eq('coach_id', coachId)
    .order('date')
    .order('start_time')

  if (opts.fromDate) query = query.gte('date', opts.fromDate)
  if (opts.toDate) query = query.lte('date', opts.toDate)
  if (opts.onlyFree) query = query.eq('is_booked', false)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Row[]).map(parse)
}

/** Vienas arba, jei nurodytos savaitės dienos, visa jų serija iki `until`. */
export async function addSlots(input: {
  coachId: string
  date: string
  startTime: string
  endTime: string
  recurringDays?: number[]
  until?: string
}): Promise<number> {
  const rows: { coach_id: string; date: string; start_time: string; end_time: string; is_booked: boolean }[] = []

  const base = { coach_id: input.coachId, start_time: input.startTime, end_time: input.endTime, is_booked: false }

  if (!input.recurringDays?.length) {
    rows.push({ ...base, date: input.date })
  } else {
    const [y, m, d] = input.date.split('-').map(Number)
    const current = new Date(y, m - 1, d)
    const [uy, um, ud] = (input.until ?? input.date).split('-').map(Number)
    const until = new Date(uy, um - 1, ud)

    while (current <= until) {
      if (input.recurringDays.includes(current.getDay())) {
        rows.push({
          ...base,
          date: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
        })
      }
      current.setDate(current.getDate() + 1)
    }
  }

  if (rows.length === 0) return 0

  // ignoreDuplicates, kartojant tą patį intervalą jau esantys langai
  // paliekami ramybėje, o ne verčia visą įterpimą kristi.
  const { error } = await supabase
    .from('available_time_slots')
    .upsert(rows, { onConflict: 'coach_id,date,start_time,end_time', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
  return rows.length
}

export async function deleteSlot(id: string): Promise<void> {
  const { error } = await supabase.from('available_time_slots').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteFreeSlotsFrom(coachId: string, fromDate: string): Promise<void> {
  const { error } = await supabase
    .from('available_time_slots')
    .delete()
    .eq('coach_id', coachId)
    .eq('is_booked', false)
    .gte('date', fromDate)

  if (error) throw new Error(error.message)
}

/** Pažymi langą kaip rezervuotą. */
export async function markSlotBooked(id: string, athleteId: string): Promise<void> {
  const { error } = await supabase
    .from('available_time_slots')
    .update({ is_booked: true, booked_by_athlete_id: athleteId })
    .eq('id', id)
    .eq('is_booked', false) // kad du žmonės neužimtų to paties lango

  if (error) throw new Error(error.message)
}

export async function freeSlot(coachId: string, date: string, startTime: string, endTime: string): Promise<void> {
  const { error } = await supabase
    .from('available_time_slots')
    .update({ is_booked: false, booked_by_athlete_id: null })
    .eq('coach_id', coachId)
    .eq('date', date)
    .eq('start_time', startTime)
    .eq('end_time', endTime)

  if (error) throw new Error(error.message)
}

/**
 * Iškerpa užimtą ruožą iš visų tos dienos langų, su kuriais jis kertasi,
 * ir grąžina kraštuose likusius gabalus kaip laisvus langus.
 */
export async function removeBookedRangeKeepRemainder({
  coachId,
  date,
  startTime,
  endTime,
}: {
  coachId: string
  date: string
  startTime: string
  endTime: string
}): Promise<void> {
  const startMins = timeToMinutes(startTime)
  const endMins = timeToMinutes(endTime)

  const { data, error } = await supabase
    .from('available_time_slots')
    .select('id,start_time,end_time')
    .eq('coach_id', coachId)
    .eq('date', date)

  if (error) throw new Error(error.message)
  if (!data?.length) return

  // Lyginama minutėmis: Postgres grąžina HH:MM:SS, forma duoda HH:MM.
  const overlapping = (data as { id: string; start_time: string; end_time: string }[]).filter((slot) => {
    return timeToMinutes(slot.start_time) < endMins && timeToMinutes(slot.end_time) > startMins
  })
  if (overlapping.length === 0) return

  const { error: deleteError } = await supabase
    .from('available_time_slots')
    .delete()
    .in('id', overlapping.map((s) => s.id))
  if (deleteError) throw new Error(deleteError.message)

  const remainders = overlapping.flatMap((slot) => {
    const slotStart = timeToMinutes(slot.start_time)
    const slotEnd = timeToMinutes(slot.end_time)
    const rows: { coach_id: string; date: string; start_time: string; end_time: string; is_booked: boolean }[] = []

    if (slotStart < startMins) {
      rows.push({ coach_id: coachId, date, start_time: minutesToTime(slotStart), end_time: minutesToTime(startMins), is_booked: false })
    }
    if (slotEnd > endMins) {
      rows.push({ coach_id: coachId, date, start_time: minutesToTime(endMins), end_time: minutesToTime(slotEnd), is_booked: false })
    }
    return rows
  })

  if (remainders.length === 0) return

  const { error: insertError } = await supabase
    .from('available_time_slots')
    .upsert(remainders, { onConflict: 'coach_id,date,start_time,end_time', ignoreDuplicates: true })
  if (insertError) throw new Error(insertError.message)
}

/** Sujungia tos dienos besiliečiančius ar persidengiančius laisvus langus. */
export async function mergeAdjacentSlots(coachId: string, date: string): Promise<void> {
  const { data, error } = await supabase
    .from('available_time_slots')
    .select('id,start_time,end_time')
    .eq('coach_id', coachId)
    .eq('date', date)
    .eq('is_booked', false)
    .order('start_time')

  if (error || !data?.length) return

  const rows = data as { id: string; start_time: string; end_time: string }[]

  // Nulinio ilgio šiukšlės (13:30–13:30), išmetamos iš karto.
  const zeroWidth = rows.filter((s) => timeToMinutes(s.end_time) <= timeToMinutes(s.start_time))
  if (zeroWidth.length) {
    await supabase.from('available_time_slots').delete().in('id', zeroWidth.map((s) => s.id))
  }

  const valid = rows
    .filter((s) => timeToMinutes(s.end_time) > timeToMinutes(s.start_time))
    .map((s) => ({ id: s.id, start: timeToMinutes(s.start_time), end: timeToMinutes(s.end_time) }))
    .sort((a, b) => a.start - b.start)

  if (valid.length < 2) return

  const merged: { start: number; end: number }[] = []
  let current = { ...valid[0] }
  let didMerge = false

  for (let i = 1; i < valid.length; i++) {
    const next = valid[i]
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end)
      didMerge = true
    } else {
      merged.push({ start: current.start, end: current.end })
      current = { ...next }
    }
  }
  merged.push({ start: current.start, end: current.end })

  if (!didMerge) return

  await supabase.from('available_time_slots').delete().in('id', valid.map((s) => s.id))
  await supabase.from('available_time_slots').upsert(
    merged.map((m) => ({
      coach_id: coachId,
      date,
      start_time: minutesToTime(m.start),
      end_time: minutesToTime(m.end),
      is_booked: false,
    })),
    { onConflict: 'coach_id,date,start_time,end_time', ignoreDuplicates: true }
  )
}

// ── Rezervuojami langai ───────────────────────────────────────────────

export interface BookableWindow {
  slotId: string
  dateKey: string
  startTime: string
  endTime: string
}

/**
 * Iš laisvo lango iškarpo treniruotės ilgio langus ir atmeta tuos, kurie
 * kertasi su jau esančiomis rezervacijomis.
 *
 * Be šito sportininkas rezervuotų visą trenerio paskelbtą intervalą, 09–12
 * reikštų tris valandas vienam žmogui. Kai rezervuojamas tik ruožas,
 * `removeBookedRangeKeepRemainder` patvirtinus iškerpa jį iš lango ir grąžina
 * likučius, būtent tam ta logika ir yra.
 *
 * Gryna funkcija: jokių užklausų, tad tikrinama atskirai.
 */
export function bookableWindows({
  slots,
  bookings,
  sessionMinutes,
  minLeadHours = 0,
  now = new Date(),
}: {
  slots: TimeSlot[]
  bookings: { sessionDate: string; startTime: string; endTime: string; status: string }[]
  sessionMinutes: number
  minLeadHours?: number
  now?: Date
}): BookableWindow[] {
  if (sessionMinutes <= 0) return []

  const blocking = new Map<string, { start: number; end: number }[]>()
  for (const booking of bookings) {
    if (!['pending', 'confirmed', 'completed'].includes(booking.status)) continue
    const list = blocking.get(booking.sessionDate) ?? []
    list.push({ start: timeToMinutes(booking.startTime), end: timeToMinutes(booking.endTime) })
    blocking.set(booking.sessionDate, list)
  }

  const earliest = now.getTime() + minLeadHours * 3_600_000
  const result: BookableWindow[] = []

  for (const slot of slots) {
    if (slot.isBooked) continue

    const slotStart = timeToMinutes(slot.startTime)
    const slotEnd = timeToMinutes(slot.endTime)
    const taken = blocking.get(slot.date) ?? []
    const [y, m, d] = slot.date.split('-').map(Number)

    for (let start = slotStart; start + sessionMinutes <= slotEnd; start += sessionMinutes) {
      const end = start + sessionMinutes
      if (taken.some((b) => b.start < end && b.end > start)) continue

      const startsAt = new Date(y, m - 1, d, Math.floor(start / 60), start % 60)
      if (startsAt.getTime() < earliest) continue

      result.push({
        slotId: slot.id,
        dateKey: slot.date,
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
      })
    }
  }

  return result
}

/** Grąžina atšauktą ruožą į laisvus langus ir sujungia su gretimais. */
export async function restoreSlotRange(
  coachId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<void> {
  const { error } = await supabase
    .from('available_time_slots')
    .upsert(
      { coach_id: coachId, date, start_time: startTime, end_time: endTime, is_booked: false },
      { onConflict: 'coach_id,date,start_time,end_time', ignoreDuplicates: true }
    )

  if (error) throw new Error(error.message)
  await mergeAdjacentSlots(coachId, date)
}
