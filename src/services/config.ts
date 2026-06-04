const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (import.meta.env.DEV) {
  const maskedUrl = supabaseUrl ? `${supabaseUrl.slice(0, 20)}...` : 'missing'
  console.info('[supabase-config]', {
    urlPresent: Boolean(supabaseUrl),
    anonKeyPresent: Boolean(supabaseAnonKey),
    urlPreview: maskedUrl,
  })
}

export const API_CONFIG = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  ai: {
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    modelName: import.meta.env.VITE_AI_MODEL_NAME || 'gpt-4o',
  },
  app: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
    environment: import.meta.env.MODE || 'development',
  },
} as const

export const isProduction = () => API_CONFIG.app.environment === 'production'
export const isDevelopment = () => API_CONFIG.app.environment === 'development'

export const hasSupabaseConfig = () => {
  return Boolean(API_CONFIG.supabase.url && API_CONFIG.supabase.anonKey)
}

export const hasAIConfig = () => {
  return Boolean(API_CONFIG.ai.openaiApiKey)
}
