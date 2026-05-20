import type { Property } from './property'

export type InvestmentRecommendation = 'buy' | 'watch' | 'avoid'

export interface InvestmentScore {
  overall: number
  rentalYield: number
  airbnbPotential: number
  appreciation: number
  renovation: number
  legal: number
  liquidity: number
  energy: number
}

export interface RentalYieldEstimate {
  monthly: number
  annual: number
  percentage: number
}

export interface AirbnbPotential {
  dailyRate: number
  occupancy: number
  monthlyRevenue: number
  annualRevenue: number
  percentage: number
}

export interface RenovationROI {
  estimatedCost: number
  valueIncrease: number
  roi: number
}

export interface AppreciationPotential {
  oneYear: number
  threeYear: number
  fiveYear: number
}

export interface InvestmentAnalysis {
  id: string
  propertyId: string
  property: Property
  score: InvestmentScore
  recommendation: InvestmentRecommendation
  executiveSummary: string
  rentalYieldEstimate: RentalYieldEstimate
  airbnbPotential: AirbnbPotential
  renovationROI: RenovationROI
  appreciationPotential: AppreciationPotential
  risks: string[]
  opportunities: string[]
  assumptions: string[]
  missingData: string[]
  analyzedAt: string
}
