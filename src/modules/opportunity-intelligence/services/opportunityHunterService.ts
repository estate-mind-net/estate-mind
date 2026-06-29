/**
 * opportunityHunterService.ts
 *
 * Generic orchestrator for the Opportunity Intelligence Engine.
 * Coordinates: Objective -> Source Runner -> Normalization -> Scoring -> Scored Opportunities
 *
 * Currently only Rent is implemented. Other modules return a clean error.
 */

import type {
  OpportunityModuleType,
  OpportunityObjective,
  OpportunitySource,
  ScoredOpportunity,
} from '../types'
import { IMPLEMENTED_MODULES } from '../types'
import { normalizeOpportunities } from './normalizationService'
import { scoreOpportunities } from './scoringService'

export interface RunHunterInput {
  moduleType: OpportunityModuleType
  objective: OpportunityObjective
  sources: OpportunitySource[]
  preferences: Record<string, unknown>
  /** Raw listing data already available (e.g., from external sources) */
  existingListings?: Record<string, unknown>[]
}

export interface RunHunterResult {
  success: boolean
  scoredOpportunities: ScoredOpportunity[]
  error?: string
}

/**
 * Run the full Opportunity Intelligence pipeline for a module.
 *
 * Pipeline:
 * 1. Normalize existing listings
 * 2. Score each normalized opportunity
 * 3. Return scored opportunities sorted by total score (descending)
 *
 * For unsupported modules, returns a clean error.
 */
export async function runHunter(input: RunHunterInput): Promise<RunHunterResult> {
  const { moduleType, preferences, existingListings } = input

  if (!IMPLEMENTED_MODULES.includes(moduleType)) {
    return {
      success: false,
      scoredOpportunities: [],
      error: `Opportunity Intelligence not yet implemented for module "${moduleType}". Currently implemented: ${[...IMPLEMENTED_MODULES].join(', ')}.`,
    }
  }

  // Step 1: Normalize existing listings
  const rawItems = existingListings ?? []
  const normalized = normalizeOpportunities(moduleType, rawItems)

  // Step 2: Score each normalized opportunity
  const scores = scoreOpportunities(moduleType, normalized, preferences)

  // Step 3: Combine into scored opportunities, sorted by score descending
  const scored: ScoredOpportunity[] = normalized
    .map((opp, i) => ({
      opportunity: opp,
      score: scores[i],
    }))
    .filter((item): item is ScoredOpportunity => !!item.score)
    .sort((a, b) => b.score.totalScore - a.score.totalScore)

  return {
    success: true,
    scoredOpportunities: scored,
  }
}
