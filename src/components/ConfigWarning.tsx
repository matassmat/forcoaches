import { AlertTriangle } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase'

/** Juosta, kol .env dar be Supabase raktų, kitaip prisijungimas tiesiog tyliai neveiktų. */
export function ConfigWarning() {
  if (isSupabaseConfigured) return null

  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-muted px-4 py-2 text-center text-sm text-foreground">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <span>
        Supabase raktai nenustatyti, prisijungimas neveiks. Nukopijuokite{' '}
        <code className="font-mono">.env.example</code> į <code className="font-mono">.env</code>.
      </span>
    </div>
  )
}
