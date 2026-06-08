type JsonResponder = { status: (code: number) => { json: (payload: unknown) => void } }

type NodeLikeRequest = {
  method?: string
  body?: unknown
}

type OpenAIChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_TIMEOUT_MS = 12_500

const asNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback
  const normalized = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
  return normalized.length > 0 ? normalized : fallback
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const stableHash = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
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

const parseBody = (body: unknown): Record<string, unknown> | null => {
  if (!body) return null
  if (typeof body === 'object') return body as Record<string, unknown>
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
      return null
    } catch {
      return null
    }
  }
  return null
}

const normalizeRecommendation = (value: unknown): 'buy' | 'watch' | 'avoid' => {
  const normalized = asString(value, '').toLowerCase()
  if (normalized === 'buy' || normalized === 'watch' || normalized === 'avoid') return normalized
  return 'watch'
}

const normalizeUpperRecommendation = (value: unknown): 'BUY' | 'WATCH' | 'AVOID' => {
  const normalized = normalizeRecommendation(value)
  if (normalized === 'buy') return 'BUY'
  if (normalized === 'avoid') return 'AVOID'
  return 'WATCH'
}

const normalizeScore = (value: unknown, fallback: number): number => {
  const num = asNumber(value, fallback)
  if (!Number.isFinite(num) || num < 0) return fallback
  return clamp(Math.round(num), 0, 100)
}

const normalizePercent = (value: unknown, fallback: number): number => {
  const num = asNumber(value, fallback)
  if (!Number.isFinite(num) || num < 0) return fallback
  return Number(num.toFixed(1))
}

const normalizePositiveAmount = (value: unknown, fallback: number): number => {
  const num = asNumber(value, fallback)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.round(num)
}

