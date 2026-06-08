import { createClient } from '@supabase/supabase-js'
import { runDiscoveryForBriefAndSource, type DiscoveryRepository } from '../../services/opportunityHunter/discovery.service'
import type { InvestmentSearchBrief, OpportunitySource, RawOpportunity } from '../types/opportunityHunter'

export type DiscoveryRunRequestPayload = {
  mode?: 'manual' | 'nightly'
  organizationId?: string
}

export type DiscoveryRunSuccessResponse = {
  success: true
  message: string
  matchesFound: number
  summary: {
    organizationId: string
    mode: 'manual' | 'nightly'
    totalRuns: number
    totalFetched: number
    totalInserted: number
    totalDeduplicated: number
    totalMatched: number
    failedRuns: number
  }
  results: Array<Record<string, unknown>>
}

export type DiscoveryRunErrorResponse = {
  success: false
  error: string
  stack?: string
}

export type DiscoveryRunApiResponse = DiscoveryRunSuccessResponse | DiscoveryRunErrorResponse

const isDevelopment = (): boolean => {
  return process.env.NODE_ENV !== 'production'
}

const parsePayload = (payload: unknown): DiscoveryRunRequestPayload => {
  if (!payload) return {}
  if (typeof payload === 'object') return payload as DiscoveryRunRequestPayload
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as DiscoveryRunRequestPayload
    } catch {
      return {}
    }
  }
  return {}
}

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error('Supabase service credentials are missing for discovery runner.')
  }

  return createClient(url, serviceRole)
}

const mapRawPayload = (item: RawOpportunity) => ({
  organization_id: item.organization_id,
  source_id: item.source_id,
  connector_run_id: item.connector_run_id,
  external_id: item.external_id ?? null,
  source_url: item.source_url ?? null,
  title: item.title,
  description: item.description ?? null,
  country: item.country ?? null,
  city: item.city ?? null,
  district: item.district ?? null,
  price: item.price ?? null,
  currency: item.currency ?? null,
  size_m2: item.size_m2 ?? null,
  bedrooms: item.bedrooms ?? null,
  property_type: item.property_type ?? null,
  raw_payload: item.raw_payload ?? {},
  normalized_payload: item.normalized_payload ?? {},
  dedupe_key: item.dedupe_key ?? null,
  is_duplicate: Boolean(item.is_duplicate),
  canonical_raw_opportunity_id: item.canonical_raw_opportunity_id ?? null,
  discovered_at: item.discovered_at ?? new Date().toISOString(),
})

