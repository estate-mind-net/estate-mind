export interface Profile {
  id: string
  user_id?: string
  organization_id?: string | null
  full_name?: string | null
  email?: string
  role?: string | null
  created_at?: string
}

export interface Organization {
  id: string
  name: string
  type?: string
  subscription_tier?: string
  created_at?: string
}

export interface AuthContextValue {
  user: {
    id: string
    email?: string
  } | null
  profile: Profile | null
  organization: Organization | null
  loading: boolean
  signOut: () => Promise<void>
}
