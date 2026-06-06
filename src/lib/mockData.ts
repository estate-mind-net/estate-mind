import type { Property, InvestmentAnalysis, Opportunity, DashboardMetrics } from './types'
import { normalizeOpportunityStage } from './constants/opportunityStages'

export const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Modern 2BR Apartment in City Center',
    country: 'Portugal',
    city: 'Lisbon',
    district: 'Príncipe Real',
    propertyType: 'apartment',
    askingPrice: 425000,
    currency: 'EUR',
    sizeSqm: 85,
    bedrooms: 2,
    condition: 'excellent',
    description: 'Beautifully renovated apartment in premium neighborhood with high rental demand. Walking distance to metro, restaurants, and cultural attractions.',
    expectedRent: 1800,
    airbnbAssumptions: 'High tourism area, average daily rate €120-150, 70% occupancy expected',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Coastal Villa with Sea View',
    country: 'Italy',
    city: 'Athens',
    district: 'Vouliagmeni',
    propertyType: 'villa',
    askingPrice: 890000,
    currency: 'EUR',
    sizeSqm: 220,
    bedrooms: 4,
    condition: 'good',
    description: 'Stunning villa with panoramic sea views, private pool, and garden. Premium location for luxury rentals.',
    expectedRent: 3500,
    airbnbAssumptions: 'Luxury segment, €350-450/night, 60% occupancy, strong summer demand',
    renovationNotes: 'Kitchen modernization recommended, estimated €35k',
    createdAt: '2024-01-10T14:30:00Z'
  },
  {
    id: '3',
    title: 'Investment Apartment Near University',
    country: 'Spain',
    city: 'Barcelona',
    district: 'Gràcia',
    propertyType: 'apartment',
    askingPrice: 285000,
    currency: 'EUR',
    sizeSqm: 65,
    bedrooms: 2,
    condition: 'needs-renovation',
    description: 'Great investment opportunity near major university campus. High student rental demand. Needs cosmetic renovation.',
    expectedRent: 1200,
    renovationNotes: 'Complete interior refresh needed: painting, flooring, kitchen update. Estimated €25k total.',
    legalNotes: 'Current tenant lease expires in 3 months',
    createdAt: '2024-01-08T09:15:00Z'
  },
  {
    id: '4',
    title: 'Luxury Penthouse Downtown',
    country: 'France',
    city: 'Dubrovnik',
    district: 'Old Town',
    propertyType: 'apartment',
    askingPrice: 1250000,
    currency: 'EUR',
    sizeSqm: 145,
    bedrooms: 3,
    condition: 'new',
    description: 'Brand new penthouse in UNESCO heritage zone. Unobstructed Adriatic views, terrace, premium finishes.',
    expectedRent: 4200,
    airbnbAssumptions: 'Premium luxury segment, €400-550/night, 65% occupancy, strong shoulder season',
    legalNotes: 'All permits approved, ready for short-term rental licensing',
    createdAt: '2024-01-05T16:45:00Z'
  }
]

export const mockAnalyses: InvestmentAnalysis[] = [
  {
    id: 'a1',
    propertyId: '1',
    property: mockProperties[0],
    score: {
      overall: 82,
      rentalYield: 85,
      airbnbPotential: 88,
      appreciation: 75,
      renovation: 90,
      legal: 95,
      liquidity: 80,
      energy: 78
    },
    recommendation: 'buy',
    executiveSummary: 'Strong investment opportunity in a prime Lisbon location. The property offers excellent rental yields (5.1%) and even stronger Airbnb potential (7.8% net). The Príncipe Real neighborhood is experiencing sustained appreciation, with minimal legal risks and high liquidity. The excellent condition means immediate revenue generation with minimal capital requirements.',
    rentalYieldEstimate: {
      monthly: 1800,
      annual: 21600,
      percentage: 5.1
    },
    airbnbPotential: {
      dailyRate: 135,
      occupancy: 70,
      monthlyRevenue: 2835,
      annualRevenue: 34020,
      percentage: 7.8
    },
    renovationROI: {
      estimatedCost: 8000,
      valueIncrease: 15000,
      roi: 87.5
    },
    appreciationPotential: {
      oneYear: 6.5,
      threeYear: 18.2,
      fiveYear: 32.5
    },
    risks: [
      'Lisbon rental regulation changes could impact short-term rental permits',
      'High tourism dependency for Airbnb revenue',
      'Property management costs in premium area (10-15%)'
    ],
    opportunities: [
      'Growing digital nomad market in Lisbon',
      'Premium neighborhood undergoing gentrification',
      'Potential for 10-15% value increase with minor upgrades',
      'Strong Euro-zone investor demand for liquidity'
    ],
    assumptions: [
      'Airbnb occupancy based on 2023 comparable data',
      'Long-term rental estimate conservative at market average',
      'Appreciation based on 5-year neighborhood trend analysis',
      'Property management fees estimated at 12%'
    ],
    missingData: [
      'Building common area costs (condominium fees)',
      'Exact energy efficiency certificate rating',
      'Historical occupancy data from current owner'
    ],
    analyzedAt: '2024-01-15T11:30:00Z'
  },
  {
    id: 'a2',
    propertyId: '2',
    property: mockProperties[1],
    score: {
      overall: 76,
      rentalYield: 72,
      airbnbPotential: 82,
      appreciation: 70,
      renovation: 65,
      legal: 85,
      liquidity: 68,
      energy: 60
    },
    recommendation: 'buy',
    executiveSummary: 'Premium luxury property with strong Airbnb potential in established coastal area. While long-term rental yields are moderate (4.7%), the Airbnb potential is exceptional (8.2% net). The property requires kitchen modernization, but this investment will significantly enhance marketability. Liquidity may be slower due to higher price point, targeting niche luxury segment.',
    rentalYieldEstimate: {
      monthly: 3500,
      annual: 42000,
      percentage: 4.7
    },
    airbnbPotential: {
      dailyRate: 390,
      occupancy: 60,
      monthlyRevenue: 7020,
      annualRevenue: 84240,
      percentage: 8.2
    },
    renovationROI: {
      estimatedCost: 35000,
      valueIncrease: 55000,
      roi: 57.1
    },
    appreciationPotential: {
      oneYear: 4.8,
      threeYear: 14.5,
      fiveYear: 26.0
    },
    risks: [
      'Seasonal revenue concentration (May-September)',
      'Higher maintenance costs for pool and garden',
      'Limited buyer pool at this price point',
      'Energy efficiency upgrades may be required for premium positioning'
    ],
    opportunities: [
      'Luxury villa shortage in Vouliagmeni area',
      'Athens riviera development projects increasing area value',
      'Corporate retreat and event rental potential',
      'Strong demand from international high-net-worth buyers'
    ],
    assumptions: [
      'Airbnb pricing based on luxury comp set in area',
      'Kitchen renovation increases value by 1.5x investment',
      'Occupancy conservative due to luxury positioning',
      'Annual maintenance estimated at 1.5% of property value'
    ],
    missingData: [
      'Exact pool maintenance costs',
      'Property tax assessment details',
      'Current energy certificate (likely D or E rating)'
    ],
    analyzedAt: '2024-01-10T15:45:00Z'
  }
]

