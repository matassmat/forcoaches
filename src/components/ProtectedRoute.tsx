import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { homePathForRole } from '@/lib/routes'
import type { UserRole } from '@/types'

export function ProtectedRoute({
  allow,
  children,
}: {
  allow: UserRole
  children: React.ReactNode
}) {
  const { isAuthenticated, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  // `state` išsaugo, kur žmogus norėjo patekti, po prisijungimo grąžiname atgal.
  if (!isAuthenticated) {
    return <Navigate to="/prisijungti" state={{ from: location.pathname }} replace />
  }

  // Prisijungęs, bet ne ta rolė, vedame į jo paties sritį, ne į 404.
  if (role !== allow) {
    return <Navigate to={role ? homePathForRole[role] : '/'} replace />
  }

  return <>{children}</>
}
