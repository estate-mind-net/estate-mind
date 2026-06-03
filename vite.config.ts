import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption, loadEnv } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const readJsonBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>
}

const asNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const asLooseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/)
    if (match) {
      const num = Number(match[0])
      if (Number.isFinite(num)) {
        return num
      }
    }
  }

  return fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const asStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return normalized.length > 0 ? normalized : fallback
}

const asNonEmptyString = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

const asConfidence = (value: unknown, fallback: 'high' | 'medium' | 'low' = 'low') => {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return fallback
}

const asMetricValue = (value: unknown): string | number | null => {
  if (value === null || typeof value === 'undefined') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return null
}

const asMetricObject = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})

const hasSignificantMissingInformation = (items: string[]) => {
  if (items.length >= 2) {
    return true
  }

  return items.some((item) => /ownership|title|cadastral|debt|lawyer|permit|zoning|inspection|quote|occupancy|adr|comparable|rent|sales|legal/i.test(item))
}

const hasExplicitNearZeroRationale = (details: string[]) => {
  const severeNegativeSignal = /condemned|uninhabitable|structural|illegal|fraud|litigation|hazardous|demolition|negative cash flow|cannot rent|no demand|severe vacancy|environmental contamination|bankruptcy/i
  return details.some((detail) => severeNegativeSignal.test(detail))
}

const isPropertyPayload = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const property = value as Record<string, unknown>
  return (
    typeof property.title === 'string' &&
    typeof property.country === 'string' &&
    typeof property.city === 'string' &&
    typeof property.district === 'string' &&
    typeof property.propertyType === 'string' &&
    Number.isFinite(Number(property.askingPrice)) &&
    typeof property.currency === 'string' &&
    Number.isFinite(Number(property.sizeSqm)) &&
    Number.isFinite(Number(property.bedrooms)) &&
    typeof property.condition === 'string' &&
    typeof property.description === 'string'
  )
}

