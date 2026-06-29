/**
 * PortalImportResult.ts
 *
 * Result types for the Portal Import Engine.
 */

import type { RecommendationLevel, OpportunityModuleType } from '../types'
import type { ExtractedListing } from './PortalImporter'

/** Summary returned after a complete import. */
export interface PortalImportResult {
  success: boolean
  portal: string
  searchUrl: string
  pagesProcessed: number
  listingsFound: number
  listingsImported: number
  duplicatesSkipped: number
  rejectedInvalid: number
  errors: string[]
  /** Score breakdown of imported opportunities */
  scoreDistribution: {
    excellentFit: number
    goodFit: number
    possibleFit: number
    weakFit: number
    reject: number
  }
  averageConfidence: number
  /** The imported listings as normalized opportunities */
  importedListingIds: string[]
  /** Import metadata for SearchSource persistence */
  metadata: ImportMetadata
}

/** Metadata persisted with the SearchSource for future monitoring. */
export interface ImportMetadata {
  portal: string
  searchUrl: string
  moduleType: OpportunityModuleType
  importedAt: string
  pagesProcessed: number
  listingsFound: number
  listingsImported: number
  duplicatesSkipped: number
  searchCriteria: Record<string, unknown>
}

/** Configuration for an import run. */
export interface ImportConfig {
  maxPages: number
  maxListings: number
  delayBetweenPagesMs: number
  delayBetweenListingsMs: number
  skipDuplicates: boolean
  /** Known listing URLs to skip (already imported) */
  knownUrls: Set<string>
}
