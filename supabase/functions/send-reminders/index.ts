/**
 * Priminimai apie rytojaus treniruotes.
 *
 * Paleidžiama kas valandą per Supabase Cron. Kad tas pats priminimas
 * neišeitų du kartus, išsiuntimas žymimas `bookings.reminder_sent_at`.
 *
 * Reikalingi Secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — jie egzistuoja automatiškai
 *   RESEND_API_KEY                          — https://resend.com
 *   REMINDER_FROM                           — pvz. "ForCoaches <treniruotes@jusu-domenas.lt>"
 *   CRON_SECRET                             — atsitiktinė eilutė, ta pati Cron užklausos antraštėje x-cron-secret
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

interface BookingRow {
  id: string
  session_date: string
  start_time: string
  end_time: string
  location: string | null
  athlete_profiles: {
    first_name: string | null
    email: string | null
    users: { email: string } | null
  } | null
  users: { first_name: string | null; last_name: string | null } | null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Funkciją kviečia tik Supabase Cron su slaptu raktu antraštėje. Be jo bet
  // kas, žinantis adresą, galėtų ją paleidinėti ir siuntinėti laiškus.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Neleidžiama' }, 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('REMINDER_FROM')
  if (!resendKey || !from) {
    return json({ error: 'RESEND_API_KEY arba REMINDER_FROM nenustatyti' }, 500)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Rytojaus data serverio laiku. Priminimas siunčiamas dieną prieš —
  // tą pačią dieną jis jau nieko nebeišgelbėja.
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateKey = tomorrow.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, session_date, start_time, end_time, location,
      athlete_profiles!inner ( first_name, email, users ( email ) ),
      users!bookings_coach_id_fkey ( first_name, last_name )
    `)
    .eq('session_date', dateKey)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)

  if (error) return json({ error: error.message }, 500)

  const bookings = (data ?? []) as unknown as BookingRow[]
  const sent: string[] = []
  const skipped: string[] = []

  for (const booking of bookings) {
    // Paskyros el. paštas patikimesnis už trenerio įvestą kortelėje.
    const to = booking.athlete_profiles?.users?.email ?? booking.athlete_profiles?.email
    if (!to) { skipped.push(booking.id); continue }

    const coach = [booking.users?.first_name, booking.users?.last_name].filter(Boolean).join(' ')
    const time = `${booking.start_time.slice(0, 5)}-${booking.end_time.slice(0, 5)}`

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `Rytoj treniruotė ${time}`,
        html: reminderHtml({
          name: booking.athlete_profiles?.first_name ?? '',
          date: booking.session_date,
          time,
          location: booking.location,
          coach,
        }),
      }),
    })

    if (!response.ok) {
      console.error('Resend klaida:', booking.id, await response.text())
      skipped.push(booking.id)
      continue
    }

    // Žymima tik po sėkmingo išsiuntimo — kitaip nepavykęs laiškas
    // dingtų visam laikui.
    await supabase
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id)

    sent.push(booking.id)
  }

  return json({ date: dateKey, sent: sent.length, skipped: skipped.length })
})

function reminderHtml(input: {
  name: string
  date: string
  time: string
  location: string | null
  coach: string
}): string {
  return `<!doctype html>
<html lang="lt"><body style="margin:0;background:#0a0b0f;padding:32px 16px;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#12141b;border:1px solid #262a35;border-radius:12px;padding:32px">
    <p style="margin:0 0 24px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a8f9e">
      ForCoaches
    </p>

    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#f5f5f2">
      ${escapeHtml(input.name)}, rytoj treniruotė
    </h1>

    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#c8ccd6">
      <tr><td style="padding:6px 0;color:#8a8f9e">Data</td><td style="padding:6px 0">${input.date}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8f9e">Laikas</td><td style="padding:6px 0">${input.time}</td></tr>
      ${input.location ? `<tr><td style="padding:6px 0;color:#8a8f9e">Vieta</td><td style="padding:6px 0">${escapeHtml(input.location)}</td></tr>` : ''}
      ${input.coach ? `<tr><td style="padding:6px 0;color:#8a8f9e">Treneris</td><td style="padding:6px 0">${escapeHtml(input.coach)}</td></tr>` : ''}
    </table>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8a8f9e">
      Jei negalėsite atvykti, atšaukite sistemoje — laikas atsilaisvins kitiems.
    </p>
  </div>
</body></html>`
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