export const mockOpportunities: Opportunity[] = [
  {
    id: 'o1',
    property: mockProperties[0],
    analysis: mockAnalyses[0],
    status: normalizeOpportunityStage('due-diligence'),
    tags: ['high-yield', 'airbnb', 'city-center'],
    notes: 'Scheduled viewing next Tuesday. Seller motivated, may accept 410k.',
    savedAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-16T09:30:00Z'
  },
  {
    id: 'o2',
    property: mockProperties[1],
    analysis: mockAnalyses[1],
    status: normalizeOpportunityStage('interested'),
    tags: ['luxury', 'sea-view', 'renovation'],
    notes: 'Monitor for price reduction. Kitchen reno budget confirmed.',
    savedAt: '2024-01-10T16:00:00Z',
    updatedAt: '2024-01-14T11:15:00Z'
  },
  {
    id: 'o3',
    property: mockProperties[2],
    status: normalizeOpportunityStage('lead'),
    tags: ['value-add', 'student-rental'],
    notes: 'Initial analysis pending. Requested renovation quotes.',
    savedAt: '2024-01-08T10:00:00Z',
    updatedAt: '2024-01-08T10:00:00Z'
  },
  {
    id: 'o4',
    property: mockProperties[3],
    status: normalizeOpportunityStage('negotiating'),
    tags: ['luxury', 'new-build', 'airbnb'],
    notes: 'Submitted offer at 1.18M. Awaiting response. Due diligence docs ready.',
    savedAt: '2024-01-05T17:00:00Z',
    updatedAt: '2024-01-17T14:20:00Z'
  }
]

export const mockDashboardMetrics: DashboardMetrics = {
  totalOpportunities: 12,
  averageScore: 79,
  bestYield: 8.2,
  portfolioValue: 3250000,
  activeDeals: 3,
  analyzedThisMonth: 8
}

export const mockAIInsights: import('./types').AIInsight[] = [
  {
    id: 'ai1',
    type: 'opportunity',
    priority: 'high',
    title: 'Property may be undervalued by 12%',
    description: 'Our AI model detected that the Lisbon apartment is priced 12% below market comparables in the Príncipe Real district based on recent sales data.',
    propertyId: '1',
    actionable: true,
    createdAt: '2024-01-18T09:00:00Z'
  },
  {
    id: 'ai2',
    type: 'market',
    priority: 'high',
    title: 'High Airbnb demand detected in Athens',
    description: 'Vouliagmeni area showing 40% YoY increase in Airbnb bookings. Average daily rates up 18%. Strong summer season projected.',
    propertyId: '2',
    actionable: true,
    createdAt: '2024-01-18T08:30:00Z'
  },
  {
    id: 'ai3',
    type: 'opportunity',
    priority: 'medium',
    title: 'Renovation upside identified',
    description: 'Barcelona apartment renovation could increase value by €60k with €25k investment. ROI potential: 140%. Kitchen and bathroom upgrades recommended.',
    propertyId: '3',
    actionable: true,
    createdAt: '2024-01-17T15:20:00Z'
  },
  {
    id: 'ai4',
    type: 'risk',
    priority: 'high',
    title: 'Legal/documentation review recommended',
    description: 'Property ownership history shows complex chain. Title insurance and legal due diligence strongly advised before proceeding.',
    propertyId: '3',
    actionable: true,
    createdAt: '2024-01-17T14:00:00Z'
  },
  {
    id: 'ai5',
    type: 'opportunity',
    priority: 'medium',
    title: 'Energy upgrade ROI appears attractive',
    description: 'Solar panel installation estimated €12k, projected savings €2,400/year. Payback: 5 years. Increases property value and rental appeal.',
    propertyId: '2',
    actionable: false,
    createdAt: '2024-01-16T11:45:00Z'
  },
  {
    id: 'ai6',
    type: 'market',
    priority: 'medium',
    title: 'Area appreciation trend increasing',
    description: 'Príncipe Real district appreciation accelerating: 6.5% last 12 months vs 4.2% city average. New metro extension announced for 2026.',
    propertyId: '1',
    actionable: false,
    createdAt: '2024-01-16T10:00:00Z'
  }
]

