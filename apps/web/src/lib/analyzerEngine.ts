import type { Property, InvestmentAnalysis, InvestmentScore } from './types'

export function generateMockAnalysis(property: Property): InvestmentAnalysis {
  const pricePerSqm = property.askingPrice / property.sizeSqm
  
  const baseScore = {
    overall: 0,
    rentalYield: Math.min(95, Math.max(40, 75 + Math.random() * 20)),
    airbnbPotential: Math.min(95, Math.max(50, 80 + Math.random() * 15)),
    appreciation: Math.min(90, Math.max(50, 70 + Math.random() * 20)),
    renovation: property.condition === 'needs-renovation' ? Math.max(60, 70 + Math.random() * 20) : Math.min(95, 85 + Math.random() * 10),
    legal: Math.min(98, Math.max(70, 85 + Math.random() * 13)),
    liquidity: Math.min(90, Math.max(55, 70 + Math.random() * 20)),
    energy: Math.min(85, Math.max(50, 65 + Math.random() * 20))
  }

  const score: InvestmentScore = {
    ...baseScore,
    overall: Math.round((baseScore.rentalYield + baseScore.airbnbPotential + baseScore.appreciation + baseScore.renovation + baseScore.legal + baseScore.liquidity) / 6)
  }

  const monthlyRent = property.expectedRent || Math.round((property.askingPrice * 0.004) + (Math.random() * 200))
  const rentalYield = ((monthlyRent * 12) / property.askingPrice) * 100

  const airbnbDaily = Math.round(monthlyRent / 30 * 2.2 + Math.random() * 30)
  const airbnbOccupancy = Math.min(80, Math.max(50, 65 + Math.random() * 15))
  const airbnbMonthly = Math.round((airbnbDaily * 30 * (airbnbOccupancy / 100)))
  const airbnbYield = ((airbnbMonthly * 12) / property.askingPrice) * 100

  const renovationCost = property.condition === 'needs-renovation' 
    ? Math.round(property.askingPrice * (0.08 + Math.random() * 0.07))
    : Math.round(property.askingPrice * (0.015 + Math.random() * 0.02))
  
  const valueIncrease = Math.round(renovationCost * (1.4 + Math.random() * 0.8))

  const recommendation = score.overall >= 75 ? 'buy' : score.overall >= 60 ? 'watch' : 'avoid'

  return {
    id: `analysis-${Date.now()}`,
    propertyId: property.id,
    property,
    score,
    recommendation,
    executiveSummary: generateExecutiveSummary(property, score, rentalYield, airbnbYield, recommendation),
    rentalYieldEstimate: {
      monthly: monthlyRent,
      annual: monthlyRent * 12,
      percentage: parseFloat(rentalYield.toFixed(1))
    },
    airbnbPotential: {
      dailyRate: airbnbDaily,
      occupancy: Math.round(airbnbOccupancy),
      monthlyRevenue: airbnbMonthly,
      annualRevenue: airbnbMonthly * 12,
      percentage: parseFloat(airbnbYield.toFixed(1))
    },
    renovationROI: {
      estimatedCost: renovationCost,
      valueIncrease: valueIncrease,
      roi: parseFloat(((valueIncrease / renovationCost - 1) * 100).toFixed(1))
    },
    appreciationPotential: {
      oneYear: parseFloat((4 + Math.random() * 4).toFixed(1)),
      threeYear: parseFloat((12 + Math.random() * 10).toFixed(1)),
      fiveYear: parseFloat((22 + Math.random() * 15).toFixed(1))
    },
    risks: generateRisks(property, score),
    opportunities: generateOpportunities(property, score),
    assumptions: [
      `Rental estimates based on comparable properties in ${property.district}`,
      `Airbnb occupancy projected from ${property.city} tourism data`,
      `Appreciation based on recent market trends in ${property.country}`,
      `Property management fees estimated at 10-12%`
    ],
    missingData: [
      'Exact property tax assessment',
      'Building age and structural condition report',
      'Neighborhood development plans'
    ],
    analyzedAt: new Date().toISOString()
  }
}