const buildDeterministicFallback = (property: Record<string, unknown>) => {
  const askingPrice = Math.max(asNumber(property.askingPrice, 1), 1)
  const bedrooms = clamp(Math.round(asNumber(property.bedrooms, 1)), 0, 8)
  const locationKey = `${property.country}|${property.city}|${property.district}|${property.propertyType}`.toLowerCase()
  const h = stableHash(locationKey)

  const rentalYield = Number(clamp(4.2 + (h % 170) / 100, 3.2, 7.8).toFixed(1))
  const monthlyRent = Math.round((askingPrice * rentalYield / 100) / 12)
  const annualRent = monthlyRent * 12
  const airbnbYield = Number(clamp(rentalYield * 1.28, 4.2, 11.2).toFixed(1))
  const occupancy = clamp(55 + (h % 24), 45, 84)
  const monthlyAirbnb = Math.round((askingPrice * airbnbYield / 100) / 12)
  const annualAirbnb = monthlyAirbnb * 12
  const renovationCost = Math.round(askingPrice * 0.04)
  const valueIncrease = Math.round(askingPrice * 0.065)
  const renovationRoi = Number((((valueIncrease - renovationCost) / Math.max(renovationCost, 1)) * 100).toFixed(1))
  const oneYear = Number((2.2 + (h % 20) / 10).toFixed(1))
  const threeYear = Number((oneYear * 3.1).toFixed(1))
  const fiveYear = Number((oneYear * 5.2).toFixed(1))
  const overallScore = clamp(Math.round(58 + rentalYield + bedrooms), 0, 100)
  const rentalYieldScore = clamp(Math.round(45 + rentalYield * 4), 0, 100)
  const airbnbScore = clamp(Math.round(42 + airbnbYield * 4), 0, 100)
  const appreciationScore = clamp(Math.round(40 + oneYear * 8), 0, 100)
  const renovationScore = clamp(Math.round(38 + Math.max(0, renovationRoi / 3)), 0, 100)
  const legalScore = 62
  const liquidityScore = 61
  const energyScore = 60
  const legalRisk = clamp(100 - legalScore, 0, 100)
  const projectedValue5Year = Math.round(askingPrice * (1 + fiveYear / 100))
  const estimatedMonthlyCashflow = Math.round(monthlyRent * 0.65)
  const fallbackDisclosure = 'Deterministic fallback analysis used because OpenAI was unavailable or returned unusable output.'

  return {
    id: `analysis-${Date.now()}`,
    propertyId: String(property.id ?? `property-${Date.now()}`),
    property,
    score: {
      overall: overallScore,
      rentalYield: rentalYieldScore,
      airbnbPotential: airbnbScore,
      appreciation: appreciationScore,
      renovation: renovationScore,
      legal: legalScore,
      liquidity: liquidityScore,
      energy: energyScore,
    },
    recommendation: 'watch' as const,
    executiveSummary: 'Deterministic fallback analysis generated while AI provider path is unavailable.',
    investmentThesis: 'Conservative fallback thesis derived from stable property inputs and deterministic estimates.',
    estimatedMonthlyRent: monthlyRent,
    rentalYield,
    airbnbYield,
    renovationROI: renovationRoi,
    appreciationPotential: {
      oneYear,
      threeYear,
      fiveYear,
    },
    legalRisk,
    energyPotential: energyScore,
    liquidityScore,
    keyRisks: ['Model provider temporarily unavailable.', 'Legal and energy inputs require local due diligence.'],
    keyUpsides: ['Deterministic estimates indicate the property may support rental and appreciation upside.'],
    assumptions: ['Deterministic estimates computed from provided property fields.', 'Legal, energy, and market assumptions require verification.'],
    missingData: ['Live AI model output unavailable in fallback mode.', 'Title, legal, and energy diligence are not confirmed by the model.'],
    fallbackDisclosure,
    confidenceLevel: 'low' as const,
    executiveDecision: {
      recommendation: 'WATCH' as const,
      score: overallScore,
      confidence: 'Low' as const,
      summary: 'Fallback decision generated with deterministic model.',
    },
    financialModel: {
      askingPrice,
      estimatedMonthlyRent: monthlyRent,
      annualRent,
      grossRentalYield: rentalYield,
      airbnbYield,
      estimatedROI: Number((rentalYield + oneYear).toFixed(1)),
      projectedValue5Year,
      estimatedMonthlyCashflow,
    },
    rentalYieldEstimate: {
      monthly: monthlyRent,
      annual: annualRent,
      percentage: rentalYield,
    },
    airbnbPotential: {
      dailyRate: Math.round((monthlyAirbnb / 30) * (100 / Math.max(occupancy, 1))),
      occupancy,
      monthlyRevenue: monthlyAirbnb,
      annualRevenue: annualAirbnb,
      percentage: airbnbYield,
    },
    renovationROI: {
      estimatedCost: renovationCost,
      valueIncrease,
      roi: renovationRoi,
    },
    risks: ['Model provider temporarily unavailable.', 'Legal and documentation review is still required.'],
    opportunities: ['Re-run with full AI path for richer narrative and risk depth.'],
    assumptionsUsed: ['Deterministic estimates computed from provided property fields.'],
    missingInformation: ['Live AI model output unavailable in fallback mode.'],
    reportText: `Executive Decision: WATCH | Score ${overallScore}/100 | Confidence Low\n\n${fallbackDisclosure}`,
    dataQuality: {
      usedLiveMarketData: false,
      usedDeterministicFallback: true,
      confidenceLevel: 'Low' as const,
      missingData: ['Live AI model output unavailable in fallback mode.', 'Title, legal, and energy diligence are not confirmed by the model.'],
    },
    analyzedAt: new Date().toISOString(),
  }
}

