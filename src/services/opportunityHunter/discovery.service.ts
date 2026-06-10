import type { InvestmentSearchBrief, OpportunitySource, RawOpportunity } from '@/lib/types/opportunityHunter'
import type { DiscoveryRunResult, DiscoveryTraceEvent } from './types'
import { resolveConnector } from './connectorRegistry'
import { normalizeRawOpportunity } from './normalization'
import { deduplicateRawOpportunities } from './deduplication'
import { evaluateOpportunityMatch } from './matchingEngine'

export interface DiscoveryRepository {
  createRun(input: {
    organizationId: string
    sourceId: string
    briefId: string | null
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
    metadata?: Record<string, unknown>
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
  context?: {
    activeSourceCount?: number
  },
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

  const generatedQueries: string[] = []
  const connectorErrors: string[] = []
  let queryCount = 0
  let searchResultsCount = 0
  let extractedOpportunitiesCount = 0
  let categoryPagesSkipped = 0
  let listingPagesFound = 0
  let listingCardsExtracted = 0
  let invalidTitlesRejected = 0
  let invalidUrlsRejected = 0
  let lowConfidenceRejected = 0
  let portalMetrics: Record<string, unknown> = {}
  let rawSearchResults: Array<Record<string, unknown>> = []
  let validationRejections: Array<Record<string, unknown>> = []
  const rejectedMatches: Array<Record<string, unknown>> = []
  const pageClassifications: Array<Record<string, unknown>> = []

  try {
    const onTrace = (event: DiscoveryTraceEvent) => {
      if (event.stage === 'search_queries_generated') {
        const queries = Array.isArray(event.data?.queries)
          ? event.data?.queries.filter((item): item is string => typeof item === 'string')
          : []
        queryCount = Number(event.data?.queryCount ?? queries.length)
        generatedQueries.splice(0, generatedQueries.length, ...queries)
      }

      if (event.stage === 'search_results_returned') {
        searchResultsCount = Number(event.data?.searchResultsCount ?? searchResultsCount)
      }

      if (event.stage === 'listings_extracted') {
        extractedOpportunitiesCount = Number(event.data?.extractedOpportunitiesCount ?? extractedOpportunitiesCount)
        categoryPagesSkipped = Number(event.data?.categoryPagesSkipped ?? categoryPagesSkipped)
        listingPagesFound = Number(event.data?.listingPagesFound ?? listingPagesFound)
        listingCardsExtracted = Number(event.data?.listingCardsExtracted ?? listingCardsExtracted)
        invalidTitlesRejected = Number(event.data?.invalid_titles_rejected ?? event.data?.invalidTitlesRejected ?? invalidTitlesRejected)
        invalidUrlsRejected = Number(event.data?.invalid_urls_rejected ?? event.data?.invalidUrlsRejected ?? invalidUrlsRejected)
        lowConfidenceRejected = Number(event.data?.low_confidence_rejected ?? event.data?.lowConfidenceRejected ?? lowConfidenceRejected)
        if (event.data?.portalMetrics && typeof event.data.portalMetrics === 'object') {
          portalMetrics = event.data.portalMetrics as Record<string, unknown>
        }
        validationRejections = Array.isArray(event.data?.validationRejections)
          ? event.data.validationRejections.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          : validationRejections
      }

      if (event.stage === 'raw_search_results') {
        rawSearchResults = Array.isArray(event.data?.rawSearchResults)
          ? event.data.rawSearchResults.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          : []
      }

      if (event.stage === 'page_classified') {
        const classification = String(event.data?.classification ?? '').trim()
        const url = String(event.data?.url ?? '').trim()
        if (url || classification) {
          pageClassifications.push({
            url,
            classification,
            cardsExtracted: Number(event.data?.cardsExtracted ?? 0),
          })
        }

        if (classification === 'category_page' || classification === 'search_results_page') {
          categoryPagesSkipped += Number(event.data?.skipped ? 1 : 0)
          listingCardsExtracted += Number(event.data?.cardsExtracted ?? 0)
        }

        if (classification === 'individual_listing') {
          listingPagesFound += 1
        }
      }

      if (event.stage === 'error') {
        const message = String(event.data?.message ?? '').trim()
        if (message.length > 0) {
          connectorErrors.push(message)
        }
      }

      console.log('[DISCOVERY TRACE]', {
        stage: event.stage,
        runId: run.id,
        sourceId: source.id,
        briefId: brief.id,
        ...(event.data ?? {}),
      })
    }

    onTrace({
      stage: 'connector_execution',
      data: {
        connectorName: connector.name,
        connectorType: connector.type,
      },
    })

    const fetchedRaw = await connector.fetchOpportunities({ organizationId, brief, source, onTrace })
    if (extractedOpportunitiesCount === 0) {
      extractedOpportunitiesCount = fetchedRaw.length
    }

    console.log('[DISCOVERY TRACE]', {
      stage: 'raw_opportunities_fetched',
      runId: run.id,
      sourceId: source.id,
      briefId: brief.id,
      fetchedCount: fetchedRaw.length,
    })

    const normalized = fetchedRaw.map((item) => normalizeRawOpportunity({
      ...item,
      organization_id: organizationId,
      source_id: source.id,
      connector_run_id: run.id,
    }))

    const { canonical, duplicates } = deduplicateRawOpportunities(normalized)
    console.log('[DISCOVERY TRACE]', {
      stage: 'opportunities_deduplicated',
      runId: run.id,
      sourceId: source.id,
      briefId: brief.id,
      canonicalCount: canonical.length,
      deduplicatedCount: duplicates.length,
    })

    const insertedRows = await repo.insertRawOpportunities([...canonical, ...duplicates])
    console.log('[DISCOVERY TRACE]', {
      stage: 'raw_opportunities_inserted',
      runId: run.id,
      sourceId: source.id,
      briefId: brief.id,
      insertedCount: insertedRows.length,
    })

    const canonicalRows = insertedRows.filter((row) => !row.is_duplicate)
    let matchedCount = 0
    let skippedByScoreCount = 0

    for (const row of canonicalRows) {
      if (!row.id) continue
      const evaluation = evaluateOpportunityMatch(brief, row)
      if (evaluation.isRejected) {
        skippedByScoreCount += 1
        rejectedMatches.push({
          raw_opportunity_id: row.id,
          title: row.title,
          source_url: row.source_url ?? '',
          city: row.city ?? '',
          price: row.price ?? null,
          property_type: row.property_type ?? '',
          match_score: evaluation.matchScore,
          rejection_reasons: evaluation.rejectionReasons,
          mismatch_reasons: evaluation.mismatchReasons,
          missing_data: evaluation.missingData,
        })
        continue
      }

      if (evaluation.matchScore < 45) {
        skippedByScoreCount += 1
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

    console.log('[DISCOVERY TRACE]', {
      stage: 'opportunities_matched',
      runId: run.id,
      sourceId: source.id,
      briefId: brief.id,
      matchedCount,
      skippedByScoreCount,
    })

    const skippedOpportunitiesCount = duplicates.length + skippedByScoreCount
    const traceMetadata = {
      source_count: context?.activeSourceCount ?? 1,
      query_count: queryCount,
      search_results_count: searchResultsCount,
      category_pages_skipped: categoryPagesSkipped,
      listing_pages_found: listingPagesFound,
      listing_cards_extracted: listingCardsExtracted,
      invalid_titles_rejected: invalidTitlesRejected,
      invalid_urls_rejected: invalidUrlsRejected,
      low_confidence_rejected: lowConfidenceRejected,
      portal_metrics: portalMetrics,
      raw_search_results: rawSearchResults,
      validation_rejections: validationRejections,
      rejected_matches: rejectedMatches,
      extracted_opportunities_count: extractedOpportunitiesCount,
      inserted_opportunities_count: insertedRows.length,
      matched_opportunities_count: matchedCount,
      skipped_opportunities_count: skippedOpportunitiesCount,
      errors: connectorErrors,
      generated_queries: generatedQueries,
      page_classifications: pageClassifications,
      brief_id: brief.id,
      brief_title: brief.title,
      source_id: source.id,
      source_name: source.name,
      source_type: source.type,
    }

    console.log('[DISCOVERY TRACE]', {
      stage: 'final_matches_saved',
      runId: run.id,
      ...traceMetadata,
    })

    await repo.finalizeRun(run.id, {
      status: duplicates.length > 0 ? 'partial' : 'succeeded',
      fetched: fetchedRaw.length,
      inserted: insertedRows.length,
      deduplicated: duplicates.length,
      matched: matchedCount,
      metadata: traceMetadata,
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

    console.error('[DISCOVERY TRACE]', {
      stage: 'connector_error',
      runId: run.id,
      sourceId: source.id,
      briefId: brief.id,
      error: message,
    })

    await repo.finalizeRun(run.id, {
      status: 'failed',
      fetched: 0,
      inserted: 0,
      deduplicated: 0,
      matched: 0,
      errorMessage: message,
      metadata: {
        source_count: context?.activeSourceCount ?? 1,
        query_count: 0,
        search_results_count: 0,
        category_pages_skipped: 0,
        listing_pages_found: 0,
        listing_cards_extracted: 0,
        invalid_titles_rejected: invalidTitlesRejected,
        invalid_urls_rejected: invalidUrlsRejected,
        low_confidence_rejected: lowConfidenceRejected,
        portal_metrics: {},
        raw_search_results: rawSearchResults,
        validation_rejections: validationRejections,
        rejected_matches: rejectedMatches,
        extracted_opportunities_count: 0,
        inserted_opportunities_count: 0,
        matched_opportunities_count: 0,
        skipped_opportunities_count: 0,
        errors: [message],
        generated_queries: [],
        page_classifications: [],
        brief_id: brief.id,
        brief_title: brief.title,
        source_id: source.id,
        source_name: source.name,
        source_type: source.type,
      },
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
