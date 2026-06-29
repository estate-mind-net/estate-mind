/**
 * opportunity-intelligence -- Public API
 *
 * Barrel export for the Opportunity Intelligence Engine.
 * Import from '@/modules/opportunity-intelligence' to use.
 */

// Types
export type {
  OpportunityModuleType,
  OpportunityObjective,
  OpportunitySource,
  HunterRun,
  HunterRunStatus,
  RawOpportunityResult,
  NormalizedOpportunity,
  OpportunityScore,
  EvidenceItem,
  MissingDataItem,
  ScoreBreakdownItem,
  RecommendationLevel,
  OpportunityModuleConfig,
  ScoredOpportunity,
  DecisionSummary,
  SearchSource,
  EvidenceSource,
  MissingDataSeverity,
} from './types'

// Constants
export { IMPLEMENTED_MODULES } from './types'

// Configs
export { rentModuleConfig } from './configs/rentModuleConfig'
export type { RentModulePreferences } from './configs/rentModuleConfig'
export { DEFAULT_RENT_MODULE_PREFERENCES, toRentModulePreferences } from './configs/rentModuleConfig'

// Normalizers
export { normalizeRentListing } from './normalizers/rentNormalizer'
export type { RentListingInput } from './normalizers/rentNormalizer'

// Scorers
export { scoreRentOpportunity } from './scoring/rentScorer'

// Services
export { runHunter } from './services/opportunityHunterService'
export type { RunHunterInput, RunHunterResult } from './services/opportunityHunterService'
export { normalizeOpportunity, normalizeOpportunities } from './services/normalizationService'
export { scoreOpportunity, scoreOpportunities } from './services/scoringService'
export { runSource } from './services/sourceRunnerService'

// Debug utility
export { debugOpportunity } from './debug'
export type { DebugOutput } from './debug'

// Workspace
export { DecisionWorkspace } from './workspace/DecisionWorkspace'
