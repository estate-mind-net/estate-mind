import type { Property, InvestmentAnalysis, InvestmentScore } from './types'
import { deriveDeterministicEstimates } from './utils/deterministicEstimates'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const stableHash = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function generateMockAnalysis(property: Property): InvestmentAnalysis {
  const deterministic = deriveDeterministicEstimates({
    askingPrice: property.askingPrice,
    sizeSqm: property.sizeSqm,
    city: property.city,
    country: property.country,
    bedrooms: property.bedrooms,
    condition: property.condition,
    currency: property.currency,
    expectedRent: property.expectedRent,
  })

  const locationHash = stableHash(`${property.city.toLowerCase()}|${property.country.toLowerCase()}`)

  const baseScore = {
    overall: 0,
    rentalYield: clamp(Math.round(36 + deterministic.rentalYieldPct * 8), 42, 94),
    airbnbPotential: clamp(Math.round(28 + deterministic.airbnbYieldPct * 6.4), 45, 95),
    appreciation: clamp(Math.round(45 + deterministic.appreciationOneYearPct * 6), 50, 92),
    renovation: clamp(
      property.condition === 'needs-renovation'
        ? Math.round(55 + Math.max(deterministic.renovationRoiPct, 0) * 0.28)
        : Math.round(70 + Math.max(deterministic.renovationRoiPct, 0) * 0.12),
      48,
      92,
    ),
    legal: clamp(66 + (locationHash % 26), 60, 92),
    liquidity: clamp(58 + ((locationHash >> 5) % 30), 52, 93),
    energy: clamp(
      property.condition === 'new' ? 90 : property.condition === 'excellent' ? 82 : property.condition === 'good' ? 72 : 60,
      50,
      95,
    ),
  }

  const score: InvestmentScore = {
    ...baseScore,
    overall: Math.round((baseScore.rentalYield + baseScore.airbnbPotential + baseScore.appreciation + baseScore.renovation + baseScore.legal + baseScore.liquidity) / 6)
  }

  const monthlyRent = deterministic.rentalMonthly
  const rentalYield = deterministic.rentalYieldPct

  const airbnbDaily = deterministic.airbnbDailyRate
  const airbnbOccupancy = deterministic.airbnbOccupancyPct
  const airbnbMonthly = deterministic.airbnbMonthlyRevenue
  const airbnbYield = deterministic.airbnbYieldPct

  const renovationCost = deterministic.renovationEstimatedCost
  const valueIncrease = deterministic.renovationValueIncrease

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
      roi: deterministic.renovationRoiPct
    },
    appreciationPotential: {
      oneYear: deterministic.appreciationOneYearPct,
      threeYear: deterministic.appreciationThreeYearPct,
      fiveYear: deterministic.appreciationFiveYearPct,
    },
    risks: generateRisks(property, score),
    opportunities: generateOpportunities(property, score),
    assumptions: [
      `Deterministic fallback estimate model used because live market API data is unavailable.`,
      `Rent and yield estimates derived from asking price, size, city, country, bedrooms, condition, and currency.`,
      `Airbnb assumptions are scenario estimates using city tourism proxy factors and occupancy bands.`,
      `Renovation ROI is estimate-only and should be validated with contractor quotes.`
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
