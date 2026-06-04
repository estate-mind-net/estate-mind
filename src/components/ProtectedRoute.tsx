import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { evaluateAuthMiddleware } from '@/middleware/authMiddleware'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const location = useLocation()
  const { user, loading } = useAuth()

  const decision = evaluateAuthMiddleware({
    pathname: location.pathname,
    userId: user?.id ?? null,
    loading,
  })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace...</p>
      </div>
    )
  }

  if (!decision.allow) {
    return <Navigate to={decision.redirectTo ?? '/login'} replace state={{ from: location }} />
  }

  return <Outlet />
}
