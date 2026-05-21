import { getSupabaseClient } from './client'

export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  createdAt: string
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken?: string
}

export interface SignUpCredentials {
  email: string
  password: string
  name?: string
}

export interface SignInCredentials {
  email: string
  password: string
}

export class AuthService {
  async signUp(credentials: SignUpCredentials): Promise<{ user: User | null; error: Error | null }> {
    const client = getSupabaseClient()
    
    if (!client) {
      return {
        user: null,
        error: new Error('Supabase not configured. Authentication is not available in mock mode.'),
      }
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        return { user: null, error: new Error(error.message) }
      }

      return {
        user: data.user as User,
        error: null,
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Unknown error during sign up'),
      }
    }
  }

  async signIn(credentials: SignInCredentials): Promise<{ user: User | null; error: Error | null }> {
    const client = getSupabaseClient()
    
    if (!client) {
      return {
        user: null,
        error: new Error('Supabase not configured. Authentication is not available in mock mode.'),
      }
    }

    try {
      const { data, error } = await client.auth.signIn({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        return { user: null, error: new Error(error.message) }
      }

      return {
        user: data.user as User,
        error: null,
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Unknown error during sign in'),
      }
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    const client = getSupabaseClient()
    
    if (!client) {
      return { error: null }
    }

    try {
      const { error } = await client.auth.signOut()

      if (error) {
        return { error: new Error(error.message) }
      }

      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown error during sign out'),
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return null
    }

    try {
      const { data, error } = await client.auth.getUser()

      if (error || !data) {
        return null
      }

      return data as User
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return null
    }

    try {
      const { data, error } = await client.auth.getSession()

      if (error || !data) {
        return null
      }

      return data as AuthSession
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    const client = getSupabaseClient()
    
    if (!client) {
      return { unsubscribe: () => {} }
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      callback(event, session as AuthSession | null)
    })

    return { unsubscribe: () => subscription.unsubscribe() }
  }
}

export const authService = new AuthService()
