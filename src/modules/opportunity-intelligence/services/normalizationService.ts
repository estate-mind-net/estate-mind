/**
 * normalizationService.ts
 *
 * Dispatches normalization to the appropriate module-specific normalizer.
 * Converts raw listing objects into NormalizedOpportunity.
 *
 * When adding a new module:
 * 1. Create src/modules/opportunity-intelligence/normalizers/<module>Normalizer.ts
 * 2. Add a case below
 */

import type { NormalizedOpportunity, OpportunityModuleType } from '../types'
import { normalizeRentListing, type RentListingInput } from '../normalizers/rentNormalizer'

export interface NormalizeInput {
  moduleType: OpportunityModuleType
  rawData: Record<string, unknown>
}

/**
 * Normalize raw data into a NormalizedOpportunity.
 * Dispatches to the correct module-specific normalizer.
 * Returns null if the module normalizer is not yet implemented.
 */
export function normalizeOpportunity(input: NormalizeInput): NormalizedOpportunity | null {
  const { moduleType, rawData } = input

  switch (moduleType) {
    case 'rent':
      return normalizeRentListing(rawData as unknown as RentListingInput)
    case 'invest':
    case 'buy':
    case 'build':
    case 'renovate':
    case 'airbnb':
    case 'due_diligence':
    case 'energy':
    case 'portfolio':
      return null
    default: {
      const _exhaustive: never = moduleType
      return _exhaustive
    }
  }
}

/**
 * Normalize a list of raw data items.
 * Skips items that fail normalization.
 */
export function normalizeOpportunities(
  moduleType: OpportunityModuleType,
  rawItems: Record<string, unknown>[],
): NormalizedOpportunity[] {
  return rawItems
    .map((raw) => normalizeOpportunity({ moduleType, rawData: raw }))
    .filter((item): item is NormalizedOpportunity => item !== null)
}
