import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, UserRole } from '@/types'

interface SignUpArgs {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  /** Privalomas sportininkui, kodas, kurį duoda treneris. */
  inviteCode?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  role: UserRole | null
  loading: boolean
  signUp: (args: SignUpArgs) => Promise<{ needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function parseUser(row: {
  id: string; email: string; first_name: string | null; last_name: string | null
  role: UserRole; phone: string | null; avatar_url: string | null
  created_at: string; updated_at: string
}): User {
  const firstName = row.first_name ?? ''
  const lastName = row.last_name ?? ''
  return {
    id: row.id,
    email: row.email,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    role: row.role,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  /** Kurio žmogaus profilis jau užkrautas, leidžia praleisti token refresh'us. */
  const loadedUserIdRef = useRef<string | null>(null)

  /**
   * Užbaigia paskyros kūrimą: sukuria rolės profilį ir, sportininko atveju,
   * pririša jį prie trenerio pagal pakvietimo kodą.
   *
   * Kviečiama tik tada, kai jau yra tikra sesija, įrašus saugo RLS, kuri
   * remiasi auth.uid(). Idempotentiška ir apsaugota profile_linked vėliavėle,
   * tad realiai suveikia vieną kartą per paskyrą.
   */
  const linkProfile = async (authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
    const meta = authUser.user_metadata ?? {}
    if (meta.profile_linked) return
    const userRole = meta.role as UserRole | undefined
    if (!userRole) return

    const firstName = (meta.first_name as string) ?? ''
    const lastName = (meta.last_name as string) ?? ''
    const phone = (meta.phone as string) ?? null
    const inviteCode = meta.invite_code as string | undefined
    const email = authUser.email ?? ''

    try {
      // Atsarginis users įrašas, įprastai jį sukuria DB trigeris registruojantis.
      const { error: userError } = await supabase.from('users').upsert({
        id: authUser.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: userRole,
        phone,
      }, { onConflict: 'id' })
      if (userError) console.error('Users upsert error (non-fatal):', userError.message)

      if (userRole === 'coach') {
        const { error: coachError } = await supabase
          .from('coach_profiles')
          .upsert({ user_id: authUser.id }, { onConflict: 'user_id' })
        if (coachError) console.error('Coach profile error (non-fatal):', coachError.message)
      }

      if (userRole === 'athlete' && inviteCode) {
        const { data: alreadyLinked } = await supabase
          .from('athlete_profiles')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (!alreadyLinked) {
          const { error: linkError } = await supabase.rpc('claim_athlete_invite', {
            code: inviteCode,
            first_name: firstName,
            last_name: lastName,
            athlete_email: email,
            athlete_phone: phone,
          })
          if (linkError) console.error('Athlete link error (non-fatal):', linkError.message)
        }
      }

      // Pažymime, kad viskas padaryta, kitą kartą blokas praleidžiamas.
      await supabase.auth.updateUser({ data: { profile_linked: true } })
    } catch (e) {
      console.error('linkProfile error (non-fatal):', e)
    }
  }

  const loadUser = async (authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
    await linkProfile(authUser)

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (error) console.error('Load user error:', error.message)

    if (data) {
      loadedUserIdRef.current = authUser.id
      setUser(parseUser(data))
      setRole(data.role)
    } else {
      setUser(null)
      setRole(null)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) await loadUser(session.user)
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if (event === 'SIGNED_OUT') {
          loadedUserIdRef.current = null
          setUser(null)
          setRole(null)
          setLoading(false)
          return
        }
        if (session?.user) {
          // TOKEN_REFRESHED suveikia kaskart grįžus į foninę kortelę. Perkrauti
          // profilį būtų beprasmis viso medžio perpiešimas, jei paskyra ta pati.
          if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && loadedUserIdRef.current === session.user.id) {
            setLoading(false)
            return
          }
          await loadUser(session.user)
        } else {
          loadedUserIdRef.current = null
          setUser(null)
          setRole(null)
        }
        setLoading(false)
      })()
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async ({
    email, password, firstName, lastName, role: userRole, inviteCode, phone,
  }: SignUpArgs): Promise<{ needsEmailConfirmation: boolean }> => {
    // Kodą tikriname iš karto, kol žmogus dar prie formos. Realus prirašymas
    // vyksta vėliau, linkProfile(), jam reikia sesijos dėl RLS.
    // Anoniminė prieiga prie lentelės uždaryta, todėl einame per
    // check_invite_code() SECURITY DEFINER funkciją, kuri atsako tik
    // galioja / panaudotas / neteisingas.
    let normalizedCode: string | undefined
    if (userRole === 'athlete') {
      if (!inviteCode) throw new Error('Reikalingas trenerio pakvietimo kodas')
      normalizedCode = inviteCode.toUpperCase().trim()
      const { data: check, error: checkError } = await supabase
        .rpc('check_invite_code', { code: normalizedCode })
      if (checkError) throw new Error('Nepavyko patikrinti pakvietimo kodo, bandykite dar kartą')
      if (check?.used) throw new Error('Šis pakvietimo kodas jau panaudotas')
      if (!check?.valid) throw new Error('Neteisingas pakvietimo kodas')
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: userRole,
          ...(normalizedCode ? { invite_code: normalizedCode } : {}),
          ...(phone ? { phone } : {}),
        },
      },
    })
    if (authError) throw authError
    if (!authData.user) throw new Error('Nepavyko sukurti paskyros')

    // Nėra sesijos, vadinasi, įjungtas el. pašto patvirtinimas: profilio
    // prirašymas atidedamas iki pirmo prisijungimo su tikra sesija.
    if (!authData.session) return { needsEmailConfirmation: true }

    await loadUser(authData.user)
    return { needsEmailConfirmation: false }
  }

  /**
   * Prisijungimas baigiasi tik tada, kai profilis jau įkeltas. Anksčiau forma
   * nukreipdavo į apsaugotą puslapį dar nežinodama vartotojo, tas grąžindavo
   * atgal į prisijungimą, ir laukai atrodydavo tiesiog išsivalę.
   */
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Nepavyko prisijungti. Bandykite dar kartą.')
    await loadUser(data.user)
    if (loadedUserIdRef.current !== data.user.id) {
      await supabase.auth.signOut()
      throw new Error('Paskyra rasta, bet jos profilis neįkeltas. Bandykite dar kartą po minutės arba parašykite mums.')
    }
  }

  const signOut = async () => {
    // Išvalome iš karto, nelaukiame, kol atsakys Supabase.
    setUser(null)
    setRole(null)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error (non-fatal):', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signUp, signIn, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
