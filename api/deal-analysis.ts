// Vercel Serverless Function — POST /api/deal-analysis
// Local testing: use `vercel dev` (not `vite` alone).
// Frontend calls: fetch('/api/deal-analysis', { method: 'POST', body: JSON.stringify({ property }) })

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const asNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const asLooseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/)
    if (match) {
      const num = Number(match[0])
      if (Number.isFinite(num)) return num
    }
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback
  const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return normalized.length > 0 ? normalized : fallback
}

const asNonEmptyString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback

const asConfidence = (value: unknown, fallback: 'high' | 'medium' | 'low' = 'low'): 'high' | 'medium' | 'low' => {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return fallback
}

const asMetricValue = (value: unknown): string | number | null => {
  if (value === null || typeof value === 'undefined') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(2))
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return null
}

const asMetricObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const normalizedText = (value: unknown) => String(value ?? '').trim().toLowerCase()

// ---------------------------------------------------------------------------
// Deterministic fallback metric calculation
// ---------------------------------------------------------------------------

const deterministicFactorFromText = (text: string, min: number, max: number): number => {
  if (!text) return (min + max) / 2
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000003
  }
  const unit = hash / 1000003
  return min + (max - min) * unit
}

const countryMarketFactor = (country: string): number => {
  const key = normalizedText(country)
  const known: Record<string, number> = {
    portugal: 1.03, spain: 1.02, greece: 0.99, italy: 1.01,
    france: 1.06, germany: 1.04, 'united kingdom': 1.08, uk: 1.08,
    ireland: 1.07, netherlands: 1.08, belgium: 1.04, switzerland: 1.12,
    austria: 1.05, usa: 1.09, 'united states': 1.09, canada: 1.07,
    uae: 1.1, 'united arab emirates': 1.1, australia: 1.08, japan: 1.03,
    singapore: 1.11,
  }
  return known[key] ?? deterministicFactorFromText(key, 0.94, 1.08)
}

const currencyFactor = (currency: string): number => {
  const key = normalizedText(currency)
  const known: Record<string, number> = {
    eur: 1, usd: 1.06, gbp: 1.09, chf: 1.11, cad: 1.03,
    aud: 1.03, sgd: 1.08, aed: 1.07, jpy: 0.98, brl: 0.9,
    mxn: 0.91, inr: 0.88,
  }
  return known[key] ?? deterministicFactorFromText(key, 0.9, 1.06)
}

const conditionFactors = (condition: string) => {
  const key = normalizedText(condition)
  if (key === 'new') return { rentMultiplier: 1.08, occupancyDelta: 4, renovationCostPct: 0.012, valueGainPct: 0.035 }
  if (key === 'excellent') return { rentMultiplier: 1.05, occupancyDelta: 3, renovationCostPct: 0.018, valueGainPct: 0.045 }
  if (key === 'good') return { rentMultiplier: 1, occupancyDelta: 0, renovationCostPct: 0.03, valueGainPct: 0.06 }
  if (key === 'under-construction') return { rentMultiplier: 0.9, occupancyDelta: -5, renovationCostPct: 0.07, valueGainPct: 0.12 }
  return { rentMultiplier: 0.84, occupancyDelta: -8, renovationCostPct: 0.11, valueGainPct: 0.165 }
}

