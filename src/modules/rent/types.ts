export type RentalStatus = 'new' | 'shortlisted' | 'viewing_scheduled' | 'viewed' | 'favorite' | 'rejected'

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  new: 'New',
  shortlisted: 'Shortlisted',
  viewing_scheduled: 'Viewing Scheduled',
  viewed: 'Viewed',
  favorite: 'Favorite',
  rejected: 'Rejected',
}

export interface RentalApartment {
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
  status?: RentalStatus
  viewedAt?: string
  contactName?: string
  contactPhone?: string
  nextAction?: string
  score?: number
  recommendation?: RentRecommendation
}

export type RentRecommendation = 'Excellent Fit' | 'Good Fit' | 'Watch' | 'Avoid'

export interface RentPreferences {
  maxBudget: number
  preferredDistrict: string
  minimumSize: number
  furnishedRequired: boolean
  parkingRequired: boolean
  balconyPreferred: boolean
  petsRequired: boolean
  remoteWorkImportant: boolean
  quietAreaImportant: boolean
}

export const DEFAULT_RENT_PREFERENCES: RentPreferences = {
  maxBudget: 800,
  preferredDistrict: '',
  minimumSize: 40,
  furnishedRequired: false,
  parkingRequired: false,
  balconyPreferred: false,
  petsRequired: false,
  remoteWorkImportant: false,
  quietAreaImportant: false,
}