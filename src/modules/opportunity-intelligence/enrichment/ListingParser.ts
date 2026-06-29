import type { EnrichedListing } from './EnrichedListing'

export interface ListingParser {
  portalId: string
  canHandle(url: string): boolean
  parse(html: string, url: string): EnrichedListing | null
}