const buildPrompt = (property: Record<string, unknown>, deterministic: ReturnType<typeof buildDeterministicFallback>) => {
  const promptSchema = {
    executiveSummary: 'string',
    investmentThesis: 'string',
    recommendation: 'BUY | WATCH | AVOID',
    score: 72,
    estimatedMonthlyRent: 1450,
    rentalYield: 5.4,
    airbnbYield: 7.1,
    renovationROI: 8.2,
    appreciationPotential: {
      oneYear: 3.4,
      threeYear: 10.1,
      fiveYear: 18.8,
    },
    legalRisk: 38,
    energyPotential: 61,
    liquidityScore: 58,
    keyRisks: ['string'],
    keyUpsides: ['string'],
    assumptions: ['string'],
    missingData: ['string'],
    scoreBreakdown: {
      overall: 72,
      rentalYield: 66,
      airbnbPotential: 64,
      appreciation: 59,
      renovation: 54,
      legal: 62,
      liquidity: 58,
      energy: 61,
    },
    rentalYieldEstimate: {
      monthly: 1450,
      annual: 17400,
      percentage: 5.4,
    },
    financialModel: {
      askingPrice: Number(property.askingPrice) || 0,
      estimatedMonthlyRent: 1450,
      annualRent: 17400,
      grossRentalYield: 5.4,
      airbnbYield: 7.1,
      estimatedROI: 8.2,
      projectedValue5Year: 389000,
      estimatedMonthlyCashflow: 940,
    },
    executiveDecision: {
      recommendation: 'WATCH',
      score: 72,
      confidence: 'Medium',
      summary: 'string',
    },
    reportText: 'string',
    fallbackDisclosure: null,
  }

  return [
    'You are an investor-grade real estate analyst producing conservative, structured JSON only.',
    'Do not use markdown, code fences, or commentary.',
    'Separate confirmed facts from assumptions.',
    'Do not invent legal facts. If legal or energy data is missing, say it requires due diligence.',
    'Be conservative. Clearly label estimates.',
    'Return valid JSON matching the schema and keep numeric values finite.',
    'If data is missing, reduce confidence and explain what must be validated.',
    'For any rent, yield, or ROI field, never output null, undefined, NaN, or negative values.',
    'Use score as a 0-100 investment attractiveness score.',
    'Recommendation must be one of BUY, WATCH, or AVOID.',
    '',
    'Property JSON:',
    JSON.stringify(property),
    '',
    'Deterministic baseline estimates for reference only:',
    JSON.stringify({
      estimatedMonthlyRent: deterministic.estimatedMonthlyRent,
      rentalYield: deterministic.rentalYield,
      airbnbYield: deterministic.airbnbYield,
      renovationROI: deterministic.renovationROI.roi,
      legalRisk: deterministic.legalRisk,
      energyPotential: deterministic.energyPotential,
      liquidityScore: deterministic.liquidityScore,
    }),
    '',
    'Output JSON schema:',
    JSON.stringify(promptSchema),
  ].join('\n')
}

