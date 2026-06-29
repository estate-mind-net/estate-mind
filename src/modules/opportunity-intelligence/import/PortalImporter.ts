/**
 * PortalImporter.ts
 *
 * Interface that every portal importer must implement.
 * Adding a new portal = implement this interface + register.
 */

import type { OpportunityModuleType } from '../types'

/** A single listing extracted from a portal search page. */
export interface ExtractedListing {
  title: string
  sourceUrl: string
  portal: string
  portalListingId: string | null
  city: string | null
  district: string | null
  price: number | null
  currency: string
  sizeM2: number | null
  bedrooms: number | null
  floor: number | null
  furnished: boolean | null
  parking: boolean | null
  balcony: boolean | null
  elevator: boolean | null
  petsAllowed: boolean | null
  description: string | null
  imageUrl: string | null
  agencyName: string | null
  publishedDate: string | null
  latitude: number | null
  longitude: number | null
  /** Confidence of extraction 0-100 */
  extractionConfidence: number
  /** Fields that were not found */
  missingFields: string[]
}

/** Result of fetching a single search page. */
export interface PageFetchResult {
  listings: ExtractedListing[]
  nextPageUrl: string | null
  pageCount: number
  error: string | null
}

/** Interface every portal importer implements. */
export interface PortalImporter {
  /** Portal identifier (e.g., '4zida', 'halo-oglasi') */
  portalId: string

  /** Human-readable name */
  portalName: string

  /** Module type this importer serves */
  moduleType: OpportunityModuleType

  /** Check if this importer can handle the given URL */
  canHandle(url: string): boolean

  /**
   * Fetch a search results page and extract listings.
   * Returns extracted listings and optional next page URL for pagination.
   */
  fetchSearchPage(url: string): Promise<PageFetchResult>

  /**
   * Fetch all pages of a search (handles pagination).
   * Returns all extracted listings across all pages.
   */
  fetchAllPages(url: string, maxPages?: number, maxListings?: number): Promise<PageFetchResult>
}