const buildRepository = (): DiscoveryRepository => {
  const supabase = getAdminClient()

  return {
    async createRun(input) {
      const { data, error } = await supabase
        .from('source_connector_runs')
        .insert([{
          organization_id: input.organizationId,
          source_id: input.sourceId,
          brief_id: input.briefId,
          connector_name: input.connectorName,
          connector_type: input.connectorType,
          status: 'running',
        }])
        .select('id')
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to create source connector run.')
      }

      return { id: (data as { id: string }).id }
    },

    async finalizeRun(runId, input) {
      const { error } = await supabase
        .from('source_connector_runs')
        .update({
          status: input.status,
          completed_at: new Date().toISOString(),
          opportunities_fetched: input.fetched,
          opportunities_inserted: input.inserted,
          opportunities_deduplicated: input.deduplicated,
          opportunities_matched: input.matched,
          error_message: input.errorMessage ?? null,
        })
        .eq('id', runId)

      if (error) throw new Error(error.message)
    },

    async insertRawOpportunities(items) {
      if (items.length === 0) return []

      const organizationId = items[0]?.organization_id
      const sourceUrls = [...new Set(items.map((item) => item.source_url).filter((value): value is string => typeof value === 'string' && value.length > 0))]
      const dedupeKeys = [...new Set(items.map((item) => item.dedupe_key).filter((value): value is string => typeof value === 'string' && value.length > 0))]

      const sourceIdGroups = new Map<string, string[]>()
      for (const item of items) {
        if (!item.source_id || !item.external_id) continue
        const bucket = sourceIdGroups.get(item.source_id) ?? []
        bucket.push(item.external_id)
        sourceIdGroups.set(item.source_id, bucket)
      }

      const existingIds = new Set<string>()

      if (organizationId && sourceUrls.length > 0) {
        const existingByUrl = await supabase
          .from('raw_opportunities')
          .select('id,source_url')
          .eq('organization_id', organizationId)
          .in('source_url', sourceUrls)

        if (existingByUrl.error) throw new Error(existingByUrl.error.message)
        for (const row of existingByUrl.data ?? []) {
          existingIds.add((row as { source_url?: string }).source_url ?? '')
        }
      }

      if (organizationId && dedupeKeys.length > 0) {
        const existingByDedupe = await supabase
          .from('raw_opportunities')
          .select('id,dedupe_key')
          .eq('organization_id', organizationId)
          .in('dedupe_key', dedupeKeys)

        if (existingByDedupe.error) throw new Error(existingByDedupe.error.message)
        for (const row of existingByDedupe.data ?? []) {
          existingIds.add((row as { dedupe_key?: string }).dedupe_key ?? '')
        }
      }

      const existingExternal = new Set<string>()
      if (organizationId && sourceIdGroups.size > 0) {
        for (const [sourceId, externalIds] of sourceIdGroups.entries()) {
          const uniqueExternalIds = [...new Set(externalIds)]
          if (uniqueExternalIds.length === 0) continue

          const existingByExternal = await supabase
            .from('raw_opportunities')
            .select('id,external_id')
            .eq('organization_id', organizationId)
            .eq('source_id', sourceId)
            .in('external_id', uniqueExternalIds)

          if (existingByExternal.error) throw new Error(existingByExternal.error.message)
          for (const row of existingByExternal.data ?? []) {
            existingExternal.add(`${sourceId}:${(row as { external_id?: string }).external_id ?? ''}`)
          }
        }
      }

      const toInsert = items.filter((item) => {
        const byUrl = item.source_url ? existingIds.has(item.source_url) : false
        const byDedupe = item.dedupe_key ? existingIds.has(item.dedupe_key) : false
        const byExternal = item.source_id && item.external_id
          ? existingExternal.has(`${item.source_id}:${item.external_id}`)
          : false
        return !byUrl && !byDedupe && !byExternal
      })

      if (toInsert.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('raw_opportunities')
        .insert(toInsert.map(mapRawPayload))
        .select('*')

      if (error) throw new Error(error.message)
      return (data ?? []) as RawOpportunity[]
    },

    async upsertMatch(input) {
      const { error } = await supabase
        .from('opportunity_matches')
        .upsert({
          organization_id: input.organizationId,
          brief_id: input.briefId,
          raw_opportunity_id: input.rawOpportunityId,
          source_id: input.sourceId,
          match_score: input.matchScore,
          match_reasons: input.matchReasons,
          mismatch_reasons: input.mismatchReasons,
          missing_data: input.missingData,
          suggested_next_step: input.suggestedNextStep,
          rank_score: input.rankScore,
          is_top_match: input.isTopMatch,
          ai_analysis: input.aiAnalysis ?? null,
          ai_investment_score: input.aiInvestmentScore ?? null,
          recommendation: input.recommendation ?? null,
        }, { onConflict: 'brief_id,raw_opportunity_id' })

      if (error) throw new Error(error.message)
    },

    async createAlert(input) {
      const { error } = await supabase
        .from('discovery_alerts')
        .insert([{
          organization_id: input.organizationId,
          brief_id: input.briefId ?? null,
          raw_opportunity_id: input.rawOpportunityId ?? null,
          alert_type: input.alertType,
          title: input.title,
          message: input.message,
          severity: input.severity,
          metadata: input.metadata ?? {},
        }])

      if (error) throw new Error(error.message)
    },
  }
}

const loadOrganizationsToRun = async (organizationId?: string): Promise<string[]> => {
  const supabase = getAdminClient()

  if (organizationId) return [organizationId]

  const { data, error } = await supabase
    .from('investment_search_briefs')
    .select('organization_id')
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  const unique = new Set<string>()
  for (const row of data ?? []) {
    const org = (row as { organization_id?: string }).organization_id
    if (org) unique.add(org)
  }

  return [...unique]
}

