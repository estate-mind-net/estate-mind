type JsonResponder = { status: (code: number) => { json: (payload: unknown) => void } }

type NodeLikeRequest = {
  method?: string
  body?: unknown
}

const asNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
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
  const projectedValue5Year = Math.round(askingPrice * (1 + fiveYear / 100))

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
    executiveSummary: 'Deterministic fallback analysis generated while AI provider path is being restored.',
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
    appreciationPotential: {
      oneYear,
      threeYear,
      fiveYear,
    },
    risks: ['Model provider temporarily unavailable.'],
    opportunities: ['Re-run with full AI path for richer narrative and risk depth.'],
    assumptions: ['Deterministic estimates computed from provided property fields.'],
    missingData: ['Live AI model output unavailable in fallback mode.'],
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
      estimatedMonthlyCashflow: Math.round(monthlyRent * 0.65),
    },
    analyzedAt: new Date().toISOString(),
  }
}

export default function handler(req: NodeLikeRequest, res: JsonResponder): void {
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

  res.status(200).json({
    ok: true,
    analysis: buildDeterministicFallback(property),
    meta: { fallback: true, reason: 'deterministic-temporary-mode' },
  })
}
