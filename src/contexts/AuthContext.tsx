import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '@/services/supabase/auth.service'
import { getSupabaseClient } from '@/services/supabase/client'
import type { AuthContextValue, Organization, Profile } from '@/types/auth'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

interface AuthUser {
  id: string
  email?: string
}

const logAuthOrgDebug = (message: string, payload?: unknown) => {
  if (import.meta.env.DEV) {
    console.info(`[auth-org] ${message}`, payload)
  }
}

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error')
  }

  return 'Unknown error'
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfileAndOrganization = async (userId: string) => {
    const client = getSupabaseClient()

    if (!client) {
      setProfile(null)
      setOrganization(null)
      return
    }

    logAuthOrgDebug('loading organization context', { userId })

    const profileByIdResult = await client
      .from('profiles')
      .select('id,organization_id,full_name,role,user_id,email,created_at')
      .eq('id', userId)
      .maybeSingle()

    let nextProfile = (profileByIdResult.data as Profile | null) ?? null

    if (!nextProfile && !profileByIdResult.error) {
      const profileByUserIdResult = await client
        .from('profiles')
        .select('id,organization_id,full_name,role,user_id,email,created_at')
        .eq('user_id', userId)
        .maybeSingle()

      nextProfile = (profileByUserIdResult.data as Profile | null) ?? null

      if (profileByUserIdResult.error) {
        logAuthOrgDebug('profile query by user_id failed', {
          userId,
          error: profileByUserIdResult.error,
        })
      }
    }

    if (profileByIdResult.error) {
      logAuthOrgDebug('profile query by id failed', {
        userId,
        error: profileByIdResult.error,
      })
    }

    setProfile(nextProfile)

    logAuthOrgDebug('profile resolved', {
      userId,
      profileId: nextProfile?.id ?? null,
      profileOrganizationId: nextProfile?.organization_id ?? null,
    })

    if (nextProfile?.organization_id) {
      const { data: organizationData, error: organizationError } = await client
        .from('organizations')
        .select('id,name,type,subscription_tier,created_at')
        .eq('id', nextProfile.organization_id)
        .maybeSingle()

      logAuthOrgDebug('organization query result', {
        userId,
        profileId: nextProfile.id,
        profileOrganizationId: nextProfile.organization_id,
        organizationData,
        organizationError,
      })

      if (organizationData) {
        setOrganization(organizationData as Organization)
        return
      }

      if (organizationError) {
        console.error('[auth-org] organization query failed', {
          userId,
          profileId: nextProfile.id,
          profileOrganizationId: nextProfile.organization_id,
          error: organizationError,
        })
      }
    }

    setOrganization(null)
  }

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      const currentUser = await authService.getCurrentUser()

      if (!isMounted) {
        return
      }

      if (!currentUser) {
        setUser(null)
        setProfile(null)
        setOrganization(null)
        setLoading(false)
        return
      }

      try {
        setUser({ id: currentUser.id, email: currentUser.email })
        await loadProfileAndOrganization(currentUser.id)
      } catch (error) {
        console.error('[auth-org] failed to initialize profile/organization context', {
          userId: currentUser.id,
          error: extractErrorMessage(error),
        })
        setProfile(null)
        setOrganization(null)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    void initialize()

    const subscription = authService.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return
      }

      const nextUser = session?.user as { id: string; email?: string } | undefined

      if (!nextUser) {
        setUser(null)
        setProfile(null)
        setOrganization(null)
        setLoading(false)
        return
      }

      try {
        setUser({ id: nextUser.id, email: nextUser.email })
        await loadProfileAndOrganization(nextUser.id)
      } catch (error) {
        console.error('[auth-org] failed to refresh profile/organization context', {
          userId: nextUser.id,
          error: extractErrorMessage(error),
        })
        setProfile(null)
        setOrganization(null)
      }

      if (isMounted) {
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      organization,
      loading,
      signOut: async () => {
        await authService.signOut()
      },
    }),
    [user, profile, organization, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
