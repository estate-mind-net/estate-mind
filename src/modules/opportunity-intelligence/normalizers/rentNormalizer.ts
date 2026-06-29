/**
 * rentNormalizer.ts
 *
 * Converts existing RentalApartment objects into NormalizedOpportunity.
 * Does NOT invent facts. Missing data is tracked and reported.
 */

import type {
  NormalizedOpportunity,
  EvidenceItem,
  MissingDataItem,
} from '../types'

/** Input shape -- matches the existing RentalApartment interface. */
export interface RentListingInput {
  id: string
  title: string
  city: string
  district: string
  address?: string
  monthlyRent: number
  currency: string
  sizeM2: number
  bedrooms: number
  furnished: boolean
  parking: boolean
  balcony: boolean
  elevator: boolean
  petsAllowed: boolean
  floor?: number
  listingUrl?: string
  notes?: string
  status?: string
  contactName?: string
  contactPhone?: string
  nextAction?: string
  score?: number
  recommendation?: string
}

/** Confidence penalty weights for missing fields */
const MISSING_PENALTIES = {
  title: 10, city: 10, district: 8, price: 10, sizeM2: 8, floor: 2, sourceUrl: 3,
} as const

export function normalizeRentListing(listing: RentListingInput): NormalizedOpportunity {
  if (!listing) return buildEmptyNormalizedOpportunity(null)

  const evidence: EvidenceItem[] = []
  const missingData: MissingDataItem[] = []
  let missingPenalty = 0

  const addConfirmed = (field: string, value: unknown, label: string) =>
    evidence.push({ field, value, source: 'confirmed', label })
  const addMissing = (field: string, label: string, impact: string, penalty: number) => {
    missingData.push({ field, label, severity: 'required', impact })
    missingPenalty += penalty
  }
  const addRecommendedMissing = (field: string, label: string, impact: string, penalty: number) => {
    missingData.push({ field, label, severity: 'recommended', impact })
    missingPenalty += penalty
  }

  // Required fields
  if (listing.title?.trim()) addConfirmed('title', listing.title, 'Title')
  else addMissing('title', 'Title', 'Cannot evaluate without title', MISSING_PENALTIES.title)

  if (listing.city?.trim()) addConfirmed('city', listing.city, 'City')
  else addMissing('city', 'City', 'Location scoring not possible', MISSING_PENALTIES.city)

  if (listing.district?.trim()) addConfirmed('district', listing.district, 'District')
  else addMissing('district', 'District', 'District matching not possible', MISSING_PENALTIES.district)

  const price = typeof listing.monthlyRent === 'number' ? listing.monthlyRent : 0
  if (price > 0) addConfirmed('price', price, 'Monthly Rent')
  else addMissing('price', 'Monthly Rent', 'Budget scoring not possible', MISSING_PENALTIES.price)

  const sizeM2 = typeof listing.sizeM2 === 'number' ? listing.sizeM2 : 0
  if (sizeM2 > 0) addConfirmed('sizeM2', sizeM2, 'Size (m2)')
  else addMissing('sizeM2', 'Size (m2)', 'Size scoring not possible', MISSING_PENALTIES.sizeM2)

  const bedrooms = typeof listing.bedrooms === 'number' ? listing.bedrooms : 0
  addConfirmed('bedrooms', bedrooms, 'Bedrooms')

  // Recommended fields
  if (listing.floor !== undefined && listing.floor !== null)
    addConfirmed('floor', listing.floor, 'Floor')
  else addRecommendedMissing('floor', 'Floor', 'Floor-based comfort assessment skipped', MISSING_PENALTIES.floor)

  addConfirmed('furnished', !!listing.furnished, 'Furnished')
  addConfirmed('parking', !!listing.parking, 'Parking')
  addConfirmed('balcony', !!listing.balcony, 'Balcony')
  addConfirmed('elevator', !!listing.elevator, 'Elevator')
  addConfirmed('petsAllowed', !!listing.petsAllowed, 'Pets Allowed')

  if (listing.listingUrl?.trim())
    evidence.push({ field: 'sourceUrl', value: listing.listingUrl, source: 'source', label: 'Listing URL' })
  else addRecommendedMissing('sourceUrl', 'Listing URL', 'Cannot verify source', MISSING_PENALTIES.sourceUrl)

  const confidenceScore = Math.max(0, Math.min(100, 100 - missingPenalty))

  return {
    id: listing.id || 'unknown',
    moduleType: 'rent',
    title: listing.title || 'Untitled',
    city: listing.city || '',
    district: listing.district || '',
    address: listing.address,
    price,
    currency: listing.currency || 'EUR',
    sizeM2,
    bedrooms,
    floor: listing.floor ?? null,
    source: 'manual',
    sourceUrl: listing.listingUrl || null,
    rawDescription: listing.notes || null,
    moduleData: {
      furnished: !!listing.furnished,
      parking: !!listing.parking,
      balcony: !!listing.balcony,
      elevator: !!listing.elevator,
      petsAllowed: !!listing.petsAllowed,
      monthlyRent: price,
    },
    evidence,
    missingData,
    confidenceScore,
    capturedAt: new Date().toISOString(),
  }
}

function buildEmptyNormalizedOpportunity(listing: RentListingInput | null): NormalizedOpportunity {
  return {
    id: listing?.id ?? 'invalid',
    moduleType: 'rent',
    title: 'Invalid Listing',
    city: '',
    district: '',
    price: 0,
    currency: 'EUR',
    sizeM2: 0,
    bedrooms: 0,
    floor: null,
    source: 'unknown',
    sourceUrl: null,
    rawDescription: null,
    moduleData: {},
    evidence: [],
    missingData: [
      { field: 'title', label: 'Title', severity: 'required', impact: 'Cannot evaluate' },
      { field: 'city', label: 'City', severity: 'required', impact: 'Location scoring not possible' },
      { field: 'district', label: 'District', severity: 'required', impact: 'District matching not possible' },
      { field: 'price', label: 'Monthly Rent', severity: 'required', impact: 'Budget scoring not possible' },
      { field: 'sizeM2', label: 'Size (m2)', severity: 'required', impact: 'Size scoring not possible' },
    ],
    confidenceScore: 0,
    capturedAt: new Date().toISOString(),
  }
}