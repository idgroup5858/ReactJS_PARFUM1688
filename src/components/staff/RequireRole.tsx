import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { canOpen, homeOf, useCurrentUser } from '@/app/session'

/** Kirmagan xodim — /login ga (qaytish manzili bilan); ruxsati yo'q bo'lim — o'z bosh sahifasiga. */
export default function RequireRole({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  const { pathname, search } = useLocation()
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />
  if (!canOpen(user.role, pathname)) return <Navigate to={homeOf(user.role)} replace />
  return children
}
