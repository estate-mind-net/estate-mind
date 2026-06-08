import { createContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authService } from "@/services/supabase/auth.service"
import { getSupabaseClient } from "@/services/supabase/client"
import type { AuthContextValue, Organization, Profile } from "@/types/auth"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

interface AuthUser {
  id: string
  email?: string
}

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error")
  }

  return "Unknown error"
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

    // profiles.id is the auth user id in this schema, so query by id.

    const { data: profileData, error: profileError } = await client
      .from("profiles")
      .select("id,organization_id,full_name,role")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("[auth-org] profile query failed", { userId, error: profileError })
    }

    const nextProfile = (profileData as Profile | null) ?? null
    setProfile(nextProfile)

    // Resolve organization_id: prefer profiles.organization_id, fall back to organization_members.
    let resolvedOrgId: string | null = nextProfile?.organization_id ?? null

    if (!resolvedOrgId) {
      const { data: memberRow, error: memberError } = await client
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("role", "owner")
        .maybeSingle()

      if (memberError) {
        console.error("[auth-org] organization_members fallback failed", { userId, error: memberError })
      }

      resolvedOrgId = (memberRow as { organization_id: string } | null)?.organization_id ?? null
    }

    if (resolvedOrgId) {
      const { data: organizationData, error: organizationError } = await client
        .from("organizations")
        .select("id,name,type,created_at")
        .eq("id", resolvedOrgId)
        .maybeSingle()

      if (organizationData) {
        setOrganization(organizationData as Organization)
        return
      }

      if (organizationError) {
        console.error("[auth-org] organization query failed", { userId, resolvedOrgId, error: organizationError })
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
        console.error("[auth-org] failed to initialize profile/organization context", {
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
        console.error("[auth-org] failed to refresh profile/organization context", {
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
        setUser(null)
        setProfile(null)
        setOrganization(null)
      },
    }),
    [user, profile, organization, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
