import { API_CONFIG, hasSupabaseConfig } from '../config'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient as RealSupabaseClient } from '@supabase/supabase-js'

export interface SupabaseClient {
  from: (table: string) => SupabaseQueryBuilder
  auth: SupabaseAuth
  storage: SupabaseStorage
}

export interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseQuery
  insert: (data: unknown) => SupabaseQuery
  update: (data: unknown) => SupabaseQuery
  delete: () => SupabaseQuery
  upsert: (data: unknown) => SupabaseQuery
}

export interface SupabaseQuery {
  eq: (column: string, value: unknown) => SupabaseQuery
  neq: (column: string, value: unknown) => SupabaseQuery
  gt: (column: string, value: unknown) => SupabaseQuery
  gte: (column: string, value: unknown) => SupabaseQuery
  lt: (column: string, value: unknown) => SupabaseQuery
  lte: (column: string, value: unknown) => SupabaseQuery
  like: (column: string, pattern: string) => SupabaseQuery
  ilike: (column: string, pattern: string) => SupabaseQuery
  in: (column: string, values: unknown[]) => SupabaseQuery
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery
  limit: (count: number) => SupabaseQuery
  range: (from: number, to: number) => SupabaseQuery
  single: () => SupabaseQuery
  maybeSingle: () => SupabaseQuery
  then: <T>(resolve: (result: SupabaseResponse<T>) => void, reject?: (error: unknown) => void) => Promise<SupabaseResponse<T>>
}

export interface SupabaseResponse<T> {
  data: T | null
  error: SupabaseError | null
}

export interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

export interface SupabaseAuth {
  signUp: (credentials: { email: string; password: string }) => Promise<SupabaseResponse<{ user: unknown }>>
  signIn: (credentials: { email: string; password: string }) => Promise<SupabaseResponse<{ user: unknown }>>
  signOut: () => Promise<SupabaseResponse<void>>
  getUser: () => Promise<SupabaseResponse<unknown>>
  getSession: () => Promise<SupabaseResponse<unknown>>
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => { data: { subscription: { unsubscribe: () => void } } }
}

export interface SupabaseStorage {
  from: (bucket: string) => SupabaseStorageBucket
}

export interface SupabaseStorageBucket {
  upload: (path: string, file: File) => Promise<SupabaseResponse<{ path: string }>>
  download: (path: string) => Promise<SupabaseResponse<Blob>>
  remove: (paths: string[]) => Promise<SupabaseResponse<unknown>>
  getPublicUrl: (path: string) => { data: { publicUrl: string } }
}

let supabaseInstance: SupabaseClient | null = null

const wrapClient = (client: RealSupabaseClient): SupabaseClient => ({
  from: (table: string) => client.from(table) as unknown as SupabaseQueryBuilder,
  auth: {
    signUp: async (credentials) => {
      const { data, error } = await client.auth.signUp(credentials)
      return {
        data: data?.user ? { user: data.user } : null,
        error: error ? { message: error.message, code: error.code, details: error.message } : null,
      }
    },
    signIn: async (credentials) => {
      const { data, error } = await client.auth.signInWithPassword(credentials)
      return {
        data: data?.user ? { user: data.user } : null,
        error: error ? { message: error.message, code: error.code, details: error.message } : null,
      }
    },
    signOut: async () => {
      const { error } = await client.auth.signOut()
      return {
        data: null,
        error: error ? { message: error.message, code: error.code, details: error.message } : null,
      }
    },
    getUser: async () => {
      const { data, error } = await client.auth.getUser()
      return {
        data: data?.user ?? null,
        error: error ? { message: error.message, code: error.code, details: error.message } : null,
      }
    },
    getSession: async () => {
      const { data, error } = await client.auth.getSession()
      return {
        data: data?.session ?? null,
        error: error ? { message: error.message, code: error.code, details: error.message } : null,
      }
    },
    onAuthStateChange: (callback) =>
      client.auth.onAuthStateChange((event, session) => callback(event, session)) as {
        data: { subscription: { unsubscribe: () => void } }
      },
  },
  storage: {
    from: (bucket: string) => {
      const scoped = client.storage.from(bucket)
      return {
        upload: async (path: string, file: File) => {
          const { data, error } = await scoped.upload(path, file)
          return {
            data: data ? { path: data.path } : null,
            error: error ? { message: error.message, code: error.name, details: error.message } : null,
          }
        },
        download: async (path: string) => {
          const { data, error } = await scoped.download(path)
          return {
            data,
            error: error ? { message: error.message, code: error.name, details: error.message } : null,
          }
        },
        remove: async (paths: string[]) => {
          const { data, error } = await scoped.remove(paths)
          return {
            data,
            error: error ? { message: error.message, code: error.name, details: error.message } : null,
          }
        },
        getPublicUrl: (path: string) => scoped.getPublicUrl(path),
      }
    },
  },
})

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!hasSupabaseConfig()) {
    console.warn('Supabase configuration not found. Running in mock mode.')
    return null
  }

  if (supabaseInstance) {
    return supabaseInstance
  }

  const rawClient = createClient(API_CONFIG.supabase.url, API_CONFIG.supabase.anonKey)
  supabaseInstance = wrapClient(rawClient)
  return supabaseInstance
}

export const initSupabase = (client: SupabaseClient) => {
  supabaseInstance = client
}
