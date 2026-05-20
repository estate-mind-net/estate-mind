export type PropertyType = 'apartment' | 'villa' | 'house' | 'land' | 'commercial' | 'mixed-use'
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'needs-renovation' | 'under-construction'
export type OpportunityStatus = 'new-opportunity' | 'initial-analysis' | 'watching' | 'due-diligence' | 'negotiation' | 'acquired' | 'rejected'
export type InvestmentRecommendation = 'buy' | 'watch' | 'avoid'

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

export interface InvestmentAnalysis {
  id: string
  propertyId: string
  property: Property
  score: InvestmentScore
  recommendation: InvestmentRecommendation
  executiveSummary: string
  rentalYieldEstimate: {
    monthly: number
    annual: number
    percentage: number
  }
  airbnbPotential: {
    dailyRate: number
    occupancy: number
    monthlyRevenue: number
    annualRevenue: number
    percentage: number
  }
  renovationROI: {
    estimatedCost: number
    valueIncrease: number
    roi: number
  }
  appreciationPotential: {
    oneYear: number
    threeYear: number
    fiveYear: number
  }
  risks: string[]
  opportunities: string[]
  assumptions: string[]
  missingData: string[]
  analyzedAt: string
}

export interface Opportunity {
  id: string
  property: Property
  analysis?: InvestmentAnalysis
  status: OpportunityStatus
  tags: string[]
  notes: string
  savedAt: string
  updatedAt: string
}

export interface DashboardMetrics {
  totalOpportunities: number
  averageScore: number
  bestYield: number
  portfolioValue: number
  activeDeals: number
  analyzedThisMonth: number
}

export interface AIInsight {
  id: string
  type: 'opportunity' | 'risk' | 'market' | 'financial'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  propertyId?: string
  actionable: boolean
  createdAt: string
}

export interface LocationIntelligence {
  district: string
  city: string
  country: string
  scores: {
    appreciation: number
    rentalDemand: number
    tourismDemand: number
    liquidity: number
    infrastructureGrowth: number
    overall: number
  }
  trends: {
    priceGrowth1Y: number
    priceGrowth3Y: number
    rentalYieldTrend: string
  }
  summary: string
}

export interface Document {
  id: string
  propertyId: string
  name: string
  type: 'legal' | 'permit' | 'ownership' | 'renovation' | 'contract' | 'other'
  uploadedAt: string
  aiSummary?: string
  detectedRisks?: string[]
  status: 'pending' | 'reviewed' | 'approved' | 'flagged'
}

export interface PortfolioMetrics {
  totalValue: number
  projectedCashFlow: number
  averageYield: number
  riskExposure: {
    low: number
    medium: number
    high: number
  }
  geographicDistribution: {
    country: string
    value: number
    properties: number
  }[]
}
