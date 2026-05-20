import { API_CONFIG, hasSupabaseConfig } from '../config'

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

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!hasSupabaseConfig()) {
    console.warn('Supabase configuration not found. Running in mock mode.')
    return null
  }

  if (supabaseInstance) {
    return supabaseInstance
  }

  throw new Error('Supabase client not initialized. Install @supabase/supabase-js and initialize the client.')
}

export const initSupabase = (client: SupabaseClient) => {
  supabaseInstance = client
}
