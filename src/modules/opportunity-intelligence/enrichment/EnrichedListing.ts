/**
 * EnrichedListing.ts
 * Structured data extracted from a listing page. All fields optional.
 */

import type { ListingEvidence } from './FieldEvidence'

export interface EnrichedListing {
  portal: string
  portalListingId: string | null
  listingUrl: string
  title: string | null
  description: string | null
  price: number | null
  currency: string
  sizeM2: number | null
  rooms: number | null
  bathrooms: number | null
  floor: number | null
  buildingFloors: number | null
  balcony: boolean | null
  terrace: boolean | null
  parking: boolean | null
  garage: boolean | null
  heating: string | null
  furnished: boolean | null
  pets: boolean | null
  elevator: boolean | null
  airConditioning: boolean | null
  orientation: string | null
  condition: string | null
  agency: string | null
  owner: string | null
  photos: string[]
  coordinates: { lat: number; lng: number } | null
  district: string | null
  city: string | null
  country: string | null
  constructionYear: number | null
  publishedDate: string | null
  updatedDate: string | null
  /** Field-level evidence with provenance */
  evidence: ListingEvidence
  /** Evidence coverage percentage */
  evidenceCoverage: number
  /** Fields that could not be extracted */
  missingFields: string[]
}