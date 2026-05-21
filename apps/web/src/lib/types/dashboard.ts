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
