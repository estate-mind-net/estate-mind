// Shared deal-analysis request handler used by both runtime entrypoints:
// 1) Vercel API function in api/deal-analysis.ts
// 2) Vite dev middleware in vite.config.ts for npm run dev

import { collectMarketData, getMarketDataProvidersFromConfig } from '../../services/marketData'
import type { MarketDataBundle, MarketDataPropertyContext } from '../../services/marketData'
import type { AnalysisFindingItem, AiFindingSourceType } from '../types'
import {
  calculateConfidence,
  calculateDataCompleteness,
  calculateEvidenceStrength,
  calculateSourceQuality,
} from '../../services/ai/confidenceEngine.service'
import { generateMissingEvidence } from '../../services/ai/missingEvidenceEngine.service'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_TIMEOUT_MS = 20_000

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

const confidenceLabel = (value: 'high' | 'medium' | 'low'): 'High' | 'Medium' | 'Low' => {
  if (value === 'high') return 'High'
  if (value === 'medium') return 'Medium'
  return 'Low'
}

const recommendationLabel = (value: 'buy' | 'watch' | 'avoid'): 'BUY' | 'WATCH' | 'AVOID' => {
  if (value === 'buy') return 'BUY'
  if (value === 'watch') return 'WATCH'
  return 'AVOID'
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

const findingSourceTypes: AiFindingSourceType[] = [
  'user_input',
  'listing',
  'uploaded_document',
  'portal',
  'market_api',
  'ai_inference',
]

const asFindingSourceType = (value: unknown, fallback: AiFindingSourceType): AiFindingSourceType => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim() as AiFindingSourceType
  return findingSourceTypes.includes(normalized) ? normalized : fallback
}

const confidenceFromLevel = (value: 'high' | 'medium' | 'low'): number => {
  if (value === 'high') return 85
  if (value === 'medium') return 65
  return 45
}

const asFindingConfidence = (value: unknown, fallback: number): number | null => {
  if (value === null || typeof value === 'undefined') return fallback
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return clamp(Math.round(numeric), 0, 100)
}

const findingTitle = (value: string, fallback: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (trimmed.length <= 80) return trimmed
  return `${trimmed.slice(0, 77)}...`
}

const asFindingItemArray = (
  value: unknown,
  fallbackSourceType: AiFindingSourceType,
  fallbackConfidence: number,
): AnalysisFindingItem[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item): AnalysisFindingItem | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const title = typeof row.title === 'string' && row.title.trim().length > 0
        ? row.title.trim()
        : findingTitle(String(row.value ?? row.explanation ?? ''), 'Untitled Finding')
      const normalizedValue = typeof row.value === 'string' && row.value.trim().length > 0
        ? row.value.trim()
        : title
      const explanation = typeof row.explanation === 'string' && row.explanation.trim().length > 0
        ? row.explanation.trim()
        : normalizedValue

      return {
        title,
        value: normalizedValue,
        confidence: asFindingConfidence(row.confidence, fallbackConfidence),
        sourceType: asFindingSourceType(row.sourceType, fallbackSourceType),
        explanation,
      }
    })
    .filter((item): item is AnalysisFindingItem => item !== null)
}

const stringItemsToFindings = (
  items: string[],
  fallbackSourceType: AiFindingSourceType,
  fallbackConfidence: number,
  labelPrefix: string,
): AnalysisFindingItem[] => {
  return items
    .filter((item) => item.trim().length > 0)
    .map((item, index) => ({
      title: findingTitle(item, `${labelPrefix} ${index + 1}`),
      value: item,
      confidence: fallbackConfidence,
      sourceType: fallbackSourceType,
      explanation: item,
    }))
}

const missingSeverityRank: Record<'critical' | 'important' | 'optional', number> = {
  critical: 0,
  important: 1,
  optional: 2,
}

const withConfidenceExplanation = (base: string, details: { dataCompleteness: number; evidenceStrength: number; sourceQuality: number }): string => {
  const explanation = base.trim()
  const suffix = `Confidence inputs: dataCompleteness=${details.dataCompleteness}, evidenceStrength=${details.evidenceStrength}, sourceQuality=${details.sourceQuality}.`
  return explanation.length > 0 ? `${explanation} ${suffix}` : suffix
}

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