const normalizeAnalysis = (raw: unknown, property: Record<string, unknown>) => {
  const payload = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const score = payload.score && typeof payload.score === 'object'
    ? payload.score as Record<string, unknown>
    : {}

  const askingPrice = asNumber(property.askingPrice, 1)
  const expectedRent = asNumber(property.expectedRent, askingPrice * 0.0035)
  const hasExpectedRentInput = Number.isFinite(Number(property.expectedRent))

  const rentalYieldEstimate = payload.rentalYieldEstimate && typeof payload.rentalYieldEstimate === 'object'
    ? payload.rentalYieldEstimate as Record<string, unknown>
    : {}

  const airbnbPotential = payload.airbnbPotential && typeof payload.airbnbPotential === 'object'
    ? payload.airbnbPotential as Record<string, unknown>
    : {}

  const renovationROI = payload.renovationROI && typeof payload.renovationROI === 'object'
    ? payload.renovationROI as Record<string, unknown>
    : {}

  const appreciationPotential = payload.appreciationPotential && typeof payload.appreciationPotential === 'object'
    ? payload.appreciationPotential as Record<string, unknown>
    : {}

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
    : (Number.isFinite(rentalPctFromLegacy) ? rentalPctFromLegacy : 0)

  const rentalMonthly = asNumber(
    rentalYieldEstimate.monthly,
    rentalPctResolved > 0 ? (askingPrice * (rentalPctResolved / 100)) / 12 : expectedRent,
  )
  const rentalAnnual = asNumber(rentalYieldEstimate.annual, rentalMonthly * 12)
  const rentalPct = Number.isFinite(rentalPctResolved) && rentalPctResolved > 0
    ? rentalPctResolved
    : asNumber(rentalYieldEstimate.percentage, (rentalAnnual / Math.max(askingPrice, 1)) * 100)

  const airbnbPctFromMetric = asLooseNumber(airbnbYieldValue, NaN)
  const airbnbPctFromLegacy = asNumber(airbnbPotential.percentage, NaN)
  const airbnbPctResolved = Number.isFinite(airbnbPctFromMetric)
    ? airbnbPctFromMetric
    : (Number.isFinite(airbnbPctFromLegacy) ? airbnbPctFromLegacy : 0)

  const airbnbMonthly = asNumber(
    airbnbPotential.monthlyRevenue,
    airbnbPctResolved > 0 ? (askingPrice * (airbnbPctResolved / 100)) / 12 : rentalMonthly * 1.2,
  )
  const airbnbAnnual = asNumber(airbnbPotential.annualRevenue, airbnbMonthly * 12)
  const airbnbPct = Number.isFinite(airbnbPctResolved) && airbnbPctResolved > 0
    ? airbnbPctResolved
    : asNumber(airbnbPotential.percentage, (airbnbAnnual / Math.max(askingPrice, 1)) * 100)

  const recommendation = payload.recommendation
  const safeRecommendation = recommendation === 'buy' || recommendation === 'watch' || recommendation === 'avoid'
    ? recommendation
    : 'watch'

  const derivedConfidence = missingInformation.length > 0 ? 'low' : 'high'
  const confidenceLevel = asConfidence(payload.confidenceLevel, derivedConfidence)

  const rawOverallScore = clamp(Math.round(asNumber(score.overall, 65)), 0, 100)

  const metricConfidence = (provided: unknown, value: string | number | null) => {
    if (value === null) {
      return 'low'
    }

    const normalized = asConfidence(provided, confidenceLevel)
    if (missingInformation.length > 0 && normalized === 'high') {
      return 'medium'
    }

    return normalized
  }

  const investmentThesis = asNonEmptyString(
    payload.investmentThesis ?? payload.executiveSummary,
    'Conservative opportunity with limited certainty; validate assumptions with local market evidence before committing capital.',
  )

  const severeQualityEvidence = hasExplicitNearZeroRationale([
    investmentThesis,
    ...keyRisks,
    asNonEmptyString(payload.executiveSummary, ''),
    asNonEmptyString(rentalYieldMetric.explanation, ''),
    asNonEmptyString(airbnbYieldMetric.explanation, ''),
    asNonEmptyString(renovationROIMetric.explanation, ''),
    asNonEmptyString(appreciationMetric.explanation, ''),
    asNonEmptyString(liquidityMetric.explanation, ''),
    asNonEmptyString(legalRiskMetric.explanation, ''),
  ])

  // Investment quality answers "how attractive is this asset?".
  // Confidence answers "how certain are we about that estimate?".
  // Missing data should lower confidence and expand caveats, not collapse quality to zero.
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
    executiveSummary: investmentThesis,
    rentalYieldEstimate: {
      monthly: Math.round(rentalMonthly),
      annual: Math.round(rentalAnnual),
      percentage: Number(rentalPct.toFixed(1)),
    },
    airbnbPotential: {
      dailyRate: Math.round(asNumber(airbnbPotential.dailyRate, airbnbMonthly / 30)),
      occupancy: clamp(Math.round(asNumber(airbnbPotential.occupancy, 62)), 0, 100),
      monthlyRevenue: Math.round(airbnbMonthly),
      annualRevenue: Math.round(airbnbAnnual),
      percentage: Number(airbnbPct.toFixed(1)),
    },
    renovationROI: {
      estimatedCost: Math.round(asNumber(renovationROI.estimatedCost, askingPrice * 0.06)),
      valueIncrease: Math.round(asNumber(renovationROI.valueIncrease, askingPrice * 0.08)),
      roi: Number(asNumber(renovationROI.roi, 18).toFixed(1)),
    },
    appreciationPotential: {
      oneYear: Number(asNumber(appreciationPotential.oneYear, 3).toFixed(1)),
      threeYear: Number(asNumber(appreciationPotential.threeYear, 10).toFixed(1)),
      fiveYear: Number(asNumber(appreciationPotential.fiveYear, 18).toFixed(1)),
    },
    risks: keyRisks,
    opportunities: keyUpsides,
    assumptions: assumptionsUsed,
    missingData: missingInformation,
    factsProvided,
    assumptionsUsed,
    estimates,
    confidenceLevel,
    investmentThesis,
    keyRisks,
    keyUpsides,
    missingInformation,
    additionalDataToImproveAccuracy,
    scoringRules,
    investorAnalysis: {
      factsProvided,
      assumptionsUsed,
      estimates,
      confidenceLevel,
      metrics: {
        rentalYield: {
          value: rentalYieldValue,
          confidence: metricConfidence(rentalYieldMetric.confidence, rentalYieldValue),
          explanation: asNonEmptyString(
            rentalYieldMetric.explanation,
            'Rental yield is estimated from provided rent and price context, adjusted conservatively when evidence is limited.',
          ),
        },
        airbnbYield: {
          value: airbnbYieldValue,
          confidence: metricConfidence(airbnbYieldMetric.confidence, airbnbYieldValue),
          explanation: asNonEmptyString(
            airbnbYieldMetric.explanation,
            'Airbnb yield depends on local regulation, seasonality, and occupancy assumptions.',
          ),
        },
        renovationROI: {
          value: renovationROIValue,
          confidence: metricConfidence(renovationROIMetric.confidence, renovationROIValue),
          explanation: asNonEmptyString(
            renovationROIMetric.explanation,
            'Renovation ROI is scenario-based and should be validated with contractor quotes and scope certainty.',
          ),
        },
        appreciationPotential: {
          value: appreciationValue,
          confidence: metricConfidence(appreciationMetric.confidence, appreciationValue),
          explanation: asNonEmptyString(
            appreciationMetric.explanation,
            'Appreciation potential is uncertain and tied to macro conditions and neighborhood dynamics.',
          ),
        },
        liquidity: {
          value: liquidityValue,
          confidence: metricConfidence(liquidityMetric.confidence, liquidityValue),
          explanation: asNonEmptyString(
            liquidityMetric.explanation,
            'Liquidity depends on demand depth, price band, and time-to-sell evidence in the micro-market.',
          ),
        },
        legalRisk: {
          value: legalRiskValue,
          confidence: metricConfidence(legalRiskMetric.confidence, legalRiskValue),
          explanation: asNonEmptyString(
            legalRiskMetric.explanation,
            'Legal risk should be confirmed by title, zoning, licensing, and compliance review.',
          ),
        },
      },
      investmentThesis,
      keyRisks,
      keyUpsides,
      missingInformation,
      additionalDataToImproveAccuracy,
      scoringRules,
    },
    analyzedAt: new Date().toISOString(),
  }
}

