/**
 * scoringService.ts
 *
 * Dispatches scoring to the appropriate module-specific scorer.
 * Returns a complete OpportunityScore for each normalized opportunity.
 *
 * When adding a new module:
 * 1. Create src/modules/opportunity-intelligence/scoring/<module>Scorer.ts
 * 2. Add a case below
 */

import type { NormalizedOpportunity, OpportunityScore, OpportunityModuleType } from '../types'
import { scoreRentOpportunity } from '../scoring/rentScorer'
import type { RentModulePreferences } from '../configs/rentModuleConfig'

export interface ScoreInput {
  moduleType: OpportunityModuleType
  opportunity: NormalizedOpportunity
  preferences: Record<string, unknown>
}

export interface ScoreResult {
  success: boolean
  score?: OpportunityScore
  error?: string
}

/**
 * Score a single normalized opportunity.
 * Dispatches to the correct module-specific scorer.
 */
export function scoreOpportunity(input: ScoreInput): ScoreResult {
  const { moduleType, opportunity, preferences } = input

  switch (moduleType) {
    case 'rent': {
      const score = scoreRentOpportunity(opportunity, preferences as unknown as RentModulePreferences)
      return { success: true, score }
    }
    case 'invest':
    case 'buy':
    case 'build':
    case 'renovate':
    case 'airbnb':
    case 'due_diligence':
    case 'energy':
    case 'portfolio':
      return {
        success: false,
        error: `Scoring not yet implemented for module "${moduleType}".`,
      }
    default: {
      const _exhaustive: never = moduleType
      return { success: false, error: `Unknown module type: ${_exhaustive}` }
    }
  }
}

/**
 * Score a list of normalized opportunities.
 * Returns only successfully scored items.
 */
export function scoreOpportunities(
  moduleType: OpportunityModuleType,
  opportunities: NormalizedOpportunity[],
  preferences: Record<string, unknown>,
): OpportunityScore[] {
  return opportunities
    .map((opp) => scoreOpportunity({ moduleType, opportunity: opp, preferences }))
    .filter((r): r is { success: true; score: OpportunityScore } => r.success && !!r.score)
    .map((r) => r.score)
}
