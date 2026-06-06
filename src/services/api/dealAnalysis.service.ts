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

const DEAL_ANALYSIS_TIMEOUT_MS = 20_000

export async function generateDealAnalysis(property: Property): Promise<InvestmentAnalysis> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const controller = new AbortController()

  try {
    const url = new URL('/api/deal-analysis', window.location.origin).toString()
    console.log('[AI REQUEST URL]', url)

    timeoutId = setTimeout(() => {
      controller.abort()
    }, DEAL_ANALYSIS_TIMEOUT_MS)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ property }),
      signal: controller.signal,
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
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('AI analysis timed out after 20 seconds.')
    }

    console.error('[AI ANALYSIS FATAL]', error)
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