const buildPrompt = (property: Record<string, unknown>) => {
  return [
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

      // Backward-compatible fields for the existing UI
      score: {
        overall: 60,
        rentalYield: 60,
        airbnbPotential: 60,
        appreciation: 60,
        renovation: 60,
        legal: 60,
        liquidity: 60,
        energy: 60,
      },
      recommendation: 'watch',
      executiveSummary: 'string',
      rentalYieldEstimate: { monthly: 0, annual: 0, percentage: 0 },
      airbnbPotential: { dailyRate: 0, occupancy: 0, monthlyRevenue: 0, annualRevenue: 0, percentage: 0 },
      renovationROI: { estimatedCost: 0, valueIncrease: 0, roi: 0 },
      appreciationPotential: { oneYear: 0, threeYear: 0, fiveYear: 0 },
      risks: ['string'],
      opportunities: ['string'],
      assumptions: ['string'],
      missingData: ['string'],
    }),
  ].join('\n')
}

interface OpenAIDealAnalysisPluginOptions {
  apiKey: string
  model: string
  debug: boolean
}

const openAIDealAnalysisPlugin = (options: OpenAIDealAnalysisPluginOptions): PluginOption => ({
  name: 'openai-deal-analysis-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = req.url?.split('?')[0]
      if (req.method !== 'POST' || pathname !== '/api/deal-analysis') {
        next()
        return
      }

      const apiKey = options.apiKey
      if (!apiKey) {
        sendJson(res, 503, { ok: false, error: 'AI provider is not configured on the server.' })
        return
      }

      try {
        const body = await readJsonBody(req)
        const property = body.property

        if (!isPropertyPayload(property)) {
          sendJson(res, 400, { ok: false, error: 'Invalid property payload.' })
          return
        }

        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: options.model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: 'You generate conservative real-estate investment analysis as strict JSON.',
              },
              {
                role: 'user',
                content: buildPrompt(property),
              },
            ],
          }),
        })

        if (!response.ok) {
          const providerBody = await response.text()
          console.error('OpenAI request failed', {
            status: response.status,
            statusText: response.statusText,
            providerMessage: providerBody.slice(0, 500),
          })
          sendJson(res, 502, { ok: false, error: 'AI provider request failed.' })
          return
        }

        const rawResponseText = await response.text()
        if (options.debug) {
          console.debug('[deal-analysis] raw OpenAI response', rawResponseText)
        }

        const payload = JSON.parse(rawResponseText) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        if (options.debug) {
          console.debug('[deal-analysis] parsed OpenAI response JSON', payload)
        }
        const content = payload.choices?.[0]?.message?.content

        if (!content) {
          console.error('OpenAI response did not contain content')
          sendJson(res, 502, { ok: false, error: 'AI provider returned empty content.' })
          return
        }

        const structured = JSON.parse(content)
        if (options.debug) {
          const structuredPayload = structured && typeof structured === 'object'
            ? structured as Record<string, unknown>
            : {}

          console.debug('[deal-analysis] raw score fields', {
            overallScore: structuredPayload.overallScore,
            score: structuredPayload.score,
            investmentScore: structuredPayload.investmentScore,
            metrics: structuredPayload.metrics,
            confidence: structuredPayload.confidence,
            confidenceLevel: structuredPayload.confidenceLevel,
          })
        }
        const analysis = normalizeAnalysis(structured, property)
        if (options.debug) {
          console.debug('[deal-analysis] normalized score fields', {
            score: analysis.score,
            overallScore: (analysis as Record<string, unknown>).overallScore,
            investmentScore: (analysis as Record<string, unknown>).investmentScore,
            metrics: (analysis as Record<string, unknown>).metrics,
            confidence: (analysis as Record<string, unknown>).confidence,
            confidenceLevel: (analysis as Record<string, unknown>).confidenceLevel,
          })
          console.debug('[deal-analysis] normalized analysis', analysis)
        }
        sendJson(res, 200, { ok: true, analysis })
      } catch (error) {
        console.error('Deal analysis endpoint error', error instanceof Error ? { message: error.message } : error)
        sendJson(res, 500, { ok: false, error: 'Failed to generate analysis.' })
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const openAIKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''
  const openAIModel = env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const debugOpenAIResponse = env.DEBUG_OPENAI_RESPONSE === '1'

  return {
    plugins: [
      openAIDealAnalysisPlugin({
        apiKey: openAIKey,
        model: openAIModel,
        debug: debugOpenAIResponse,
      }) as PluginOption,
      react(),
      tailwindcss(),
      // DO NOT REMOVE
      createIconImportProxy() as PluginOption,
      sparkPlugin() as PluginOption,
    ],
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src')
      }
    },
  }
})
