import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Ar raktai apskritai įrašyti, naudojama įspėjimui parodyti. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    '⚠️ Supabase URL arba Anon Key nenustatyti. Nukopijuokite .env.example į .env ir įrašykite ' +
    'VITE_SUPABASE_URL bei VITE_SUPABASE_ANON_KEY.'
  )
}

// createClient su tuščiu URL meta klaidą ir programa lieka balta. Kol raktų
// nėra, paduodame nekenksmingą placeholder'į: sąsaja užsikrauna ir parodo,
// ko trūksta, o ne tuščią ekraną.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Parse recovery / magic-link tokens that arrive in the URL on load
      detectSessionInUrl: true,
    },
  }
)
