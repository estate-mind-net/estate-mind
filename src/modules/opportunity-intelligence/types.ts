/**
 * Opportunity Intelligence Engine - Shared Types
 *
 * Reusable type system for the Opportunity Intelligence Engine.
 * Supports multiple modules: Rent, Invest, Build, Renovate, Airbnb,
 * Due Diligence, Energy, Portfolio.
 */

// -- Module Types -------------------------------------------------

/** All supported module types. Add new modules here first. */
export type OpportunityModuleType =
  | 'rent'
  | 'invest'
  | 'buy'
  | 'build'
  | 'renovate'
  | 'airbnb'
  | 'due_diligence'
  | 'energy'
  | 'portfolio'

/**
 * Modules with an implemented Opportunity Intelligence pipeline.
 * Used by generic services to guard against unsupported modules.
 * Expand this array when a new module is fully implemented.
 */
export const IMPLEMENTED_MODULES: readonly OpportunityModuleType[] = ['rent'] as const

// -- Objective ----------------------------------------------------

export interface OpportunityObjective {
  id: string
  moduleType: OpportunityModuleType
  title: string
  cities: string[]
  districts: string[]
  minPrice: number | null
  maxPrice: number | null
  currency: string | null
  minSizeM2: number | null
  maxSizeM2: number | null
  moduleData: Record<string, unknown>
  createdAt: string
}

// -- Source -------------------------------------------------------

export interface OpportunitySource {
  id: string
  moduleType: OpportunityModuleType
  sourceType: string
  label: string
  config: Record<string, unknown>
  enabled: boolean
}

// -- Hunter Run ---------------------------------------------------

export type HunterRunStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface HunterRun {
  id: string
  objectiveId: string
  sourceId: string
  moduleType: OpportunityModuleType
  status: HunterRunStatus
  startedAt: string
  completedAt: string | null
  rawResultCount: number
  error: string | null
}

// -- Raw Opportunity Result ---------------------------------------

export interface RawOpportunityResult {
  id: string
  runId: string
  moduleType: OpportunityModuleType
  sourceType: string
  rawData: Record<string, unknown>
  capturedAt: string
}

// -- Evidence & Missing Data --------------------------------------

export type EvidenceSource = 'confirmed' | 'inferred' | 'source'

export interface EvidenceItem {
  field: string
  value: unknown
  source: EvidenceSource
  label: string
}

export type MissingDataSeverity = 'required' | 'recommended' | 'optional'

export interface MissingDataItem {
  field: string
  label: string
  severity: MissingDataSeverity
  impact: string
}

// -- Normalized Opportunity ---------------------------------------

export interface NormalizedOpportunity {
  id: string
  moduleType: OpportunityModuleType
  title: string
  city: string
  district: string
  address?: string
  price: number
  currency: string
  sizeM2: number
  bedrooms: number | null
  floor: number | null
  source: string
  sourceUrl: string | null
  rawDescription: string | null
  moduleData: Record<string, unknown>
  evidence: EvidenceItem[]
  missingData: MissingDataItem[]
  confidenceScore: number
  capturedAt: string
}

// -- Score Breakdown ----------------------------------------------

export interface ScoreBreakdownItem {
  dimension: string
  label: string
  score: number
  weight: number
  weightedScore: number
  explanation: string
}

// -- Recommendation -----------------------------------------------

export type RecommendationLevel =
  | 'Excellent Fit'
  | 'Good Fit'
  | 'Possible Fit'
  | 'Weak Fit'
  | 'Reject'

// -- Opportunity Score --------------------------------------------

export interface OpportunityScore {
  opportunityId: string
  moduleType: OpportunityModuleType
  totalScore: number
  recommendation: RecommendationLevel
  scoreBreakdown: ScoreBreakdownItem[]
  evidence: EvidenceItem[]
  missingData: MissingDataItem[]
  confidenceScore: number
  scoredAt: string
}

// -- Module Config ------------------------------------------------

export interface OpportunityModuleConfig {
  moduleType: OpportunityModuleType
  label: string
  requiredFields: string[]
  recommendedFields: string[]
  optionalFields: string[]
  scoringWeights: Record<string, number>
  recommendationThresholds: {
    excellent: number
    good: number
    possible: number
    weak: number
  }
  dimensionLabels: Record<string, string>
  fieldLabels: Record<string, string>
}

// -- Search Source ------------------------------------------------

/** A persistent search source imported from a property portal. */
export interface SearchSource {
  id: string
  portal: string
  searchUrl: string
  moduleType: OpportunityModuleType
  briefId: string | null
  status: 'active' | 'paused' | 'error'
  monitoringEnabled: boolean
  lastImport: string | null
  lastUpdate: string | null
  listingCount: number
  opportunityCount: number
}

// -- Scored Opportunity (combined) --------------------------------

export interface ScoredOpportunity {
  opportunity: NormalizedOpportunity
  score: OpportunityScore
}

// -- Decision Summary (view model for My Decisions) ---------------

/** Lightweight view model for opportunity cards. Module-agnostic. */
export interface DecisionSummary {
  id: string
  moduleType: OpportunityModuleType
  title: string
  location: string
  priceLabel: string
  score: number
  recommendation: RecommendationLevel
  confidenceScore: number
  status: string
  missingDataCount: number
  riskCount: number
  sourceName: string
  workspaceUrl: string
  createdAt: string
  updatedAt: string | null
}