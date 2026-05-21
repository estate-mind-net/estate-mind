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
