export type RentalStrategy = 'long_term' | 'airbnb' | 'flip' | 'mixed'
export type RiskTolerance = 'low' | 'medium' | 'high'
export type RenovationPreference = 'none' | 'light' | 'heavy' | 'any'

export interface InvestmentSearchBrief {
  id: string
  organization_id: string
  title: string
  countries: string[]
  cities: string[]
  districts: string[]
  min_price: number | null
  max_price: number | null
  currency: string | null
  min_size_m2: number | null
  max_size_m2: number | null
  property_types: string[]
  rental_strategy: RentalStrategy
  target_yield: number | null
  risk_tolerance: RiskTolerance
  renovation_preference: RenovationPreference
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OpportunitySource {
  id: string
  organization_id: string
  name: string
  type: string
  source_url: string | null
  seed_urls: string[]
  connector_config: Record<string, unknown>
  terms_checked: boolean
  allowed_use_notes: string | null
  rate_limit_per_hour: number | null
  contact_email: string | null
  is_enabled: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface SourceConnectorRun {
  id: string
  organization_id: string
  source_id: string | null
  brief_id: string | null
  connector_name: string
  connector_type: string
  status: 'running' | 'succeeded' | 'failed' | 'partial'
  started_at: string
  completed_at: string | null
  opportunities_fetched: number
  opportunities_inserted: number
  opportunities_deduplicated: number
  opportunities_matched: number
  error_message: string | null
  metadata: Record<string, unknown>
}

export interface RawOpportunity {
  id?: string
  organization_id?: string
  source_id?: string | null
  connector_run_id?: string | null
  external_id?: string | null
  source_url?: string | null
  title: string
  description?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  price?: number | null
  currency?: string | null
  size_m2?: number | null
  bedrooms?: number | null
  property_type?: string | null
  raw_payload?: Record<string, unknown>
  normalized_payload?: Record<string, unknown>
  dedupe_key?: string | null
  is_duplicate?: boolean
  canonical_raw_opportunity_id?: string | null
  discovered_at?: string
  created_at?: string
}

export interface OpportunityMatch {
  id: string
  organization_id: string
  brief_id: string
  raw_opportunity_id: string
  source_id: string | null
  match_score: number
  match_reasons: string[]
  mismatch_reasons: string[]
  missing_data: string[]
  suggested_next_step: string | null
  rank_score: number
  ai_analysis: Record<string, unknown> | null
  ai_investment_score: number | null
  recommendation: string | null
  is_top_match: boolean
  created_at: string
  updated_at: string
}

export interface DiscoveryAlert {
  id: string
  organization_id: string
  brief_id: string | null
  raw_opportunity_id: string | null
  match_id: string | null
  alert_type: 'new_match' | 'high_match' | 'source_failure' | 'discovery_run'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}