const normalizeOpenAIAnalysis = (raw: unknown, property: Record<string, unknown>, deterministic: ReturnType<typeof buildDeterministicFallback>) => {
  if (!raw || typeof raw !== 'object') return null

  const payload = raw as Record<string, unknown>
  const scorePayload = payload.score && typeof payload.score === 'object' ? (payload.score as Record<string, unknown>) : {}
  const financialModelPayload = payload.financialModel && typeof payload.financialModel === 'object' ? (payload.financialModel as Record<string, unknown>) : {}
  const rentalYieldEstimatePayload = payload.rentalYieldEstimate && typeof payload.rentalYieldEstimate === 'object' ? (payload.rentalYieldEstimate as Record<string, unknown>) : {}
  const airbnbPotentialPayload = payload.airbnbPotential && typeof payload.airbnbPotential === 'object' ? (payload.airbnbPotential as Record<string, unknown>) : {}
  const renovationROIPayload = payload.renovationROI && typeof payload.renovationROI === 'object' ? (payload.renovationROI as Record<string, unknown>) : {}
  const appreciationPotentialPayload = payload.appreciationPotential && typeof payload.appreciationPotential === 'object' ? (payload.appreciationPotential as Record<string, unknown>) : {}
  const executiveDecisionPayload = payload.executiveDecision && typeof payload.executiveDecision === 'object' ? (payload.executiveDecision as Record<string, unknown>) : {}

  const rawEstimatedMonthlyRent = asNumber(payload.estimatedMonthlyRent ?? financialModelPayload.estimatedMonthlyRent ?? rentalYieldEstimatePayload.monthly, 0)
  const rawRentalYield = asNumber(payload.rentalYield ?? financialModelPayload.grossRentalYield ?? rentalYieldEstimatePayload.percentage, 0)
  const rawAirbnbYield = asNumber(payload.airbnbYield ?? financialModelPayload.airbnbYield ?? airbnbPotentialPayload.percentage, 0)
  const rawRenovationROI = asNumber(payload.renovationROI ?? renovationROIPayload.roi ?? financialModelPayload.estimatedROI, 0)

  if (rawEstimatedMonthlyRent <= 0 && rawRentalYield <= 0 && rawAirbnbYield <= 0 && rawRenovationROI <= 0) {
    return null
  }

  const estimatedMonthlyRent = normalizePositiveAmount(rawEstimatedMonthlyRent, deterministic.estimatedMonthlyRent)
  const rentalYield = normalizePercent(rawRentalYield, deterministic.rentalYield)
  const airbnbYield = normalizePercent(rawAirbnbYield, deterministic.airbnbYield)
  const renovationROI = normalizePercent(rawRenovationROI, deterministic.renovationROI.roi)
  const score = normalizeScore(payload.score ?? executiveDecisionPayload.score ?? scorePayload.overall, deterministic.score.overall)

  const scoreObject = {
    overall: score,
    rentalYield: normalizeScore(scorePayload.rentalYield, deterministic.score.rentalYield),
    airbnbPotential: normalizeScore(scorePayload.airbnbPotential, deterministic.score.airbnbPotential),
    appreciation: normalizeScore(scorePayload.appreciation, deterministic.score.appreciation),
    renovation: normalizeScore(scorePayload.renovation, deterministic.score.renovation),
    legal: normalizeScore(scorePayload.legal, deterministic.score.legal),
    liquidity: normalizeScore(scorePayload.liquidity, deterministic.score.liquidity),
    energy: normalizeScore(scorePayload.energy, deterministic.score.energy),
  }

  const executiveSummary = asString(payload.executiveSummary, 'Conservative analysis generated from available property data and model estimates.')
  const investmentThesis = asString(payload.investmentThesis, executiveSummary)
  const recommendation = normalizeRecommendation(payload.recommendation ?? executiveDecisionPayload.recommendation)
  const keyRisks = asStringArray(payload.keyRisks ?? payload.risks, ['Legal and documentation risk requires due diligence.'])
  const keyUpsides = asStringArray(payload.keyUpsides ?? payload.opportunities, ['Potential rental and appreciation upside should be validated with local comps.'])
  const assumptions = asStringArray(payload.assumptions, ['Confirmed property facts were analyzed; missing data was handled conservatively.'])
  const missingData = asStringArray(payload.missingData, ['Title, legal, energy, and local market validation remain required.'])

  const legalRisk = normalizeScore(payload.legalRisk, clamp(100 - scoreObject.legal, 0, 100))
  const energyPotential = normalizeScore(payload.energyPotential, scoreObject.energy)
  const liquidityScore = normalizeScore(payload.liquidityScore, scoreObject.liquidity)

  const annualRent = normalizePositiveAmount(financialModelPayload.annualRent ?? rentalYieldEstimatePayload.annual, Math.round(estimatedMonthlyRent * 12))
  const estimatedROI = normalizePercent(financialModelPayload.estimatedROI, Number((rentalYield + deterministic.appreciationPotential.oneYear).toFixed(1)))
  const projectedValue5Year = normalizePositiveAmount(
    financialModelPayload.projectedValue5Year,
    Math.round(Number(property.askingPrice || 0) * (1 + deterministic.appreciationPotential.fiveYear / 100)),
  )
  const monthlyCashflow = normalizePositiveAmount(
    financialModelPayload.estimatedMonthlyCashflow,
    Math.round(estimatedMonthlyRent * 0.65),
  )

  const appreciationPotential = {
    oneYear: normalizePercent(appreciationPotentialPayload.oneYear, deterministic.appreciationPotential.oneYear),
    threeYear: normalizePercent(appreciationPotentialPayload.threeYear, deterministic.appreciationPotential.threeYear),
    fiveYear: normalizePercent(appreciationPotentialPayload.fiveYear, deterministic.appreciationPotential.fiveYear),
  }

  return {
    id: asString(payload.id, `analysis-${Date.now()}`),
    propertyId: asString(payload.propertyId, String(property.id ?? `property-${Date.now()}`)),
    property,
    score: scoreObject,
    recommendation,
    executiveSummary,
    investmentThesis,
    estimatedMonthlyRent,
    rentalYield,
    airbnbYield,
    renovationROI,
    appreciationPotential,
    legalRisk,
    energyPotential,
    liquidityScore,
    keyRisks,
    keyUpsides,
    assumptions,
    missingData,
    fallbackDisclosure: null,
    confidenceLevel: asString(payload.confidenceLevel, missingData.length > 0 ? 'low' : 'medium') as 'low' | 'medium' | 'high',
    executiveDecision: {
      recommendation: normalizeUpperRecommendation(recommendation),
      score,
      confidence: asString(executiveDecisionPayload.confidence, missingData.length > 0 ? 'Low' : 'Medium') as 'Low' | 'Medium' | 'High',
      summary: asString(executiveDecisionPayload.summary, executiveSummary),
    },
    financialModel: {
      askingPrice: Math.round(asNumber(property.askingPrice, 0)),
      estimatedMonthlyRent,
      annualRent,
      grossRentalYield: rentalYield,
      airbnbYield,
      estimatedROI,
      projectedValue5Year,
      estimatedMonthlyCashflow: monthlyCashflow,
    },
    rentalYieldEstimate: {
      monthly: estimatedMonthlyRent,
      annual: annualRent,
      percentage: rentalYield,
    },
    airbnbPotential: {
      dailyRate: normalizePositiveAmount(airbnbPotentialPayload.dailyRate, deterministic.airbnbPotential.dailyRate),
      occupancy: clamp(Math.round(asNumber(airbnbPotentialPayload.occupancy, deterministic.airbnbPotential.occupancy)), 0, 100),
      monthlyRevenue: normalizePositiveAmount(airbnbPotentialPayload.monthlyRevenue, deterministic.airbnbPotential.monthlyRevenue),
      annualRevenue: normalizePositiveAmount(airbnbPotentialPayload.annualRevenue, deterministic.airbnbPotential.annualRevenue),
      percentage: airbnbYield,
    },
    renovationROI: {
      estimatedCost: normalizePositiveAmount(renovationROIPayload.estimatedCost, deterministic.renovationROI.estimatedCost),
      valueIncrease: normalizePositiveAmount(renovationROIPayload.valueIncrease, deterministic.renovationROI.valueIncrease),
      roi: renovationROI,
    },
    risks: keyRisks,
    opportunities: keyUpsides,
    assumptionsUsed: assumptions,
    missingInformation: missingData,
    reportText: asString(payload.reportText, `${executiveSummary}\n\n${investmentThesis}`),
    dataQuality: {
      usedLiveMarketData: true,
      usedDeterministicFallback: false,
      confidenceLevel: asString(payload.confidenceLevel, missingData.length > 0 ? 'Low' : 'Medium') as 'Low' | 'Medium' | 'High',
      missingData,
    },
    analyzedAt: new Date().toISOString(),
  }
}

