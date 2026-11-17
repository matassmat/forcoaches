import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface AppNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string | null
  isRead: boolean
  createdAt: string
}

type Row = {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}

const parse = (row: Row): AppNotification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  isRead: row.is_read,
  createdAt: row.created_at,
})

const LIMIT = 30

/** Pranešimai su realtime, varpelis atsinaujina be puslapio perkrovimo. */
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(LIMIT)

    // Pranešimai yra papildoma informacija, dėl jų klaidos sąsajos negriauname.
    if (error || !data) return

    const list = (data as Row[]).map(parse)
    setNotifications(list)
    setUnread(list.filter((n) => !n.isRead).length)
  }, [user])

  useEffect(() => {
    void load()
    if (!user) return

    // Vardas unikalus kiekvienam prisijungimui. Su pastoviu vardu React
    // StrictMode antrą kartą gaudavo tą patį, jau prenumeruotą kanalą, o
    // `.on()` po `subscribe()` meta klaidą, ji nuvertė visą puslapį.
    const channel = supabase.channel(`notifications:${user.id}:${crypto.randomUUID()}`)

    try {
      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const item = parse(payload.new as Row)
          setNotifications((prev) => [item, ...prev].slice(0, LIMIT))
          setUnread((prev) => prev + 1)
        })
        .subscribe()
    } catch (e) {
      // Realtime yra patogumas, ne būtinybė: sąrašas veikia ir be jo.
      console.error('Realtime prenumerata nepavyko (nekritiška):', e)
    }

    return () => { void supabase.removeChannel(channel) }
  }, [user, load])

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnread((prev) => Math.max(0, prev - 1))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  }, [user])

  return { notifications, unread, markRead, markAllRead, reload: load }
}

/**
 * Pranešimo sukūrimas. Klaidos tyliai praryjamos: jei nepavyko pranešti,
 * pats veiksmas (rezervacija, patvirtinimas) vis tiek turi pavykti.
 */
export async function notify(input: {
  userId: string
  type: string
  title: string
  message?: string
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
  })
  if (error) console.error('Notify failed (non-fatal):', error.message)
}

/** Trenerio auth id sportininko kortelėje ir atvirkščiai, adresatui rasti. */
export async function coachUserIdFor(athleteProfileId: string): Promise<string | null> {
  const { data } = await supabase
    .from('athlete_profiles')
    .select('coach_id')
    .eq('id', athleteProfileId)
    .maybeSingle()
  return data?.coach_id ?? null
}

export async function athleteUserIdFor(athleteProfileId: string): Promise<string | null> {
  const { data } = await supabase
    .from('athlete_profiles')
    .select('user_id')
    .eq('id', athleteProfileId)
    .maybeSingle()
  return data?.user_id ?? null
}