const loadDiscoveryInputs = async (organizationId: string): Promise<{
  briefs: InvestmentSearchBrief[]
  sources: OpportunitySource[]
}> => {
  const supabase = getAdminClient()

  const [briefsRes, sourcesRes] = await Promise.all([
    supabase
      .from('investment_search_briefs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('opportunity_sources')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .eq('terms_checked', true),
  ])

  if (briefsRes.error) throw new Error(briefsRes.error.message)
  if (sourcesRes.error) throw new Error(sourcesRes.error.message)

  return {
    briefs: (briefsRes.data ?? []) as InvestmentSearchBrief[],
    sources: (sourcesRes.data ?? []) as OpportunitySource[],
  }
}

const formatError = (error: unknown): DiscoveryRunErrorResponse => {
  const normalized = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Discovery run failed.')
  console.error('[DISCOVERY ERROR]', error)

  return {
    success: false,
    error: normalized.message,
    ...(isDevelopment() ? { stack: normalized.stack ?? '' } : {}),
  }
}

export async function executeDiscoveryRun(payloadInput: unknown): Promise<DiscoveryRunSuccessResponse> {
  const payload = parsePayload(payloadInput)
  const mode = payload.mode ?? 'manual'
  const organizations = await loadOrganizationsToRun(payload.organizationId)

  const repo = buildRepository()
  const results: Array<Record<string, unknown>> = []

  console.log('[DISCOVERY CONFIG]', {
    mode,
    organizationId: payload.organizationId ?? 'all',
    activeOrganizations: organizations.length,
  })

  for (const organizationId of organizations) {
    const { briefs, sources } = await loadDiscoveryInputs(organizationId)

    console.log('[DISCOVERY CONFIG]', {
      organizationId,
      activeBriefs: briefs.length,
      activeSources: sources.length,
    })

    for (const source of sources) {
      const sourceType = source.type
      const provider = source.connector_config && typeof source.connector_config === 'object' && 'provider' in source.connector_config
        ? String((source.connector_config as Record<string, unknown>).provider ?? 'default')
        : 'default'

      console.log('[DISCOVERY CONFIG]', {
        organizationId,
        sourceId: source.id,
        sourceName: source.name,
        sourceType,
        provider,
      })
    }

    for (const brief of briefs) {
      for (const source of sources) {
        const result = await runDiscoveryForBriefAndSource(repo, organizationId, brief, source)
        results.push({ organizationId, briefId: brief.id, ...result })
      }
    }

    await repo.createAlert({
      organizationId,
      briefId: briefs[0]?.id,
      alertType: 'discovery_run',
      title: mode === 'nightly' ? 'Nightly discovery completed' : 'Manual discovery completed',
      message: `Discovery processed ${briefs.length} active briefs and ${sources.length} enabled sources.`,
      severity: 'info',
      metadata: {
        mode,
        briefs: briefs.length,
        sources: sources.length,
      },
    })
  }

  const summary = {
    organizationId: payload.organizationId ?? 'all',
    mode,
    totalRuns: results.length,
    totalFetched: results.reduce((sum, row) => sum + Number(row.fetched ?? 0), 0),
    totalInserted: results.reduce((sum, row) => sum + Number(row.inserted ?? 0), 0),
    totalDeduplicated: results.reduce((sum, row) => sum + Number(row.deduplicated ?? 0), 0),
    totalMatched: results.reduce((sum, row) => sum + Number(row.matched ?? 0), 0),
    failedRuns: results.filter((row) => Boolean(row.failedReason)).length,
  }

  return {
    success: true,
    message: mode === 'nightly' ? 'Nightly discovery run completed.' : 'Discovery run completed.',
    matchesFound: summary.totalMatched,
    summary,
    results,
  }
}

export async function handleDiscoveryRunHttp(method: string | undefined, payloadInput: unknown): Promise<{ status: number; body: DiscoveryRunApiResponse }> {
  if (method !== 'POST') {
    return {
      status: 405,
      body: {
        success: false,
        error: 'Method not allowed.',
      },
    }
  }

  try {
    const body = await executeDiscoveryRun(payloadInput)

    if (body.summary.totalRuns > 0 && body.summary.failedRuns === body.summary.totalRuns) {
      const firstFailure = body.results
        .map((row) => {
          const value = (row as { failedReason?: unknown }).failedReason
          return typeof value === 'string' ? value : null
        })
        .find((value): value is string => Boolean(value && value.length > 0))

      if (firstFailure) {
        return {
          status: 422,
          body: {
            success: false,
            error: firstFailure,
          },
        }
      }
    }

    return {
      status: 200,
      body,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discovery run failed.'

    return {
      status: 500,
      body: formatError(error),
    }
  }
}
