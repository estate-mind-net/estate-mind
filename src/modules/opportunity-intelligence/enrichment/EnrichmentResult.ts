/**
 * EnrichmentResult.ts
 * Result types for the enrichment engine.
 */

import type { RawListing } from './RawListing'
import type { EnrichedListing } from './EnrichedListing'

export interface EnrichmentResult {
  success: boolean
  rawListing: RawListing
  enrichedListing: EnrichedListing | null
  error: string | null
  parserUsed: string
  downloadTimeMs: number
  parseTimeMs: number
}

export interface BatchEnrichmentResult {
  totalListings: number
  enrichedCount: number
  failedCount: number
  results: EnrichmentResult[]
  errors: Array<{ url: string; error: string }>
  totalTimeMs: number
  averageEvidenceCoverage: number
}

export interface EnrichmentProgress {
  phase: 'downloading' | 'enriching' | 'normalizing' | 'scoring' | 'complete'
  current: number
  total: number
  message: string
}