const buildDeterministicFallbackMetrics = (property: Record<string, unknown>) => {
  const askingPrice = Math.max(asNumber(property.askingPrice, 0), 1)
  const sizeSqm = Math.max(asNumber(property.sizeSqm, 0), 20)
  const bedrooms = Math.max(Math.round(asNumber(property.bedrooms, 1)), 0)
  const city = normalizedText(property.city)
  const country = normalizedText(property.country)
  const currency = normalizedText(property.currency)
  const condition = normalizedText(property.condition)

  const locationFactor = deterministicFactorFromText(`${city}|${country}`, 0.94, 1.12)
  const tourismFactor = deterministicFactorFromText(`${city}|tourism`, 0.9, 1.2)
  const countryFactor = countryMarketFactor(country)
  const fxFactor = currencyFactor(currency)
  const conditionFactor = conditionFactors(condition)

  const bedroomFactor = clamp(0.92 + Math.min(bedrooms, 5) * 0.055, 0.9, 1.2)
  const sizeFactor = clamp(1 + (80 - sizeSqm) / 420, 0.84, 1.14)

  const rentalYieldPct = clamp(
    4.35 * locationFactor * countryFactor * fxFactor * conditionFactor.rentMultiplier * bedroomFactor * sizeFactor,
    2.6, 9.8,
  )
  const rentalMonthly = (askingPrice * (rentalYieldPct / 100)) / 12
  const rentalAnnual = rentalMonthly * 12

  const occupancy = clamp(
    Math.round(58 + (tourismFactor - 1) * 45 + conditionFactor.occupancyDelta + Math.min(bedrooms, 4) * 1.8),
    45, 86,
  )
  const airbnbDaily = Math.max(
    25,
    Math.round((rentalMonthly / 30) * (1.95 + (tourismFactor - 1) * 0.9 + (Math.min(bedrooms, 4) - 1) * 0.08)),
  )
  const airbnbMonthly = airbnbDaily * 30 * (occupancy / 100)
  const airbnbAnnual = airbnbMonthly * 12
  const airbnbYieldPct = clamp((airbnbAnnual / askingPrice) * 100, 3.2, 14.5)

  const estimatedCost = Math.round(askingPrice * conditionFactor.renovationCostPct)
  const valueIncrease = Math.round(askingPrice * conditionFactor.valueGainPct)
  const roi = estimatedCost > 0 ? ((valueIncrease - estimatedCost) / estimatedCost) * 100 : 0

  return {
    rentalYieldPct, rentalMonthly, rentalAnnual,
    occupancy, airbnbDaily, airbnbMonthly, airbnbAnnual, airbnbYieldPct,
    estimatedCost, valueIncrease, renovationRoiPct: roi,
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const hasSignificantMissingInformation = (items: string[]): boolean => {
  if (items.length >= 2) return true
  return items.some((item) =>
    /ownership|title|cadastral|debt|lawyer|permit|zoning|inspection|quote|occupancy|adr|comparable|rent|sales|legal/i.test(item),
  )
}

const hasExplicitNearZeroRationale = (details: string[]): boolean => {
  const severeNegativeSignal =
    /condemned|uninhabitable|structural|illegal|fraud|litigation|hazardous|demolition|negative cash flow|cannot rent|no demand|severe vacancy|environmental contamination|bankruptcy/i
  return details.some((detail) => severeNegativeSignal.test(detail))
}

const isPropertyPayload = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    typeof p.title === 'string' &&
    typeof p.country === 'string' &&
    typeof p.city === 'string' &&
    typeof p.district === 'string' &&
    typeof p.propertyType === 'string' &&
    Number.isFinite(Number(p.askingPrice)) &&
    typeof p.currency === 'string' &&
    Number.isFinite(Number(p.sizeSqm)) &&
    Number.isFinite(Number(p.bedrooms)) &&
    typeof p.condition === 'string' &&
    typeof p.description === 'string'
  )
}

// ---------------------------------------------------------------------------
// normalizeAnalysis — identical contract to vite.config.ts version
// ---------------------------------------------------------------------------

