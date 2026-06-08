import type { InvestmentSearchBrief, OpportunitySource, RawOpportunity } from '@/lib/types/opportunityHunter'
import type { DiscoveryRunResult } from './types'
import { resolveConnector } from './connectorRegistry'
import { normalizeRawOpportunity } from './normalization'
import { deduplicateRawOpportunities } from './deduplication'
import { evaluateOpportunityMatch } from './matchingEngine'

export interface DiscoveryRepository {
  createRun(input: {
    organizationId: string
    sourceId: string
    briefId: string
    connectorName: string
    connectorType: string
  }): Promise<{ id: string }>
  finalizeRun(runId: string, input: {
    status: 'succeeded' | 'failed' | 'partial'
    fetched: number
    inserted: number
    deduplicated: number
    matched: number
    errorMessage?: string
  }): Promise<void>
  insertRawOpportunities(items: RawOpportunity[]): Promise<RawOpportunity[]>
  upsertMatch(input: {
    organizationId: string
    briefId: string
    rawOpportunityId: string
    sourceId: string | null
    matchScore: number
    matchReasons: string[]
    mismatchReasons: string[]
    missingData: string[]
    suggestedNextStep: string
    rankScore: number
    isTopMatch: boolean
    aiAnalysis?: Record<string, unknown> | null
    aiInvestmentScore?: number | null
    recommendation?: string | null
  }): Promise<void>
  createAlert(input: {
    organizationId: string
    briefId?: string
    rawOpportunityId?: string
    alertType: 'new_match' | 'high_match' | 'source_failure' | 'discovery_run'
    title: string
    message: string
    severity: 'info' | 'warning' | 'critical'
    metadata?: Record<string, unknown>
  }): Promise<void>
}

const parseAiScore = (analysis: Record<string, unknown> | null | undefined): number | null => {
  if (!analysis) return null
  const value = analysis.score
  const n = Number(value)
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)))
  return null
}

const runAiAnalysisForHighMatch = async (item: RawOpportunity, matchScore: number): Promise<Record<string, unknown> | null> => {
  if (matchScore < 80) return null

  const apiKey = process.env.OPENAI_API_KEY ?? ''
  if (!apiKey) {
    return {
      mode: 'skipped',
      reason: 'missing_api_key',
      score: Math.min(95, matchScore + 3),
      recommendation: matchScore >= 90 ? 'buy' : 'watch',
      summary: 'AI key missing; score proxied from matching engine.',
    }
  }

  try {
    const payload = {
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a conservative real estate underwriter. Return strict JSON only.',
        },
        {
          role: 'user',
          content: `Assess this opportunity and return JSON with keys: score (0-100), recommendation (buy|watch|avoid), summary, key_risks, key_upside. Opportunity: ${JSON.stringify(item)}`,
        },
      ],
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        mode: 'fallback',
        reason: `http_${response.status}`,
        score: Math.min(95, matchScore + 2),
        recommendation: matchScore >= 90 ? 'buy' : 'watch',
      }
    }

    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content ?? ''
    if (!content) {
      return {
        mode: 'fallback',
        reason: 'empty_content',
        score: Math.min(95, matchScore + 1),
        recommendation: 'watch',
      }
    }

    const parsed = JSON.parse(content) as Record<string, unknown>
    return parsed
  } catch {
    return {
      mode: 'fallback',
      reason: 'runtime_error',
      score: Math.min(95, matchScore + 1),
      recommendation: 'watch',
    }
  }
}

export const runDiscoveryForBriefAndSource = async (
  repo: DiscoveryRepository,
  organizationId: string,
  brief: InvestmentSearchBrief,
  source: OpportunitySource,
): Promise<DiscoveryRunResult> => {
  const connector = resolveConnector(source)
  if (!connector) {
    return {
      runId: 'n/a',
      sourceId: source.id,
      sourceName: source.name,
      fetched: 0,
      inserted: 0,
      deduplicated: 0,
      matched: 0,
      failedReason: `No connector registered for source type ${source.type}`,
    }
  }

  const run = await repo.createRun({
    organizationId,
    sourceId: source.id,
    briefId: brief.id,
    connectorName: connector.name,
    connectorType: connector.type,
  })

  try {
    const fetchedRaw = await connector.fetchOpportunities({ organizationId, brief, source })
    const normalized = fetchedRaw.map((item) => normalizeRawOpportunity({
      ...item,
      organization_id: organizationId,
      source_id: source.id,
      connector_run_id: run.id,
    }))

    const { canonical, duplicates } = deduplicateRawOpportunities(normalized)
    const insertedRows = await repo.insertRawOpportunities([...canonical, ...duplicates])

    const canonicalRows = insertedRows.filter((row) => !row.is_duplicate)
    let matchedCount = 0

    for (const row of canonicalRows) {
      if (!row.id) continue
      const evaluation = evaluateOpportunityMatch(brief, row)
      if (evaluation.matchScore < 45) {
        continue
      }

      const aiAnalysis = await runAiAnalysisForHighMatch(row, evaluation.matchScore)
      const aiInvestmentScore = parseAiScore(aiAnalysis)
      const recommendation = typeof aiAnalysis?.recommendation === 'string' ? aiAnalysis.recommendation : null

      await repo.upsertMatch({
        organizationId,
        briefId: brief.id,
        rawOpportunityId: row.id,
        sourceId: source.id,
        matchScore: evaluation.matchScore,
        matchReasons: evaluation.matchReasons,
        mismatchReasons: evaluation.mismatchReasons,
        missingData: evaluation.missingData,
        suggestedNextStep: evaluation.suggestedNextStep,
        rankScore: evaluation.rankScore,
        isTopMatch: evaluation.matchScore >= 80,
        aiAnalysis,
        aiInvestmentScore,
        recommendation,
      })

      matchedCount += 1

      await repo.createAlert({
        organizationId,
        briefId: brief.id,
        rawOpportunityId: row.id,
        alertType: evaluation.matchScore >= 80 ? 'high_match' : 'new_match',
        title: evaluation.matchScore >= 80 ? 'High opportunity match found' : 'New opportunity match found',
        message: `${row.title} matched ${evaluation.matchScore}/100 for ${brief.title}.`,
        severity: evaluation.matchScore >= 80 ? 'warning' : 'info',
        metadata: {
          briefId: brief.id,
          rawOpportunityId: row.id,
          matchScore: evaluation.matchScore,
          recommendation,
        },
      })
    }

    await repo.finalizeRun(run.id, {
      status: duplicates.length > 0 ? 'partial' : 'succeeded',
      fetched: fetchedRaw.length,
      inserted: insertedRows.length,
      deduplicated: duplicates.length,
      matched: matchedCount,
    })

    return {
      runId: run.id,
      sourceId: source.id,
      sourceName: source.name,
      fetched: fetchedRaw.length,
      inserted: insertedRows.length,
      deduplicated: duplicates.length,
      matched: matchedCount,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected discovery failure.'

    await repo.finalizeRun(run.id, {
      status: 'failed',
      fetched: 0,
      inserted: 0,
      deduplicated: 0,
      matched: 0,
      errorMessage: message,
    })

    await repo.createAlert({
      organizationId,
      briefId: brief.id,
      alertType: 'source_failure',
      title: 'Source connector failed',
      message: `${source.name} failed during discovery: ${message}`,
      severity: 'critical',
      metadata: {
        sourceId: source.id,
        runId: run.id,
      },
    })

    return {
      runId: run.id,
      sourceId: source.id,
      sourceName: source.name,
      fetched: 0,
      inserted: 0,
      deduplicated: 0,
      matched: 0,
      failedReason: message,
    }
  }
}