const buildFallbackResponse = (res: JsonResponder, property: Record<string, unknown>, reason: string) => {
  const fallbackAnalysis = buildDeterministicFallback(property)
  console.log('[AI API] fallback used', reason)
  res.status(200).json({
    ok: true,
    analysis: fallbackAnalysis,
    meta: {
      fallback: true,
      reason,
    },
  })
}

const callOpenAI = async (property: Record<string, unknown>, deterministic: ReturnType<typeof buildDeterministicFallback>) => {
  const apiKey = process.env.OPENAI_API_KEY ?? ''
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  console.log('[AI API] key exists', Boolean(apiKey))
  if (!apiKey) return { ok: false as const, reason: 'missing-api-key' }

  console.log('[AI API] OpenAI started')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)

  try {
    const response = await fetch(OPENAI_API_URL, {
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
          {
            role: 'system',
            content: 'You are a conservative real-estate investment analyst that returns strict JSON only.',
          },
          {
            role: 'user',
            content: buildPrompt(property, deterministic),
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false as const, reason: `openai-http-${response.status}` }
    }

    const raw = (await response.json()) as OpenAIChatCompletion
    const content = raw.choices?.[0]?.message?.content ?? ''
    if (!content.trim()) {
      return { ok: false as const, reason: 'openai-empty-content' }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return { ok: false as const, reason: 'openai-invalid-json' }
    }

    const analysis = normalizeOpenAIAnalysis(parsed, property, deterministic)
    if (!analysis) {
      return { ok: false as const, reason: 'openai-zero-metrics' }
    }

    console.log('[AI API] OpenAI succeeded')
    return { ok: true as const, analysis }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false as const, reason: 'openai-timeout' }
    }
    return { ok: false as const, reason: 'openai-error' }
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req: NodeLikeRequest, res: JsonResponder): Promise<void> {
  console.log('[AI API] request received')

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' })
    return
  }

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, message: 'deal-analysis function alive' })
    return
  }

  const parsedBody = parseBody(req.body)
  if (!parsedBody) {
    res.status(400).json({ ok: false, error: 'Invalid JSON body.' })
    return
  }

  const property = parsedBody.property
  if (!isPropertyPayload(property)) {
    res.status(400).json({ ok: false, error: 'Invalid property payload.' })
    return
  }

  const deterministic = buildDeterministicFallback(property)
  const openAIResult = await callOpenAI(property, deterministic)

  if (!openAIResult.ok) {
    buildFallbackResponse(res, property, openAIResult.reason)
    return
  }

  res.status(200).json({
    ok: true,
    analysis: openAIResult.analysis,
    meta: {
      fallback: false,
      provider: 'openai',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    },
  })
}
