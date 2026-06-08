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
