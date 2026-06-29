/**
 * sourceRunnerService.ts
 *
 * Generic service that runs data sources to discover raw opportunities.
 * Currently a stub -- only Rent module has real implementation elsewhere.
 * Future modules will implement their own source runners.
 */

import type { OpportunityModuleType, RawOpportunityResult, OpportunityObjective, OpportunitySource } from '../types'
import { IMPLEMENTED_MODULES } from '../types'

export interface SourceRunnerInput {
  objective: OpportunityObjective
  source: OpportunitySource
}

export interface SourceRunnerResult {
  success: boolean
  rawResults: RawOpportunityResult[]
  error?: string
}

/**
 * Run a source to discover raw opportunities.
 * For unsupported modules, returns a clean error instead of breaking.
 */
export async function runSource(input: SourceRunnerInput): Promise<SourceRunnerResult> {
  const { objective } = input

  if (!IMPLEMENTED_MODULES.includes(objective.moduleType)) {
    return {
      success: false,
      rawResults: [],
      error: `Module "${objective.moduleType}" is not yet implemented. Currently implemented: ${[...IMPLEMENTED_MODULES].join(', ')}.`,
    }
  }

  // For rent, source running is handled by the existing Hunter pipeline.
  // This service will be wired up when the Hunter pipeline is fully refactored.
  return {
    success: true,
    rawResults: [],
  }
}