function generateExecutiveSummary(property: Property, score: InvestmentScore, rentalYield: number, airbnbYield: number, recommendation: string): string {
  const pricePerSqm = property.askingPrice / property.sizeSqm
  const summaries = {
    buy: [
      `Strong investment opportunity in ${property.city}. The property offers ${rentalYield > 5 ? 'excellent' : 'solid'} rental yields (${rentalYield.toFixed(1)}%) and ${airbnbYield > 7 ? 'exceptional' : 'strong'} Airbnb potential (${airbnbYield.toFixed(1)}% net). The ${property.district} area ${score.appreciation > 75 ? 'is experiencing sustained appreciation' : 'shows steady growth'}, with ${score.legal > 85 ? 'minimal' : 'manageable'} legal risks and ${score.liquidity > 75 ? 'high' : 'moderate'} liquidity. ${property.condition === 'excellent' || property.condition === 'new' ? 'The excellent condition means immediate revenue generation with minimal capital requirements.' : 'Some renovation may be required but ROI potential is strong.'}`,
      `Promising investment in a ${score.overall > 80 ? 'premium' : 'sought-after'} ${property.city} location. With ${rentalYield.toFixed(1)}% long-term rental yield and ${airbnbYield.toFixed(1)}% Airbnb potential, this property presents multiple revenue strategies. ${score.appreciation > 70 ? 'Market fundamentals support continued value appreciation' : 'Moderate appreciation expected based on area development'}, while ${score.liquidity > 70 ? 'strong buyer demand ensures good exit options' : 'liquidity is adequate for the price point'}.`
    ],
    watch: [
      `Moderate investment opportunity requiring careful consideration. The property offers ${rentalYield.toFixed(1)}% rental yield and ${airbnbYield.toFixed(1)}% Airbnb potential. While ${score.appreciation > 65 ? 'appreciation prospects are decent' : 'appreciation may be limited'}, ${score.legal < 80 || score.renovation < 70 ? 'certain risk factors warrant additional due diligence' : 'the investment requires monitoring before commitment'}. ${property.condition === 'needs-renovation' ? 'Renovation requirements impact immediate profitability but offer value-add potential.' : 'Consider waiting for better pricing or additional market information.'}`,
      `This ${property.city} property shows potential but requires monitoring. Returns are moderate with ${rentalYield.toFixed(1)}% long-term yield. ${score.liquidity < 70 ? 'Liquidity may be limited at this price point' : 'Market activity is moderate'}. Watch for ${property.condition === 'needs-renovation' ? 'renovation cost confirmations and' : ''} price adjustments or improved market conditions before proceeding.`
    ],
    avoid: [
      `This property presents significant challenges for investors. With ${rentalYield.toFixed(1)}% rental yield and ${airbnbYield.toFixed(1)}% Airbnb potential, returns are ${rentalYield < 4 ? 'below market expectations' : 'marginal'}. ${score.legal < 75 ? 'Legal or documentation concerns add complexity' : score.liquidity < 60 ? 'Limited liquidity poses exit risks' : 'Multiple risk factors converge'}. ${score.renovation < 65 ? 'Substantial renovation requirements further impact ROI.' : 'Consider exploring alternative opportunities with better risk-adjusted returns.'}`,
      `Investment not recommended at current asking price. The ${pricePerSqm > 4000 ? 'premium pricing' : 'asking price'} relative to rental potential creates unfavorable returns. ${score.appreciation < 65 ? 'Limited appreciation prospects' : 'Market uncertainties'} combined with ${score.overall < 60 ? 'below-average overall quality metrics' : 'structural concerns'} suggest better opportunities exist in the market.`
    ]
  }

  const options = summaries[recommendation as keyof typeof summaries]
  return options[Math.floor(Math.random() * options.length)]
}

function generateRisks(property: Property, score: InvestmentScore): string[] {
  const allRisks = [
    `${property.city} rental regulations may change, impacting short-term rental permits`,
    `High tourism dependency for Airbnb revenue creates seasonal volatility`,
    `Property management costs in ${property.district} typically range 10-15%`,
    `Currency fluctuation risk for international investors`,
    `Potential for increased property taxes as area gentrifies`,
    property.condition === 'needs-renovation' ? `Renovation costs may exceed estimates without detailed inspection` : `Ongoing maintenance costs for ${property.propertyType}`,
    score.liquidity < 75 ? `Limited buyer pool at this price point may extend sale timeline` : `Market correction could impact property values`,
    `Competition from new development projects in ${property.city}`,
    score.legal < 85 ? `Documentation or permit issues require additional legal review` : `Zoning changes could restrict usage options`
  ]

  return allRisks.sort(() => 0.5 - Math.random()).slice(0, 4)
}

function generateOpportunities(property: Property, score: InvestmentScore): string[] {
  const allOpportunities = [
    `Growing digital nomad and remote worker market in ${property.city}`,
    `${property.district} neighborhood undergoing gentrification and development`,
    property.condition !== 'new' ? `Potential for 10-15% value increase with targeted upgrades` : `Premium finishes command higher rental rates`,
    `Strong international investor demand maintains liquidity`,
    `Tourism infrastructure improvements planned for ${property.city}`,
    score.airbnbPotential > 80 ? `Exceptional short-term rental market with year-round demand` : `Dual rental strategy (long-term + short-term) maximizes returns`,
    `Below-average inventory in ${property.district} supports pricing power`,
    `${property.country} economic growth driving real estate appreciation`,
    property.bedrooms >= 3 ? `Family-size units in short supply, commanding premium rents` : `High demand for compact, well-located properties`,
    `Potential for corporate rental contracts in business district`
  ]

  return allOpportunities.sort(() => 0.5 - Math.random()).slice(0, 4)
}
