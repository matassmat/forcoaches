import type { UserRole } from '@/types'

/** Kur nukreipiame prisijungusį žmogų pagal jo rolę. */
export const homePathForRole: Record<UserRole, string> = {
  coach: '/treneris',
  athlete: '/sportininkas',
}
