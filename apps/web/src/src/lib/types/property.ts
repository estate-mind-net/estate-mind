export type PropertyType = 'apartment' | 'villa' | 'house' | 'land' | 'commercial' | 'mixed-use'
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'needs-renovation' | 'under-construction'

export interface Property {
  id: string
  title: string
  country: string
  city: string
  district: string
  propertyType: PropertyType
  askingPrice: number
  currency: string
  sizeSqm: number
  bedrooms: number
  condition: PropertyCondition
  listingUrl?: string
  description: string
  expectedRent?: number
  airbnbAssumptions?: string
  renovationNotes?: string
  legalNotes?: string
  createdAt: string
}
