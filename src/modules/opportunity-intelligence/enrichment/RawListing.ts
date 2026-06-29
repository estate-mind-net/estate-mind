/**
 * RawListing.ts
 * Original imported listing data. Never overwritten.
 */

export interface RawListing {
  id: string
  portal: string
  portalListingId: string | null
  listingUrl: string
  rawHtml: string | null
  rawJson: Record<string, unknown> | null
  rawImages: string[]
  importedOn: string
  searchSourceId: string | null
}