export const isPropertyPayload = (value: unknown): value is Record<string, unknown> => {
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

const toMarketDataContext = (property: Record<string, unknown>): MarketDataPropertyContext => ({
  propertyId: String(property.id ?? `property-${Date.now()}`),
  country: asNonEmptyString(property.country, ''),
  city: asNonEmptyString(property.city, ''),
  district: asNonEmptyString(property.district, ''),
  propertyType: asNonEmptyString(property.propertyType, ''),
  askingPrice: Math.max(asNumber(property.askingPrice, 0), 0),
  currency: asNonEmptyString(property.currency, 'EUR'),
  sizeSqm: Math.max(asNumber(property.sizeSqm, 0), 0),
  bedrooms: Math.max(Math.round(asNumber(property.bedrooms, 0)), 0),
  condition: asNonEmptyString(property.condition, 'good'),
  expectedRent: Number.isFinite(Number(property.expectedRent)) ? asNumber(property.expectedRent, 0) : undefined,
})

const resolveMarketData = async (property: Record<string, unknown>): Promise<MarketDataBundle> => {
  try {
    const providers = getMarketDataProvidersFromConfig()
    return await collectMarketData(toMarketDataContext(property), providers)
  } catch (error) {
    console.warn('[deal-analysis] market data resolution failed, continuing with deterministic fallback', error)
    return {
      providerMode: 'disabled',
      propertyPrice: null,
      rental: null,
      airbnb: null,
    }
  }
}

// ---------------------------------------------------------------------------
// normalizeAnalysis — identical contract to vite.config.ts version
// ---------------------------------------------------------------------------

const normalizeAnalysis = (raw: unknown, property: Record<string, unknown>, marketData: MarketDataBundle | null = null) => {
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
  const marketRental = marketData?.rental
  const marketAirbnb = marketData?.airbnb
  const marketPrice = marketData?.propertyPrice
  const marketDataAvailable = Boolean(marketRental || marketAirbnb || marketPrice)
  const expectedRent = asNumber(property.expectedRent, deterministic.rentalMonthly)
  const hasExpectedRentInput = Number.isFinite(Number(property.expectedRent))

  const rentalYieldEstimate = asMetricObject(payload.rentalYieldEstimate)
  const airbnbPotential = asMetricObject(payload.airbnbPotential)
  const renovationROI = asMetricObject(payload.renovationROI)
  const appreciationPotential = asMetricObject(payload.appreciationPotential)

  const baseConfidence = confidenceFromLevel(asConfidence(payload.confidenceLevel, 'medium'))
  const factsFromPayload = asFindingItemArray(payload.facts, 'user_input', baseConfidence)
  const estimatesFromPayload = asFindingItemArray(payload.estimates, 'ai_inference', baseConfidence)
  const assumptionsFromPayload = asFindingItemArray(payload.assumptions, 'ai_inference', baseConfidence)
  const risksFromPayload = asFindingItemArray(payload.risks, 'ai_inference', baseConfidence)
  const opportunitiesFromPayload = asFindingItemArray(payload.opportunities, 'ai_inference', baseConfidence)
  const missingEvidenceFromPayload = asFindingItemArray(payload.missingEvidence, 'ai_inference', 35)

  const factsProvidedLegacy = asStringArray(payload.factsProvided, ['Property details provided by the user were used as baseline facts.'])
  const marketFacts = marketDataAvailable
    ? [
        `Market data provider mode: ${marketData?.providerMode ?? 'unknown'}.`,
        marketPrice ? `Provider property valuation: ${Math.round(marketPrice.estimatedValue)} (${marketPrice.source}, ${marketPrice.confidence} confidence).` : '',
        marketRental ? `Provider long-term rent estimate: ${Math.round(marketRental.monthlyRent)} monthly (${marketRental.source}, ${marketRental.confidence} confidence).` : '',
        marketAirbnb ? `Provider short-term estimate: ${Math.round(marketAirbnb.dailyRate)} ADR at ${Math.round(marketAirbnb.occupancyPct)}% occupancy (${marketAirbnb.source}, ${marketAirbnb.confidence} confidence).` : '',
      ].filter(Boolean)
    : []
  const assumptionsUsedLegacy = asStringArray(
    payload.assumptionsUsed ?? payload.assumptions,
    ['Market and cost assumptions are conservative and should be validated with local comps.'],
  )
  const estimatesLegacy = asStringArray(
    payload.legacyEstimates ?? payload.estimates,
    ['Yield, ROI, and appreciation outputs are estimates and not guaranteed outcomes.'],
  )
  const missingInformationLegacy = asStringArray(
    payload.missingInformation ?? payload.missingData,
    ['Recent comparable transactions, legal due diligence, and exact renovation scope are missing.'],
  )
  const keyRisksLegacy = asStringArray(payload.keyRisks ?? payload.risks, ['Unexpected costs, regulatory changes, and market softening can reduce returns.'])
  const keyUpsidesLegacy = asStringArray(payload.keyUpsides ?? payload.opportunities, ['Strong micro-location demand and disciplined renovation can improve outcomes.'])
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
  const rentalPctFromMarket = asNumber(marketRental?.yieldPct, NaN)
  const rentalPctResolved = Number.isFinite(rentalPctFromMetric)
    ? rentalPctFromMetric
    : Number.isFinite(rentalPctFromLegacy)
      ? rentalPctFromLegacy
      : Number.isFinite(rentalPctFromMarket) ? rentalPctFromMarket : deterministic.rentalYieldPct

  const rentalMonthly = asNumber(
    rentalYieldEstimate.monthly,
    asNumber(marketRental?.monthlyRent, rentalPctResolved > 0 ? (askingPrice * (rentalPctResolved / 100)) / 12 : expectedRent),
  )
  const rentalMonthlyResolved = rentalMonthly > 0 ? rentalMonthly : deterministic.rentalMonthly
  const rentalAnnual = asNumber(rentalYieldEstimate.annual, asNumber(marketRental?.annualRent, rentalMonthlyResolved * 12))
  const rentalAnnualResolved = rentalAnnual > 0 ? rentalAnnual : deterministic.rentalAnnual
  const rentalPctRaw = Number.isFinite(rentalPctResolved) && rentalPctResolved > 0
    ? rentalPctResolved
    : asNumber(rentalYieldEstimate.percentage, (rentalAnnualResolved / Math.max(askingPrice, 1)) * 100)
  const rentalPct = rentalPctRaw > 0 ? rentalPctRaw : deterministic.rentalYieldPct

  const airbnbPctFromMetric = asLooseNumber(airbnbYieldValue, NaN)
  const airbnbPctFromLegacy = asNumber(airbnbPotential.percentage, NaN)
  const airbnbPctFromMarket = asNumber(marketAirbnb?.yieldPct, NaN)
  const airbnbPctResolved = Number.isFinite(airbnbPctFromMetric)
    ? airbnbPctFromMetric
    : Number.isFinite(airbnbPctFromLegacy)
      ? airbnbPctFromLegacy
      : Number.isFinite(airbnbPctFromMarket) ? airbnbPctFromMarket : deterministic.airbnbYieldPct

  const airbnbMonthly = asNumber(
    airbnbPotential.monthlyRevenue,
    asNumber(marketAirbnb?.monthlyRevenue, airbnbPctResolved > 0 ? (askingPrice * (airbnbPctResolved / 100)) / 12 : rentalMonthlyResolved * 1.2),
  )
  const airbnbMonthlyResolved = airbnbMonthly > 0 ? airbnbMonthly : deterministic.airbnbMonthly
  const airbnbAnnual = asNumber(airbnbPotential.annualRevenue, asNumber(marketAirbnb?.annualRevenue, airbnbMonthlyResolved * 12))
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

  const usedDeterministicRentalFallback =
    !Number.isFinite(rentalPctFromMetric) &&
    !Number.isFinite(rentalPctFromLegacy) &&
    !Number.isFinite(rentalPctFromMarket)
  const usedDeterministicAirbnbFallback =
    !Number.isFinite(airbnbPctFromMetric) &&
    !Number.isFinite(airbnbPctFromLegacy) &&
    !Number.isFinite(airbnbPctFromMarket)
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
  const marketDataNote = marketDataAvailable
    ? `Provider-supplied market data (${marketData?.providerMode ?? 'unknown'}) was used when available before deterministic fallback.`
    : ''

  const assumptionsInput = assumptionsFromPayload.length > 0
    ? assumptionsFromPayload.map((item) => item.value)
    : assumptionsUsedLegacy
  const estimatesInput = estimatesFromPayload.length > 0
    ? estimatesFromPayload.map((item) => item.value)
    : estimatesLegacy
  const missingInformationInput = missingEvidenceFromPayload.length > 0
    ? missingEvidenceFromPayload.map((item) => item.value)
    : missingInformationLegacy
  const keyRisksInput = risksFromPayload.length > 0
    ? risksFromPayload.map((item) => item.value)
    : keyRisksLegacy
  const keyUpsidesInput = opportunitiesFromPayload.length > 0
    ? opportunitiesFromPayload.map((item) => item.value)
    : keyUpsidesLegacy

  const assumptionsWithMarketData = marketDataNote && !assumptionsInput.some((item) => item.toLowerCase().includes('provider-supplied market data'))
    ? [marketDataNote, ...assumptionsInput]
    : assumptionsInput
  const assumptionsFinal = usedDeterministicEstimate && !assumptionsWithMarketData.some((item) => item.toLowerCase().includes('deterministic estimate model'))
    ? [deterministicEstimateNote, ...assumptionsWithMarketData]
    : assumptionsWithMarketData
  const estimatesFinal = usedDeterministicEstimate && !estimatesInput.some((item) => item.toLowerCase().includes('deterministic'))
    ? ['Rent, ROI, rental yield, and Airbnb yield are deterministic estimates, not guaranteed outcomes.', ...estimatesInput]
    : estimatesInput
  const missingInformationFinal = usedDeterministicEstimate && !missingInformationInput.some((item) => item.toLowerCase().includes('market comparable api'))
    ? ['Live market comparable API data feed is unavailable.', ...missingInformationInput]
    : missingInformationInput
  const executiveSummaryFinal = usedDeterministicEstimate
    ? `${investmentThesis} ${fallbackDisclosure}`
    : investmentThesis

  const recommendation = payload.recommendation
  const safeRecommendation = recommendation === 'buy' || recommendation === 'watch' || recommendation === 'avoid'
    ? recommendation
    : 'watch'

  const derivedConfidence = missingInformationFinal.length > 0 ? 'low' : 'high'
  const confidenceLevel = asConfidence(payload.confidenceLevel, derivedConfidence)

  const rawOverallScore = clamp(Math.round(asNumber(score.overall, 65)), 0, 100)

  const metricConfidence = (provided: unknown, value: string | number | null): 'high' | 'medium' | 'low' => {
    if (value === null) return 'low'
    const normalized = asConfidence(provided, confidenceLevel)
    if (missingInformationFinal.length > 0 && normalized === 'high') return 'medium'
    return normalized
  }

  const severeQualityEvidence = hasExplicitNearZeroRationale([
    executiveSummaryFinal,
    ...keyRisksInput,
    asNonEmptyString(payload.executiveSummary, ''),
    asNonEmptyString(rentalYieldMetric.explanation, ''),
    asNonEmptyString(airbnbYieldMetric.explanation, ''),
    asNonEmptyString(renovationROIMetric.explanation, ''),
    asNonEmptyString(appreciationMetric.explanation, ''),
    asNonEmptyString(liquidityMetric.explanation, ''),
    asNonEmptyString(legalRiskMetric.explanation, ''),
  ])

  const overallScore = rawOverallScore === 0 && confidenceLevel === 'low' && hasSignificantMissingInformation(missingInformationFinal) && !severeQualityEvidence
    ? 60
    : rawOverallScore

  const appreciation1y = Number(asNumber(appreciationPotential.oneYear, 3).toFixed(1))
  const appreciation3y = Number(asNumber(appreciationPotential.threeYear, 10).toFixed(1))
  const appreciation5y = Number(asNumber(appreciationPotential.fiveYear, 18).toFixed(1))

  const estimatedRoi = Number((rentalPct + appreciation1y).toFixed(2))
  const projectedValue5Year = Math.round(askingPrice * (1 + appreciation5y / 100))
  const estimatedMonthlyCashflow = Math.round(rentalMonthlyResolved * 0.65)

  const buildScenario = (rentMultiplier: number, roiDelta: number, appreciationMultiplier: number) => {
    const monthlyRent = Math.round(rentalMonthlyResolved * rentMultiplier)
    const rentalYield = Number(((monthlyRent * 12 / Math.max(askingPrice, 1)) * 100).toFixed(1))
    const annualRoi = Number((rentalYield + Math.max(appreciation1y + roiDelta, 0)).toFixed(1))
    const projectedRoi5Year = Number((annualRoi * 5 * 0.78).toFixed(1))
    const projectedPropertyValue5Year = Math.round(askingPrice * (1 + Math.max(appreciation5y * appreciationMultiplier, 0) / 100))

    return {
      monthlyRent,
      rentalYield,
      annualROI: annualRoi,
      projectedRoi5Year,
      projectedPropertyValue5Year,
    }
  }

  const scenarios = {
    conservative: buildScenario(0.9, -1.2, 0.75),
    base: buildScenario(1, 0, 1),
    optimistic: buildScenario(1.12, 1.4, 1.25),
  }

  const reasonsToInvest = keyUpsidesInput.slice(0, 3)
  const thesisRisks = keyRisksInput.slice(0, 3)
  const upsideOpportunities = keyUpsidesInput.slice(0, 3)

  const totalExpectedEvidence = Math.max(6, missingInformationFinal.length + 6)
  const metricEvidenceSignals = [
    rentalYieldValue,
    airbnbYieldValue,
    renovationROIValue,
    appreciationValue,
    liquidityValue,
    legalRiskValue,
  ].filter((item) => item !== null).length

  const factsFinal = factsFromPayload.length > 0
    ? factsFromPayload
    : [
        ...stringItemsToFindings(marketFacts, 'market_api', confidenceFromLevel('high'), 'Market Fact'),
        ...stringItemsToFindings(factsProvidedLegacy, 'user_input', confidenceFromLevel('high'), 'Fact'),
      ]
  const estimatesFindingsFinal = estimatesFromPayload.length > 0
    ? estimatesFromPayload
    : stringItemsToFindings(estimatesFinal, 'ai_inference', confidenceFromLevel('medium'), 'Estimate')
  const assumptionsFindingsFinal = assumptionsFromPayload.length > 0
    ? assumptionsFromPayload
    : stringItemsToFindings(assumptionsFinal, 'ai_inference', confidenceFromLevel('medium'), 'Assumption')
  const risksFindingsFinal = risksFromPayload.length > 0
    ? risksFromPayload
    : stringItemsToFindings(keyRisksInput, 'ai_inference', confidenceFromLevel('medium'), 'Risk')
  const opportunitiesFindingsFinal = opportunitiesFromPayload.length > 0
    ? opportunitiesFromPayload
    : stringItemsToFindings(keyUpsidesInput, 'ai_inference', confidenceFromLevel('medium'), 'Opportunity')
  const missingEvidenceFindingsFinal = missingEvidenceFromPayload.length > 0
    ? missingEvidenceFromPayload
    : stringItemsToFindings(missingInformationFinal, 'ai_inference', confidenceFromLevel('low'), 'Missing Evidence')

  const generatedMissingEvidence = generateMissingEvidence({
    hasMarketRentalData: Boolean(marketRental),
    hasMarketTransactionData: Boolean(marketPrice),
    hasLegalEvidence: factsFinal.some((item) => /(title|ownership|permit|zoning|legal|compliance)/i.test(`${item.title} ${item.value} ${item.explanation}`)),
    hasEnergyEvidence: factsFinal.some((item) => /(energy certificate|energy class|epc|efficiency)/i.test(`${item.title} ${item.value} ${item.explanation}`)),
    needsRenovation: normalizedText(property.condition).includes('needs-renovation'),
  })

  const mergedMissingEvidence = [...missingEvidenceFindingsFinal]
  for (const item of generatedMissingEvidence) {
    const exists = mergedMissingEvidence.some((existing) =>
      existing.title.toLowerCase() === item.title.toLowerCase() ||
      existing.value.toLowerCase() === item.value.toLowerCase(),
    )
    if (!exists) {
      mergedMissingEvidence.push(item)
    }
  }

  const missingEvidenceSorted = mergedMissingEvidence.sort((a, b) => {
    const left = missingSeverityRank[a.severity ?? 'optional']
    const right = missingSeverityRank[b.severity ?? 'optional']
    return left - right
  })

  const estimatesWithConfidence = estimatesFindingsFinal.map((estimate) => {
    const confidenceDetails = calculateConfidence({
      dataCompleteness: calculateDataCompleteness({
        missingEvidenceCount: missingInformationFinal.length,
        totalExpectedEvidence,
      }),
      evidenceStrength: calculateEvidenceStrength({
        evidenceSignals: metricEvidenceSignals,
        totalEvidenceSignals: 6,
        hasMarketData: marketDataAvailable,
      }),
      sourceQuality: calculateSourceQuality({ sourceTypes: [estimate.sourceType] }),
    })

    return {
      ...estimate,
      confidence: confidenceDetails.confidence,
      explanation: withConfidenceExplanation(estimate.explanation, confidenceDetails),
    }
  })

  const recommendationConfidence = calculateConfidence({
    dataCompleteness: calculateDataCompleteness({
      missingEvidenceCount: missingInformationFinal.length,
      totalExpectedEvidence,
    }),
    evidenceStrength: calculateEvidenceStrength({
      evidenceSignals: Math.min(6, metricEvidenceSignals + (thesisRisks.length > 0 ? 1 : 0) + (upsideOpportunities.length > 0 ? 1 : 0)),
      totalEvidenceSignals: 8,
      hasMarketData: marketDataAvailable,
    }),
    sourceQuality: calculateSourceQuality({
      sourceTypes: [
        ...factsFinal.map((item) => item.sourceType),
        ...estimatesWithConfidence.map((item) => item.sourceType),
      ],
    }),
  })

  const recommendationFinding: AnalysisFindingItem = {
    title: 'Investment recommendation confidence',
    value: `Recommendation ${recommendationLabel(safeRecommendation)} with score ${overallScore}/100.`,
    confidence: recommendationConfidence.confidence,
    sourceType: 'ai_inference',
    explanation: withConfidenceExplanation(executiveSummaryFinal, recommendationConfidence),
  }

  const factsWithRecommendation = [recommendationFinding, ...factsFinal]

  const dueDiligenceChecklist = [
    'Collect and validate at least three recent rental comps within the same micro-market.',
    'Run legal review on title, zoning, short-term rental permissions, and lien status.',
    'Obtain contractor-backed renovation estimate with scope, timeline, and contingency buffer.',
    'Model full tax and fee stack including acquisition taxes, annual property taxes, and transaction costs.',
    'Commission building condition survey covering structure, MEP systems, and deferred maintenance.',
    'Stress-test financing assumptions for rates, leverage, debt-service coverage, and refinancing risk.',
  ]

  const executiveDecision = {
    recommendation: recommendationLabel(safeRecommendation),
    score: overallScore,
    confidence: confidenceLabel(
      recommendationConfidence.confidence >= 80
        ? 'high'
        : recommendationConfidence.confidence >= 60 ? 'medium' : 'low',
    ),
    summary: executiveSummaryFinal,
  }

  const financialModel = {
    askingPrice: Math.round(askingPrice),
    estimatedMonthlyRent: Math.round(rentalMonthlyResolved),
    annualRent: Math.round(rentalAnnualResolved),
    grossRentalYield: Number(rentalPct.toFixed(1)),
    airbnbYield: Number(airbnbPct.toFixed(1)),
    estimatedROI: estimatedRoi,
    projectedValue5Year,
    estimatedMonthlyCashflow,
  }

  const dataQuality = {
    usedLiveMarketData: marketDataAvailable,
    usedDeterministicFallback: usedDeterministicEstimate,
    confidenceLevel: confidenceLabel(confidenceLevel),
    missingData: missingInformationFinal,
  }

  const reportText = [
    `Executive Decision: ${executiveDecision.recommendation} | Score ${executiveDecision.score}/100 | Confidence ${executiveDecision.confidence}`,
    executiveDecision.summary,
    `Financial Model: Asking ${financialModel.askingPrice}, Monthly Rent ${financialModel.estimatedMonthlyRent}, Annual Rent ${financialModel.annualRent}, Gross Yield ${financialModel.grossRentalYield}%, Airbnb Yield ${financialModel.airbnbYield}%, ROI ${financialModel.estimatedROI}%, 5Y Value ${financialModel.projectedValue5Year}, Monthly Cashflow ${financialModel.estimatedMonthlyCashflow}.`,
    `Scenarios: Conservative rent ${scenarios.conservative.monthlyRent} / yield ${scenarios.conservative.rentalYield}% / annual ROI ${scenarios.conservative.annualROI}% / 5Y ROI ${scenarios.conservative.projectedRoi5Year}% / 5Y value ${scenarios.conservative.projectedPropertyValue5Year}; Base rent ${scenarios.base.monthlyRent} / yield ${scenarios.base.rentalYield}% / annual ROI ${scenarios.base.annualROI}% / 5Y ROI ${scenarios.base.projectedRoi5Year}% / 5Y value ${scenarios.base.projectedPropertyValue5Year}; Optimistic rent ${scenarios.optimistic.monthlyRent} / yield ${scenarios.optimistic.rentalYield}% / annual ROI ${scenarios.optimistic.annualROI}% / 5Y ROI ${scenarios.optimistic.projectedRoi5Year}% / 5Y value ${scenarios.optimistic.projectedPropertyValue5Year}.`,
    `Investment Thesis - Reasons: ${reasonsToInvest.join('; ')}. Risks: ${thesisRisks.join('; ')}. Upside: ${upsideOpportunities.join('; ')}.`,
    `Due Diligence Checklist: ${dueDiligenceChecklist.join(' | ')}`,
    `Data Quality: liveMarketData=${dataQuality.usedLiveMarketData}, deterministicFallback=${dataQuality.usedDeterministicFallback}, confidence=${dataQuality.confidenceLevel}, missingData=${dataQuality.missingData.join('; ')}`,
  ].join('\n\n')

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
    executiveDecision,
    financialModel,
    scenarioAnalysis: scenarios,
    investmentThesisDetail: {
      reasonsToInvest,
      risks: thesisRisks,
      upsideOpportunities,
    },
    dueDiligenceChecklist,
    dataQuality,
    reportText,
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
      oneYear: appreciation1y,
      threeYear: appreciation3y,
      fiveYear: appreciation5y,
    },
    risks: keyRisksInput,
    opportunities: keyUpsidesInput,
    assumptions: assumptionsFinal,
    missingData: missingInformationFinal,
    findings: {
      facts: factsWithRecommendation,
      estimates: estimatesWithConfidence,
      assumptions: assumptionsFindingsFinal,
      risks: risksFindingsFinal,
      opportunities: opportunitiesFindingsFinal,
      missingEvidence: missingEvidenceSorted,
    },
    recommendationConfidence,
    factsProvided: factsWithRecommendation.map((item) => item.value),
    assumptionsUsed: assumptionsFinal,
    estimates: estimatesFinal,
    confidenceLevel,
    investmentThesis: executiveSummaryFinal,
    keyRisks: keyRisksInput,
    keyUpsides: keyUpsidesInput,
    missingInformation: missingInformationFinal,
    additionalDataToImproveAccuracy,
    scoringRules,
    fallbackDisclosure: usedDeterministicEstimate ? fallbackDisclosure : null,
    investorAnalysis: {
      factsProvided: factsWithRecommendation.map((item) => item.value),
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
      keyRisks: keyRisksInput,
      keyUpsides: keyUpsidesInput,
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

const buildPrompt = (property: Record<string, unknown>, marketData: MarketDataBundle | null): string =>
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
    'Market data JSON (provider-supplied, may be null):',
    JSON.stringify(marketData),
    '',
    'Output schema:',
    JSON.stringify({
      executiveDecision: {
        recommendation: 'WATCH',
        score: 64,
        confidence: 'Medium',
        summary: 'string',
      },
      financialModel: {
        askingPrice: 320000,
        estimatedMonthlyRent: 1450,
        annualRent: 17400,
        grossRentalYield: 5.4,
        airbnbYield: 7.1,
        estimatedROI: 8.2,
        projectedValue5Year: 389000,
        estimatedMonthlyCashflow: 940,
      },
      scenarioAnalysis: {
        conservative: {
          monthlyRent: 1300,
          rentalYield: 4.9,
          annualROI: 6.8,
          projectedRoi5Year: 25.2,
          projectedPropertyValue5Year: 360000,
        },
        base: {
          monthlyRent: 1450,
          rentalYield: 5.4,
          annualROI: 8.2,
          projectedRoi5Year: 31.4,
          projectedPropertyValue5Year: 389000,
        },
        optimistic: {
          monthlyRent: 1620,
          rentalYield: 6.1,
          annualROI: 9.7,
          projectedRoi5Year: 37.9,
          projectedPropertyValue5Year: 416000,
        },
      },
      investmentThesisDetail: {
        reasonsToInvest: ['string', 'string', 'string'],
        risks: ['string', 'string', 'string'],
        upsideOpportunities: ['string', 'string', 'string'],
      },
      dueDiligenceChecklist: ['string', 'string', 'string', 'string', 'string', 'string'],
      dataQuality: {
        usedLiveMarketData: true,
        usedDeterministicFallback: false,
        confidenceLevel: 'Medium',
        missingData: ['string'],
      },
      reportText: 'string',
      facts: [{
        title: 'Property asking price',
        value: 'Asking price is 320000 EUR based on listing.',
        confidence: 95,
        sourceType: 'listing',
        explanation: 'Listing includes clear asking price and currency.',
      }],
      estimates: [{
        title: 'Long-term gross rental yield',
        value: 'Estimated long-term gross rental yield is 5.4%.',
        confidence: 68,
        sourceType: 'ai_inference',
        explanation: 'Yield derived from comparable assumptions and property context.',
      }],
      assumptions: [{
        title: 'Occupancy stabilization',
        value: 'Assumes occupancy stabilizes near local historical median.',
        confidence: 60,
        sourceType: 'ai_inference',
        explanation: 'Assumption required due to limited direct occupancy evidence.',
      }],
      risks: [{
        title: 'Regulatory changes',
        value: 'Short-term rental regulation changes may reduce net yield.',
        confidence: 71,
        sourceType: 'ai_inference',
        explanation: 'Regulatory uncertainty can materially impact STR strategy.',
      }],
      opportunities: [{
        title: 'Value-add renovation upside',
        value: 'Targeted renovation may improve rent and resale value.',
        confidence: 66,
        sourceType: 'ai_inference',
        explanation: 'Condition profile suggests potential for margin expansion after upgrades.',
      }],
      missingEvidence: [{
        title: 'Verified local rental comps',
        value: 'At least three recent nearby rental comps are still missing.',
        confidence: 35,
        sourceType: 'ai_inference',
        explanation: 'Without direct comps, confidence in rent/yield remains moderate to low.',
      }],
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
      missingData: ['string'],
    }),
  ].join('\n')

// ---------------------------------------------------------------------------
// Vercel Serverless Function handler
// ---------------------------------------------------------------------------

export async function handleDealAnalysisRequest(request: Request): Promise<Response> {
  const sendJson = (status: number, payload: unknown): Response =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  let recoveryProperty: Record<string, unknown> | null = null
  let recoveryMarketData: MarketDataBundle | null = null

  const buildFallbackResponse = (
    property: Record<string, unknown>,
    marketData: MarketDataBundle | null,
    reason: string,
    extraMeta: Record<string, unknown> = {},
  ): Response => {
    console.warn('[AI API] fallback used', { reason })
    const fallbackAnalysis = normalizeAnalysis({}, property, marketData)

    return sendJson(200, {
      ok: true,
      analysis: fallbackAnalysis,
      meta: {
        fallback: true,
        reason,
        marketDataProviderMode: marketData?.providerMode ?? 'disabled',
        marketDataAvailable: Boolean(marketData?.propertyPrice || marketData?.rental || marketData?.airbnb),
        ...extraMeta,
      },
    })
  }

  try {
    if (request.method !== 'POST') {
      return sendJson(405, { ok: false, error: 'Method not allowed.' })
    }

    const apiKey = process.env.OPENAI_API_KEY ?? ''
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    const debug = process.env.DEBUG_OPENAI_RESPONSE === '1'

    console.log('[AI API] request received')
    console.log('[AI API] key exists', !!apiKey)

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return sendJson(400, { ok: false, error: 'Invalid JSON body.' })
    }

    const property = body.property
    if (!isPropertyPayload(property)) {
      return sendJson(400, { ok: false, error: 'Invalid property payload.' })
    }

    recoveryProperty = property
    const marketData = await resolveMarketData(property)
    recoveryMarketData = marketData

    if (!apiKey) {
      return buildFallbackResponse(property, marketData, 'missing-api-key')
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const controller = new AbortController()

    try {
      timeoutId = setTimeout(() => {
        controller.abort()
      }, OPENAI_TIMEOUT_MS)

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
            { role: 'user', content: buildPrompt(property, marketData) },
          ],
        }),
        signal: controller.signal,
      })

      if (!openAIResponse.ok) {
        const providerBody = await openAIResponse.text()
        console.error('OpenAI request failed', {
          status: openAIResponse.status,
          statusText: openAIResponse.statusText,
          providerMessage: providerBody.slice(0, 500),
        })
        return buildFallbackResponse(property, marketData, 'provider-error')
      }

      const rawResponseText = await openAIResponse.text()
      if (debug) console.debug('[deal-analysis] raw OpenAI response', rawResponseText)

      let openAIPayload: { choices?: Array<{ message?: { content?: string } }> }
      try {
        openAIPayload = JSON.parse(rawResponseText) as { choices?: Array<{ message?: { content?: string } }> }
      } catch (parseError) {
        console.error('[deal-analysis] provider JSON parse failed', parseError)
        return buildFallbackResponse(property, marketData, 'provider-json-parse-failed')
      }
      if (debug) console.debug('[deal-analysis] parsed OpenAI response JSON', openAIPayload)

      const content = openAIPayload.choices?.[0]?.message?.content
      if (!content) {
        console.error('OpenAI response did not contain content')
        return buildFallbackResponse(property, marketData, 'provider-empty-content')
      }

      let structured: unknown
      try {
        structured = JSON.parse(content)
      } catch (contentParseError) {
        console.error('[deal-analysis] content JSON parse failed', contentParseError)
        return buildFallbackResponse(property, marketData, 'content-json-parse-failed')
      }
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

      const analysis = normalizeAnalysis(structured, property, marketData)
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        return buildFallbackResponse(property, marketData, 'timeout')
      }

      console.error('[AI API] fatal fallback recovery', error)
      return buildFallbackResponse(property, marketData, 'fatal-error', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  } catch (error) {
    console.error('[AI API] fatal fallback recovery', error)
    if (recoveryProperty) {
      return buildFallbackResponse(recoveryProperty, recoveryMarketData, 'fatal-handler-recovery', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return sendJson(500, { ok: false, error: 'Fatal handler error before property validation.' })
  }
}
