import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { API_CONFIG, hasSupabaseConfig } from '../config'

let supabaseInstance: SupabaseClient | null = null

/**
 * Returns a lazily-initialized Supabase client, or null when env vars are absent.
 * All callers must guard the null case — they fall back to mock data automatically.
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!hasSupabaseConfig()) {
    return null
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(
      API_CONFIG.supabase.url,
      API_CONFIG.supabase.anonKey,
    )
  }

  return supabaseInstance
}

export type { SupabaseClient }
