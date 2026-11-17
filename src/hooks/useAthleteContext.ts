import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCoachProfileByUserId, getMyAthleteProfile } from '@/lib/coachProfile'
import type { AthleteProfile, CoachProfile } from '@/types'

/**
 * Viską, ką sportininko puslapiai daro, remiasi dviem įrašais: jo paties
 * kortele ir trenerio nustatymais. Kraunami kartu, kad kiekvienas skyrius
 * to nekartotų.
 */
export function useAthleteContext() {
  const { user } = useAuth()
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null)
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const profile = await getMyAthleteProfile(user.id)
      setAthlete(profile)
      // Trenerio anketa pasiekiama tik per RLS ryšį, tad be kortelės nėra ko klausti.
      setCoach(profile ? await getCoachProfileByUserId(profile.coachId) : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepavyko įkelti duomenų')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  return { athlete, coach, loading, error, reload: load }
}
