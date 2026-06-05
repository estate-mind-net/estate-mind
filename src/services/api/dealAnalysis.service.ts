import type { InvestmentAnalysis, Property } from '@/lib/types'

interface DealAnalysisSuccess {
  ok: true
  analysis: InvestmentAnalysis
}

interface DealAnalysisFailure {
  ok: false
  error?: string
}

type DealAnalysisResponse = DealAnalysisSuccess | DealAnalysisFailure

export async function generateDealAnalysis(property: Property): Promise<InvestmentAnalysis> {
  try {
    const response = await fetch('/api/deal-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ property }),
    })

    let payload: DealAnalysisResponse | null = null
    try {
      payload = (await response.json()) as DealAnalysisResponse
    } catch {
      payload = null
    }

    if (!response.ok || !payload || !payload.ok) {
      const reason = payload && !payload.ok && payload.error ? payload.error : `Request failed with status ${response.status}`
      throw new Error(reason)
    }

    if (import.meta.env.DEV) {
      console.debug('[deal-analysis-ui] api score fields', {
        score: payload.analysis.score,
        overallScore: (payload.analysis as InvestmentAnalysis & Record<string, unknown>).overallScore,
        investmentScore: (payload.analysis as InvestmentAnalysis & Record<string, unknown>).investmentScore,
        metrics: (payload.analysis as InvestmentAnalysis & Record<string, unknown>).metrics,
        confidence: (payload.analysis as InvestmentAnalysis & Record<string, unknown>).confidence,
        confidenceLevel: (payload.analysis as InvestmentAnalysis & Record<string, unknown>).confidenceLevel,
      })
    }

    return payload.analysis
  } catch (error) {
    console.error('[AI ANALYSIS FATAL]', error)
    throw error
  }
}
