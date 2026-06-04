const PROTECTED_PATHS = ['/dashboard', '/opportunities', '/reports', '/settings']

interface MiddlewareInput {
  pathname: string
  userId: string | null
  loading: boolean
}

interface MiddlewareDecision {
  allow: boolean
  redirectTo?: string
}

export const isProtectedPath = (pathname: string): boolean => {
  return PROTECTED_PATHS.some((basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`))
}

export const evaluateAuthMiddleware = ({ pathname, userId, loading }: MiddlewareInput): MiddlewareDecision => {
  if (loading) {
    return { allow: false }
  }

  if (isProtectedPath(pathname) && !userId) {
    return {
      allow: false,
      redirectTo: '/login',
    }
  }

  return { allow: true }
}
