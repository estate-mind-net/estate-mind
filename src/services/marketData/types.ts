export interface MarketDataPropertyContext {
  propertyId: string
  country: string
  city: string
  district: string
  propertyType: string
  askingPrice: number
  currency: string
  sizeSqm: number
  bedrooms: number
  condition: string
  expectedRent?: number
}

export interface PropertyPricePoint {
  estimatedValue: number
  pricePerSqm: number
  confidence: 'high' | 'medium' | 'low'
  source: string
  asOf: string
}

export interface RentalPoint {
  monthlyRent: number
  annualRent: number
  yieldPct: number
  confidence: 'high' | 'medium' | 'low'
  source: string
  asOf: string
}

export interface AirbnbPoint {
  dailyRate: number
  occupancyPct: number
  monthlyRevenue: number
  annualRevenue: number
  yieldPct: number
  confidence: 'high' | 'medium' | 'low'
  source: string
  asOf: string
}

export interface PropertyPriceProvider {
  readonly name: string
  getPropertyPrice(context: MarketDataPropertyContext): Promise<PropertyPricePoint | null>
}

export interface RentalProvider {
  readonly name: string
  getRentalData(context: MarketDataPropertyContext): Promise<RentalPoint | null>
}

export interface AirbnbProvider {
  readonly name: string
  getAirbnbData(context: MarketDataPropertyContext): Promise<AirbnbPoint | null>
}

export interface MarketDataBundle {
  providerMode: string
  propertyPrice: PropertyPricePoint | null
  rental: RentalPoint | null
  airbnb: AirbnbPoint | null
}
