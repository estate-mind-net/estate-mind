// Vercel Serverless Function entrypoint.
// Production and `vercel dev` route /api/deal-analysis here.
// Business logic is centralized in src/lib/server/dealAnalysisHandler.ts.

import { handleDealAnalysisRequest } from '../src/lib/server/dealAnalysisHandler'

const asNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

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

const stableHash = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const emergencyFallbackAnalysis = (property: Record<string, unknown>) => {
  const askingPrice = Math.max(asNumber(property.askingPrice, 1), 1)
  const beds = clamp(Math.round(asNumber(property.bedrooms, 1)), 0, 8)
  const h = stableHash(`${property.country}|${property.city}|${property.district}|${property.propertyType}`.toLowerCase())

  const rentalYield = Number(clamp(4.2 + (h % 170) / 100, 3.2, 7.8).toFixed(1))
  const monthlyRent = Math.round((askingPrice * rentalYield / 100) / 12)
  const annualRent = monthlyRent * 12
  const airbnbYield = Number(clamp(rentalYield * 1.28, 4.2, 11.2).toFixed(1))
  const occupancy = clamp(55 + (h % 24), 45, 84)
  const monthlyAirbnb = Math.round((askingPrice * airbnbYield / 100) / 12)
  const annualAirbnb = monthlyAirbnb * 12
  const renoCost = Math.round(askingPrice * 0.04)
  const valueGain = Math.round(askingPrice * 0.065)
  const renoRoi = Number((((valueGain - renoCost) / Math.max(renoCost, 1)) * 100).toFixed(1))
  const oneYear = Number((2.2 + (h % 20) / 10).toFixed(1))
  const threeYear = Number((oneYear * 3.1).toFixed(1))
  const fiveYear = Number((oneYear * 5.2).toFixed(1))
  const overallScore = clamp(Math.round(58 + rentalYield + beds), 0, 100)
  const projectedValue5Year = Math.round(askingPrice * (1 + fiveYear / 100))
  const estimatedROI = Number((rentalYield + oneYear).toFixed(1))

  return {
    id: `analysis-${Date.now()}`,
    propertyId: String(property.id ?? `property-${Date.now()}`),
    property,
    score: {
      overall: overallScore,
      rentalYield: overallScore,
      airbnbPotential: overallScore,
      appreciation: overallScore,
      renovation: overallScore,
      legal: 62,
      liquidity: 61,
      energy: 60,
    },
    recommendation: 'watch' as const,
    executiveSummary: 'Deterministic fallback analysis generated due to temporary server recovery mode.',
    rentalYieldEstimate: { monthly: monthlyRent, annual: annualRent, percentage: rentalYield },
    airbnbPotential: {
      dailyRate: Math.round((monthlyAirbnb / 30) * (100 / Math.max(occupancy, 1))),
      occupancy,
      monthlyRevenue: monthlyAirbnb,
      annualRevenue: annualAirbnb,
      percentage: airbnbYield,
    },
    renovationROI: {
      estimatedCost: renoCost,
      valueIncrease: valueGain,
      roi: renoRoi,
    },
    appreciationPotential: {
      oneYear,
      threeYear,
      fiveYear,
    },
    risks: ['Temporary model provider outage or server execution failure.'],
    opportunities: ['Deal can be re-analyzed when full AI provider path is restored.'],
    assumptions: ['Emergency deterministic model used from property payload only.'],
    missingData: ['Live provider response unavailable in recovery mode.'],
    confidenceLevel: 'low' as const,
    executiveDecision: {
      recommendation: 'WATCH' as const,
      score: overallScore,
      confidence: 'Low' as const,
      summary: 'Fallback decision generated in emergency recovery mode.',
    },
    financialModel: {
      askingPrice,
      estimatedMonthlyRent: monthlyRent,
      annualRent,
      grossRentalYield: rentalYield,
      airbnbYield,
      estimatedROI,
      projectedValue5Year,
      estimatedMonthlyCashflow: Math.round(monthlyRent * 0.65),
    },
    analyzedAt: new Date().toISOString(),
  }
}

export default async function handler(request: Request): Promise<Response> {
  try {
    return await handleDealAnalysisRequest(request)
  } catch (error) {
    console.error('[AI API] fatal fallback recovery', error)

    try {
      const body = (await request.clone().json()) as Record<string, unknown>
      const property = body.property

      if (isPropertyPayload(property)) {
        console.warn('[AI API] fallback used', { reason: 'entrypoint-fatal-recovery' })
        return new Response(
          JSON.stringify({
            ok: true,
            analysis: emergencyFallbackAnalysis(property),
            meta: { fallback: true, reason: 'entrypoint-fatal-recovery' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } catch {
      // Request body could be unreadable after a fatal import/runtime failure.
    }

    return new Response(JSON.stringify({ ok: false, error: 'Fatal API boot error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