const normalizeAnalysis = (raw: unknown, property: Record<string, unknown>) => {
  const payload = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const score = payload.score && typeof payload.score === 'object'
    ? (payload.score as Record<string, unknown>)
    : {}

  const investmentThesis = asNonEmptyString(
    payload.investmentThesis ?? payload.executiveSummary,
    'Conservative opportunity with limited certainty; validate assumptions with local market evidence before committing capital.',
  )

  const askingPrice = asNumber(property.askingPrice, 1)
  const deterministic = buildDeterministicFallbackMetrics(property)
  const expectedRent = asNumber(property.expectedRent, deterministic.rentalMonthly)
  const hasExpectedRentInput = Number.isFinite(Number(property.expectedRent))

  const rentalYieldEstimate = asMetricObject(payload.rentalYieldEstimate)
  const airbnbPotential = asMetricObject(payload.airbnbPotential)
  const renovationROI = asMetricObject(payload.renovationROI)
  const appreciationPotential = asMetricObject(payload.appreciationPotential)

  const factsProvided = asStringArray(payload.factsProvided, ['Property details provided by the user were used as baseline facts.'])
  const assumptionsUsed = asStringArray(
    payload.assumptionsUsed ?? payload.assumptions,
    ['Market and cost assumptions are conservative and should be validated with local comps.'],
  )
  const estimates = asStringArray(
    payload.estimates,
    ['Yield, ROI, and appreciation outputs are estimates and not guaranteed outcomes.'],
  )
  const missingInformation = asStringArray(
    payload.missingInformation ?? payload.missingData,
    ['Recent comparable transactions, legal due diligence, and exact renovation scope are missing.'],
  )
  const keyRisks = asStringArray(payload.keyRisks ?? payload.risks, ['Unexpected costs, regulatory changes, and market softening can reduce returns.'])
  const keyUpsides = asStringArray(payload.keyUpsides ?? payload.opportunities, ['Strong micro-location demand and disciplined renovation can improve outcomes.'])
  const additionalDataToImproveAccuracy = asStringArray(
    payload.additionalDataToImproveAccuracy ?? payload.additionalDataForAccuracy,
    ['Verified comparable rents/sales, contractor quotes, tax and legal records, and occupancy history.'],
  )
  const scoringRules = asStringArray(
    payload.scoringRules,
    ['Use conservative assumptions, lower confidence when inputs are missing, and avoid precise values without evidence.'],
  )

  const metricPayload = asMetricObject(payload.metrics)
  const rentalYieldMetric = asMetricObject(metricPayload.rentalYield)
  const airbnbYieldMetric = asMetricObject(metricPayload.airbnbYield)
  const renovationROIMetric = asMetricObject(metricPayload.renovationROI)
  const appreciationMetric = asMetricObject(metricPayload.appreciationPotential)
  const liquidityMetric = asMetricObject(metricPayload.liquidity)
  const legalRiskMetric = asMetricObject(metricPayload.legalRisk)

  const rentalYieldValue = asMetricValue(rentalYieldMetric.value ?? (hasExpectedRentInput ? rentalYieldEstimate.percentage : null))
  const airbnbYieldValue = asMetricValue(airbnbYieldMetric.value ?? null)
  const renovationROIValue = asMetricValue(renovationROIMetric.value ?? null)
  const appreciationValue = asMetricValue(appreciationMetric.value ?? null)
  const liquidityValue = asMetricValue(liquidityMetric.value ?? null)
  const legalRiskValue = asMetricValue(legalRiskMetric.value ?? null)

  const rentalPctFromMetric = asLooseNumber(rentalYieldValue, NaN)
  const rentalPctFromLegacy = asNumber(rentalYieldEstimate.percentage, NaN)
  const rentalPctResolved = Number.isFinite(rentalPctFromMetric)
    ? rentalPctFromMetric
    : Number.isFinite(rentalPctFromLegacy) ? rentalPctFromLegacy : deterministic.rentalYieldPct

  const rentalMonthly = asNumber(
    rentalYieldEstimate.monthly,
    rentalPctResolved > 0 ? (askingPrice * (rentalPctResolved / 100)) / 12 : expectedRent,
  )
  const rentalMonthlyResolved = rentalMonthly > 0 ? rentalMonthly : deterministic.rentalMonthly
  const rentalAnnual = asNumber(rentalYieldEstimate.annual, rentalMonthlyResolved * 12)
  const rentalAnnualResolved = rentalAnnual > 0 ? rentalAnnual : deterministic.rentalAnnual
  const rentalPctRaw = Number.isFinite(rentalPctResolved) && rentalPctResolved > 0
    ? rentalPctResolved
    : asNumber(rentalYieldEstimate.percentage, (rentalAnnualResolved / Math.max(askingPrice, 1)) * 100)
  const rentalPct = rentalPctRaw > 0 ? rentalPctRaw : deterministic.rentalYieldPct

  const airbnbPctFromMetric = asLooseNumber(airbnbYieldValue, NaN)
  const airbnbPctFromLegacy = asNumber(airbnbPotential.percentage, NaN)
  const airbnbPctResolved = Number.isFinite(airbnbPctFromMetric)
    ? airbnbPctFromMetric
    : Number.isFinite(airbnbPctFromLegacy) ? airbnbPctFromLegacy : deterministic.airbnbYieldPct

  const airbnbMonthly = asNumber(
    airbnbPotential.monthlyRevenue,
    airbnbPctResolved > 0 ? (askingPrice * (airbnbPctResolved / 100)) / 12 : rentalMonthlyResolved * 1.2,
  )
  const airbnbMonthlyResolved = airbnbMonthly > 0 ? airbnbMonthly : deterministic.airbnbMonthly
  const airbnbAnnual = asNumber(airbnbPotential.annualRevenue, airbnbMonthlyResolved * 12)
  const airbnbAnnualResolved = airbnbAnnual > 0 ? airbnbAnnual : deterministic.airbnbAnnual
  const airbnbPctRaw = Number.isFinite(airbnbPctResolved) && airbnbPctResolved > 0
    ? airbnbPctResolved
    : asNumber(airbnbPotential.percentage, (airbnbAnnualResolved / Math.max(askingPrice, 1)) * 100)
  const airbnbPct = airbnbPctRaw > 0 ? airbnbPctRaw : deterministic.airbnbYieldPct

  const renovationCostRaw = asNumber(renovationROI.estimatedCost, deterministic.estimatedCost)
  const renovationValueRaw = asNumber(renovationROI.valueIncrease, deterministic.valueIncrease)
  const renovationRoiRaw = asNumber(renovationROI.roi, deterministic.renovationRoiPct)
  const renovationCostResolved = renovationCostRaw > 0 ? renovationCostRaw : deterministic.estimatedCost
  const renovationValueResolved = renovationValueRaw > 0 ? renovationValueRaw : deterministic.valueIncrease
  const renovationRoiResolved = Number.isFinite(renovationRoiRaw) && renovationRoiRaw !== 0
    ? renovationRoiRaw
    : deterministic.renovationRoiPct

  const usedDeterministicRentalFallback = !Number.isFinite(rentalPctFromMetric) && !Number.isFinite(rentalPctFromLegacy)
  const usedDeterministicAirbnbFallback = !Number.isFinite(airbnbPctFromMetric) && !Number.isFinite(airbnbPctFromLegacy)
  const usedDeterministicRenovationFallback =
    Number(renovationROI.estimatedCost) <= 0 ||
    Number(renovationROI.valueIncrease) <= 0 ||
    Number(renovationROI.roi) === 0 ||
    !Number.isFinite(Number(renovationROI.estimatedCost)) ||
    !Number.isFinite(Number(renovationROI.valueIncrease)) ||
    !Number.isFinite(Number(renovationROI.roi))
  const usedDeterministicEstimate =
    usedDeterministicRentalFallback || usedDeterministicAirbnbFallback ||
    usedDeterministicRenovationFallback || rentalPct <= 0 || airbnbPct <= 0

  const fallbackDisclosure = 'Deterministic fallback estimate model applied because live market comparable API data is unavailable.'
  const deterministicEstimateNote = 'Deterministic estimate model applied using asking price, size, city, country, bedrooms, condition, and currency because live market comparable API data is unavailable.'

  const assumptionsFinal = usedDeterministicEstimate && !assumptionsUsed.some((item) => item.toLowerCase().includes('deterministic estimate model'))
    ? [deterministicEstimateNote, ...assumptionsUsed]
    : assumptionsUsed
  const estimatesFinal = usedDeterministicEstimate && !estimates.some((item) => item.toLowerCase().includes('deterministic'))
    ? ['Rent, ROI, rental yield, and Airbnb yield are deterministic estimates, not guaranteed outcomes.', ...estimates]
    : estimates
  const missingInformationFinal = usedDeterministicEstimate && !missingInformation.some((item) => item.toLowerCase().includes('market comparable api'))
    ? ['Live market comparable API data feed is unavailable.', ...missingInformation]
    : missingInformation
  const executiveSummaryFinal = usedDeterministicEstimate
    ? `${investmentThesis} ${fallbackDisclosure}`
    : investmentThesis

  const recommendation = payload.recommendation
  const safeRecommendation = recommendation === 'buy' || recommendation === 'watch' || recommendation === 'avoid'
    ? recommendation
    : 'watch'

  const derivedConfidence = missingInformation.length > 0 ? 'low' : 'high'
  const confidenceLevel = asConfidence(payload.confidenceLevel, derivedConfidence)

  const rawOverallScore = clamp(Math.round(asNumber(score.overall, 65)), 0, 100)

  const metricConfidence = (provided: unknown, value: string | number | null): 'high' | 'medium' | 'low' => {
    if (value === null) return 'low'
    const normalized = asConfidence(provided, confidenceLevel)
    if (missingInformation.length > 0 && normalized === 'high') return 'medium'
    return normalized
  }

  const severeQualityEvidence = hasExplicitNearZeroRationale([
    executiveSummaryFinal,
    ...keyRisks,
    asNonEmptyString(payload.executiveSummary, ''),
    asNonEmptyString(rentalYieldMetric.explanation, ''),
    asNonEmptyString(airbnbYieldMetric.explanation, ''),
    asNonEmptyString(renovationROIMetric.explanation, ''),
    asNonEmptyString(appreciationMetric.explanation, ''),
    asNonEmptyString(liquidityMetric.explanation, ''),
    asNonEmptyString(legalRiskMetric.explanation, ''),
  ])

  const overallScore = rawOverallScore === 0 && confidenceLevel === 'low' && hasSignificantMissingInformation(missingInformation) && !severeQualityEvidence
    ? 60
    : rawOverallScore

  return {
    id: `analysis-${Date.now()}`,
    propertyId: String(property.id ?? `property-${Date.now()}`),
    property,
    score: {
      overall: overallScore,
      rentalYield: clamp(Math.round(asNumber(score.rentalYield, 65)), 0, 100),
      airbnbPotential: clamp(Math.round(asNumber(score.airbnbPotential, 65)), 0, 100),
      appreciation: clamp(Math.round(asNumber(score.appreciation, 65)), 0, 100),
      renovation: clamp(Math.round(asNumber(score.renovation, 65)), 0, 100),
      legal: clamp(Math.round(asNumber(score.legal, 65)), 0, 100),
      liquidity: clamp(Math.round(asNumber(score.liquidity, 65)), 0, 100),
      energy: clamp(Math.round(asNumber(score.energy, 65)), 0, 100),
    },
    recommendation: safeRecommendation,
    executiveSummary: executiveSummaryFinal,
    rentalYieldEstimate: {
      monthly: Math.round(rentalMonthlyResolved),
      annual: Math.round(rentalAnnualResolved),
      percentage: Number(rentalPct.toFixed(1)),
    },
    airbnbPotential: {
      dailyRate: Math.round(asNumber(airbnbPotential.dailyRate, deterministic.airbnbDaily)),
      occupancy: clamp(Math.round(asNumber(airbnbPotential.occupancy, deterministic.occupancy)), 0, 100),
      monthlyRevenue: Math.round(airbnbMonthlyResolved),
      annualRevenue: Math.round(airbnbAnnualResolved),
      percentage: Number(airbnbPct.toFixed(1)),
    },
    renovationROI: {
      estimatedCost: Math.round(renovationCostResolved),
      valueIncrease: Math.round(renovationValueResolved),
      roi: Number(renovationRoiResolved.toFixed(1)),
    },
    appreciationPotential: {
      oneYear: Number(asNumber(appreciationPotential.oneYear, 3).toFixed(1)),
      threeYear: Number(asNumber(appreciationPotential.threeYear, 10).toFixed(1)),
      fiveYear: Number(asNumber(appreciationPotential.fiveYear, 18).toFixed(1)),
    },
    risks: keyRisks,
    opportunities: keyUpsides,
    assumptions: assumptionsFinal,
    missingData: missingInformationFinal,
    factsProvided,
    assumptionsUsed: assumptionsFinal,
    estimates: estimatesFinal,
    confidenceLevel,
    investmentThesis: executiveSummaryFinal,
    keyRisks,
    keyUpsides,
    missingInformation: missingInformationFinal,
    additionalDataToImproveAccuracy,
    scoringRules,
    fallbackDisclosure: usedDeterministicEstimate ? fallbackDisclosure : null,
    investorAnalysis: {
      factsProvided,
      assumptionsUsed: assumptionsFinal,
      estimates: estimatesFinal,
      confidenceLevel,
      metrics: {
        rentalYield: {
          value: rentalYieldValue,
          confidence: metricConfidence(rentalYieldMetric.confidence, rentalYieldValue),
          explanation: asNonEmptyString(rentalYieldMetric.explanation, 'Rental yield is estimated from provided rent and price context, adjusted conservatively when evidence is limited.'),
        },
        airbnbYield: {
          value: airbnbYieldValue,
          confidence: metricConfidence(airbnbYieldMetric.confidence, airbnbYieldValue),
          explanation: asNonEmptyString(airbnbYieldMetric.explanation, 'Airbnb yield depends on local regulation, seasonality, and occupancy assumptions.'),
        },
        renovationROI: {
          value: renovationROIValue,
          confidence: metricConfidence(renovationROIMetric.confidence, renovationROIValue),
          explanation: asNonEmptyString(renovationROIMetric.explanation, 'Renovation ROI is scenario-based and should be validated with contractor quotes and scope certainty.'),
        },
        appreciationPotential: {
          value: appreciationValue,
          confidence: metricConfidence(appreciationMetric.confidence, appreciationValue),
          explanation: asNonEmptyString(appreciationMetric.explanation, 'Appreciation potential is uncertain and tied to macro conditions and neighborhood dynamics.'),
        },
        liquidity: {
          value: liquidityValue,
          confidence: metricConfidence(liquidityMetric.confidence, liquidityValue),
          explanation: asNonEmptyString(liquidityMetric.explanation, 'Liquidity depends on demand depth, price band, and time-to-sell evidence in the micro-market.'),
        },
        legalRisk: {
          value: legalRiskValue,
          confidence: metricConfidence(legalRiskMetric.confidence, legalRiskValue),
          explanation: asNonEmptyString(legalRiskMetric.explanation, 'Legal risk should be confirmed by title, zoning, licensing, and compliance review.'),
        },
      },
      investmentThesis: executiveSummaryFinal,
      keyRisks,
      keyUpsides,
      missingInformation: missingInformationFinal,
      additionalDataToImproveAccuracy,
      scoringRules,
      fallbackDisclosure: usedDeterministicEstimate ? fallbackDisclosure : null,
    },
    analyzedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// OpenAI prompt builder
// ---------------------------------------------------------------------------

const buildPrompt = (property: Record<string, unknown>): string =>
  [
    'You are an investor-grade, conservative real estate investment analyst.',
    'Return valid JSON only. No markdown.',
    'Do not include secrets, API keys, or credentials.',
    'Use only fields requested in the output schema.',
    'Never present assumptions as facts.',
    'Separate facts, assumptions, and estimates clearly.',
    'If data is missing, reduce confidence and avoid invented precise values.',
    'When uncertain, use ranges or null instead of exact numbers.',
    'Never use 0 to represent uncertainty, missing information, or lack of confidence.',
    'Score must always represent estimated investment attractiveness on a 0-100 scale.',
    'If information is incomplete, estimate a score using available facts and assumptions, lower confidence, explain missing information, and explain assumptions used.',
    'Use score = 0 only when the investment itself appears extremely poor.',
    '',
    'Property JSON:',
    JSON.stringify(property),
    '',
    'Output schema:',
    JSON.stringify({
      factsProvided: ['string'],
      assumptionsUsed: ['string'],
      estimates: ['string'],
      confidenceLevel: 'medium',
      metrics: {
        rentalYield: { value: null, confidence: 'medium', explanation: 'string' },
        airbnbYield: { value: null, confidence: 'medium', explanation: 'string' },
        renovationROI: { value: null, confidence: 'medium', explanation: 'string' },
        appreciationPotential: { value: null, confidence: 'medium', explanation: 'string' },
        liquidity: { value: null, confidence: 'medium', explanation: 'string' },
        legalRisk: { value: null, confidence: 'medium', explanation: 'string' },
      },
      investmentThesis: 'string',
      keyRisks: ['string'],
      keyUpsides: ['string'],
      missingInformation: ['string'],
      additionalDataToImproveAccuracy: ['string'],
      scoringRules: ['string'],
      score: {
        overall: 60, rentalYield: 60, airbnbPotential: 60,
        appreciation: 60, renovation: 60, legal: 60, liquidity: 60, energy: 60,
      },
      recommendation: 'watch',
      executiveSummary: 'string',
      rentalYieldEstimate: { monthly: 1400, annual: 16800, percentage: 4.8 },
      airbnbPotential: { dailyRate: 110, occupancy: 64, monthlyRevenue: 2112, annualRevenue: 25344, percentage: 7.2 },
      renovationROI: { estimatedCost: 18000, valueIncrease: 31000, roi: 72.2 },
      appreciationPotential: { oneYear: 2.5, threeYear: 8.2, fiveYear: 14.1 },
      risks: ['string'],
      opportunities: ['string'],
      assumptions: ['string'],
      missingData: ['string'],
    }),
  ].join('\n')

// ---------------------------------------------------------------------------
// Vercel Serverless Function handler
// ---------------------------------------------------------------------------

export default async function handler(request: Request): Promise<Response> {
  const sendJson = (status: number, payload: unknown): Response =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  if (request.method !== 'POST') {
    return sendJson(405, { ok: false, error: 'Method not allowed.' })
  }

  const apiKey = process.env.OPENAI_API_KEY ?? ''
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  const debug = process.env.DEBUG_OPENAI_RESPONSE === '1'

  console.log('[AI] Request received')
  console.log('[AI] OpenAI key exists:', !!apiKey)
  console.log('[AI] Model:', model)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return sendJson(400, { ok: false, error: 'Invalid JSON body.' })
  }

  const property = body.property
  console.log('[AI] Property:', property)

  if (!isPropertyPayload(property)) {
    return sendJson(400, { ok: false, error: 'Invalid property payload.' })
  }

  if (!apiKey) {
    console.log('[AI] No API key — returning deterministic fallback')
    const fallbackAnalysis = normalizeAnalysis({}, property)
    return sendJson(200, { ok: true, analysis: fallbackAnalysis })
  }

  try {
    const openAIResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You generate conservative real-estate investment analysis as strict JSON.' },
          { role: 'user', content: buildPrompt(property) },
        ],
      }),
    })

    if (!openAIResponse.ok) {
      const providerBody = await openAIResponse.text()
      console.error('OpenAI request failed', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        providerMessage: providerBody.slice(0, 500),
      })
      return sendJson(502, { ok: false, error: 'AI provider request failed.' })
    }

    const rawResponseText = await openAIResponse.text()
    if (debug) console.debug('[deal-analysis] raw OpenAI response', rawResponseText)

    const openAIPayload = JSON.parse(rawResponseText) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    if (debug) console.debug('[deal-analysis] parsed OpenAI response JSON', openAIPayload)

    const content = openAIPayload.choices?.[0]?.message?.content
    if (!content) {
      console.error('OpenAI response did not contain content')
      return sendJson(502, { ok: false, error: 'AI provider returned empty content.' })
    }

    const structured = JSON.parse(content)
    if (debug) {
      const s = structured && typeof structured === 'object' ? (structured as Record<string, unknown>) : {}
      console.debug('[deal-analysis] raw score fields', {
        overallScore: s.overallScore,
        score: s.score,
        investmentScore: s.investmentScore,
        metrics: s.metrics,
        confidence: s.confidence,
        confidenceLevel: s.confidenceLevel,
      })
    }

    const analysis = normalizeAnalysis(structured, property)
    if (debug) {
      console.debug('[deal-analysis] normalized score fields', {
        score: analysis.score,
        overallScore: (analysis as Record<string, unknown>).overallScore,
        metrics: (analysis as Record<string, unknown>).metrics,
        confidenceLevel: (analysis as Record<string, unknown>).confidenceLevel,
      })
      console.debug('[deal-analysis] normalized analysis', analysis)
    }

    return sendJson(200, { ok: true, analysis })
  } catch (error) {
    console.error('[AI ANALYSIS FATAL]', error)
    return sendJson(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
