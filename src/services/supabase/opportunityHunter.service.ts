import { getSupabaseClient } from './client'
import type {
  InvestmentSearchBrief,
  OpportunitySource,
  OpportunityMatch,
  RawOpportunity,
  SourceConnectorRun,
  DiscoveryAlert,
} from '@/lib/types/opportunityHunter'

type BriefInput = Omit<InvestmentSearchBrief, 'id' | 'organization_id' | 'created_at' | 'updated_at'>

type BriefRow = InvestmentSearchBrief
type SourceRow = OpportunitySource
type MatchRow = OpportunityMatch
type RawRow = RawOpportunity
type RunRow = SourceConnectorRun
type AlertRow = DiscoveryAlert
type SourceHealthStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONFIGURATION_INCOMPLETE'

export type OpportunityHunterCleanupAction =
  | 'failed_runs'
  | 'rejected_raw_opportunities'
  | 'unmatched_raw_opportunities'
  | 'duplicate_demo_briefs'
  | 'all_demo_briefs'
  | 'all_test_data'
  | 'old_discovery_runs'
  | 'old_raw_opportunities'

export type OpportunityHunterCleanupPreview = Record<OpportunityHunterCleanupAction, number>

export interface OpportunityHunterDashboardData {
  activeBriefs: InvestmentSearchBrief[]
  latestMatches: Array<OpportunityMatch & { raw: RawOpportunity | null }>
  topRanked: Array<OpportunityMatch & { raw: RawOpportunity | null }>
  lastDiscoveryStatus: SourceConnectorRun[]
  sourceHealth: Array<{
    source: OpportunitySource
    lastRun: SourceConnectorRun | null
    health: SourceHealthStatus
    reason: string
  }>
}

export interface OpportunityHunterRunDetailData {
  run: SourceConnectorRun
  source: OpportunitySource | null
  brief: InvestmentSearchBrief | null
  extractedOpportunities: RawOpportunity[]
}

const toArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

const chunk = <T>(items: T[], size = 100): T[][] => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const isRejectedRawCandidate = (row: RawOpportunity): boolean => {
  const title = row.title.toLowerCase()
  const city = (row.city ?? '').trim().toLowerCase()
  const url = (row.source_url ?? '').toLowerCase()
  const rawPayload = row.raw_payload ?? {}
  const classification = typeof rawPayload.page_classification === 'string' ? rawPayload.page_classification : ''

  return /\b(agency|agencija|blog|cookie|privacy)\b/.test(title)
    || url.includes('/blog/')
    || city.length === 0
    || city === 'unknown city'
    || city === 'unknown'
    || row.price == null
    || row.price <= 0
    || !row.property_type
    || classification === 'category_page'
    || classification === 'search_results_page'
    || classification === 'agency_homepage'
    || classification === 'irrelevant'
}

const firstRunError = (run: SourceConnectorRun | null): string | null => {
  if (!run) return null
  const metadata = run.metadata ?? {}
  const errors = Array.isArray(metadata.errors)
    ? metadata.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  return errors[0] ?? run.error_message ?? null
}

const mapFailureReason = (run: SourceConnectorRun | null): string => {
  const metadata = run?.metadata ?? {}
  const code = typeof metadata.reason_code === 'string' ? metadata.reason_code : ''
  const message = firstRunError(run) ?? ''

  if (code === 'source_disabled') return 'Source disabled'
  if (code === 'source_skipped') return 'Source skipped because terms were not checked'
  if (code === 'source_skipped_no_active_briefs') return 'No active briefs available for discovery'
  if (message.includes('WEB_SEARCH_API_KEY')) {
    return message.includes('invalid') ? 'WEB_SEARCH_API_KEY invalid' : 'WEB_SEARCH_API_KEY missing'
  }
  if (/provider .*failed|tavily failed|serpapi failed/i.test(message)) {
    return 'Provider health check failed'
  }

  return message || 'Connector run failed'
}

const mapHealth = (source: OpportunitySource, run: SourceConnectorRun | null): { health: SourceHealthStatus; reason: string } => {
  if (!source.is_enabled) {
    return { health: 'OFFLINE', reason: 'Source disabled' }
  }

  if (!source.terms_checked) {
    return { health: 'CONFIGURATION_INCOMPLETE', reason: 'Terms & conditions have not been accepted.' }
  }

  if (!run) {
    return { health: 'OFFLINE', reason: 'No successful connector run yet' }
  }

  if (run.status === 'failed') {
    const metadata = run.metadata ?? {}
    const reasonCode = typeof metadata.reason_code === 'string' ? metadata.reason_code : ''
    if (reasonCode === 'source_disabled' || reasonCode === 'source_skipped' || reasonCode === 'source_skipped_no_active_briefs') {
      return { health: 'OFFLINE', reason: mapFailureReason(run) }
    }

    return { health: 'ERROR', reason: mapFailureReason(run) }
  }

  if (run.status === 'partial') {
    return { health: 'ONLINE', reason: 'Last connector run completed with warnings' }
  }

  return { health: 'ONLINE', reason: 'Last connector run succeeded' }
}

export class OpportunityHunterService {
  async listBriefs(organizationId: string): Promise<InvestmentSearchBrief[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('investment_search_briefs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return toArray(data as BriefRow[])
  }

  async getBrief(organizationId: string, briefId: string): Promise<InvestmentSearchBrief | null> {
    const client = getSupabaseClient()
    if (!client) return null

    const { data, error } = await client
      .from('investment_search_briefs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', briefId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as BriefRow | null) ?? null
  }

  async createBrief(organizationId: string, input: BriefInput): Promise<InvestmentSearchBrief> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('investment_search_briefs')
      .insert([{ ...input, organization_id: organizationId }])
      .select('*')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create brief.')
    return data as BriefRow
  }

  async updateBrief(organizationId: string, briefId: string, input: Partial<BriefInput>): Promise<InvestmentSearchBrief> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('investment_search_briefs')
      .update(input)
      .eq('organization_id', organizationId)
      .eq('id', briefId)
      .select('*')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to update brief.')
    return data as BriefRow
  }

  async listSources(organizationId: string): Promise<OpportunitySource[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('opportunity_sources')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return toArray(data as SourceRow[])
  }

  async createSource(organizationId: string, input: Omit<OpportunitySource, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'last_run_at'>): Promise<OpportunitySource> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('opportunity_sources')
      .insert([{ ...input, organization_id: organizationId }])
      .select('*')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create source.')
    return data as SourceRow
  }

  async updateSource(
    organizationId: string,
    sourceId: string,
    input: Partial<Omit<OpportunitySource, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'last_run_at'>>,
  ): Promise<OpportunitySource> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('opportunity_sources')
      .update(input)
      .eq('organization_id', organizationId)
      .eq('id', sourceId)
      .select('*')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to update source.')
    return data as SourceRow
  }

  async deleteSearchBrief(organizationId: string, id: string): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('investment_search_briefs')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('id')

    if (error) throw new Error(error.message)
    return toArray(data as Array<{ id: string }>).length
  }

  async deleteSource(organizationId: string, id: string): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('opportunity_sources')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('id')

    if (error) throw new Error(error.message)
    return toArray(data as Array<{ id: string }>).length
  }

  async deleteDiscoveryRun(organizationId: string, id: string): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('source_connector_runs')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('id')

    if (error) throw new Error(error.message)
    return toArray(data as Array<{ id: string }>).length
  }

  async deleteRawOpportunity(organizationId: string, id: string): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('raw_opportunities')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('id')

    if (error) throw new Error(error.message)
    return toArray(data as Array<{ id: string }>).length
  }

  async deleteOpportunityMatch(organizationId: string, id: string): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('opportunity_matches')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('id')

    if (error) throw new Error(error.message)
    return toArray(data as Array<{ id: string }>).length
  }

  private async countRows(table: string, organizationId: string, apply?: (query: any) => any): Promise<number> {
    const client = getSupabaseClient()
    if (!client) return 0

    let query = client.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
    if (apply) query = apply(query)
    const { count, error } = await query
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  private async deleteRows(table: string, organizationId: string, apply?: (query: any) => any): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    let query = client.from(table).delete().eq('organization_id', organizationId).select('id')
    if (apply) query = apply(query)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return toArray(data as Array<{ id: string }>).length
  }

  private async getMatchedRawIds(organizationId: string): Promise<Set<string>> {
    const client = getSupabaseClient()
    if (!client) return new Set()

    const { data, error } = await client
      .from('opportunity_matches')
      .select('raw_opportunity_id')
      .eq('organization_id', organizationId)

    if (error) throw new Error(error.message)
    return new Set(toArray(data as Array<{ raw_opportunity_id: string }>).map((row) => row.raw_opportunity_id).filter(Boolean))
  }

  private async deleteRawOpportunityIds(organizationId: string, ids: string[]): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')
    if (ids.length === 0) return 0

    let deleted = 0
    for (const idsChunk of chunk(ids)) {
      const { data, error } = await client
        .from('raw_opportunities')
        .delete()
        .eq('organization_id', organizationId)
        .in('id', idsChunk)
        .select('id')

      if (error) throw new Error(error.message)
      deleted += toArray(data as Array<{ id: string }>).length
    }

    return deleted
  }

  private async listRawOpportunitiesForCleanup(organizationId: string): Promise<RawOpportunity[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('raw_opportunities')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) throw new Error(error.message)
    return toArray(data as RawRow[])
  }

  private async getRejectedRawOpportunityIds(organizationId: string): Promise<string[]> {
    const [rawRows, matchedIds] = await Promise.all([
      this.listRawOpportunitiesForCleanup(organizationId),
      this.getMatchedRawIds(organizationId),
    ])

    return rawRows
      .filter((row) => row.id && !matchedIds.has(row.id) && isRejectedRawCandidate(row))
      .map((row) => row.id as string)
  }

  private async getUnmatchedRawOpportunityIds(organizationId: string): Promise<string[]> {
    const [rawRows, matchedIds] = await Promise.all([
      this.listRawOpportunitiesForCleanup(organizationId),
      this.getMatchedRawIds(organizationId),
    ])

    return rawRows
      .filter((row) => row.id && !matchedIds.has(row.id))
      .map((row) => row.id as string)
  }

  private async getDuplicateDemoBriefIds(organizationId: string): Promise<string[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('investment_search_briefs')
      .select('id,title,created_at')
      .eq('organization_id', organizationId)
      .ilike('title', 'Demo:%')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    const seen = new Set<string>()
    const duplicateIds: string[] = []
    for (const row of toArray(data as Array<{ id: string; title: string }>)) {
      const key = row.title.trim().toLowerCase()
      if (seen.has(key)) duplicateIds.push(row.id)
      seen.add(key)
    }
    return duplicateIds
  }

  private async deleteBriefIds(organizationId: string, ids: string[]): Promise<number> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')
    if (ids.length === 0) return 0

    let deleted = 0
    for (const idsChunk of chunk(ids)) {
      const { data, error } = await client
        .from('investment_search_briefs')
        .delete()
        .eq('organization_id', organizationId)
        .in('id', idsChunk)
        .select('id')
      if (error) throw new Error(error.message)
      deleted += toArray(data as Array<{ id: string }>).length
    }
    return deleted
  }

  async cleanupFailedRuns(organizationId: string): Promise<number> {
    return this.deleteRows('source_connector_runs', organizationId, (query) => query.eq('status', 'failed'))
  }

  async cleanupRejectedRawOpportunities(organizationId: string): Promise<number> {
    return this.deleteRawOpportunityIds(organizationId, await this.getRejectedRawOpportunityIds(organizationId))
  }

  async cleanupUnmatchedRawOpportunities(organizationId: string): Promise<number> {
    return this.deleteRawOpportunityIds(organizationId, await this.getUnmatchedRawOpportunityIds(organizationId))
  }

  async cleanupDuplicateDemoBriefs(organizationId: string): Promise<number> {
    return this.deleteBriefIds(organizationId, await this.getDuplicateDemoBriefIds(organizationId))
  }

  async cleanupAllDemoBriefs(organizationId: string): Promise<number> {
    return this.deleteRows('investment_search_briefs', organizationId, (query) => query.ilike('title', 'Demo:%'))
  }

  async cleanupOldDiscoveryRuns(organizationId: string, days: number): Promise<number> {
    const cutoff = new Date(Date.now() - Math.max(0, days) * 24 * 60 * 60 * 1000).toISOString()
    return this.deleteRows('source_connector_runs', organizationId, (query) => query.lt('started_at', cutoff))
  }

  async cleanupOldRawOpportunities(organizationId: string, days: number): Promise<number> {
    const cutoff = new Date(Date.now() - Math.max(0, days) * 24 * 60 * 60 * 1000).toISOString()
    return this.deleteRows('raw_opportunities', organizationId, (query) => query.lt('created_at', cutoff))
  }

  async cleanupAllOpportunityHunterTestData(organizationId: string): Promise<number> {
    const deletedMatches = await this.deleteRows('opportunity_matches', organizationId)
    const deletedAlerts = await this.deleteRows('discovery_alerts', organizationId)
    const deletedRaw = await this.deleteRows('raw_opportunities', organizationId)
    const deletedRuns = await this.deleteRows('source_connector_runs', organizationId)
    const deletedDemoBriefs = await this.cleanupAllDemoBriefs(organizationId)
    return deletedMatches + deletedAlerts + deletedRaw + deletedRuns + deletedDemoBriefs
  }

  async previewCleanupCounts(organizationId: string, days: number): Promise<OpportunityHunterCleanupPreview> {
    const cutoff = new Date(Date.now() - Math.max(0, days) * 24 * 60 * 60 * 1000).toISOString()
    const [
      failedRuns,
      rejectedRawIds,
      unmatchedRawIds,
      duplicateDemoIds,
      allDemoBriefs,
      oldRuns,
      oldRaw,
      matches,
      alerts,
      raw,
      runs,
    ] = await Promise.all([
      this.countRows('source_connector_runs', organizationId, (query) => query.eq('status', 'failed')),
      this.getRejectedRawOpportunityIds(organizationId),
      this.getUnmatchedRawOpportunityIds(organizationId),
      this.getDuplicateDemoBriefIds(organizationId),
      this.countRows('investment_search_briefs', organizationId, (query) => query.ilike('title', 'Demo:%')),
      this.countRows('source_connector_runs', organizationId, (query) => query.lt('started_at', cutoff)),
      this.countRows('raw_opportunities', organizationId, (query) => query.lt('created_at', cutoff)),
      this.countRows('opportunity_matches', organizationId),
      this.countRows('discovery_alerts', organizationId),
      this.countRows('raw_opportunities', organizationId),
      this.countRows('source_connector_runs', organizationId),
    ])

    return {
      failed_runs: failedRuns,
      rejected_raw_opportunities: rejectedRawIds.length,
      unmatched_raw_opportunities: unmatchedRawIds.length,
      duplicate_demo_briefs: duplicateDemoIds.length,
      all_demo_briefs: allDemoBriefs,
      all_test_data: matches + alerts + raw + runs + allDemoBriefs,
      old_discovery_runs: oldRuns,
      old_raw_opportunities: oldRaw,
    }
  }

  async listBriefMatches(organizationId: string, briefId: string): Promise<Array<OpportunityMatch & { raw: RawOpportunity | null }>> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data: matchesData, error: matchError } = await client
      .from('opportunity_matches')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('brief_id', briefId)
      .order('rank_score', { ascending: false })

    if (matchError) throw new Error(matchError.message)

    const matches = toArray(matchesData as MatchRow[])
    const rawIds = matches.map((row) => row.raw_opportunity_id)

    if (rawIds.length === 0) return []

    const { data: rawData, error: rawError } = await client
      .from('raw_opportunities')
      .select('*')
      .eq('organization_id', organizationId)
      .in('id', rawIds)

    if (rawError) throw new Error(rawError.message)

    const rawById = new Map(toArray(rawData as RawRow[]).map((row) => [row.id ?? '', row]))

    return matches.map((match) => ({
      ...match,
      raw: rawById.get(match.raw_opportunity_id) ?? null,
    }))
  }

  async listAlerts(organizationId: string, limit = 20): Promise<DiscoveryAlert[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('discovery_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return toArray(data as AlertRow[])
  }

  async getDashboardData(organizationId: string): Promise<OpportunityHunterDashboardData> {
    const client = getSupabaseClient()
    if (!client) {
      return {
        activeBriefs: [],
        latestMatches: [],
        topRanked: [],
        lastDiscoveryStatus: [],
        sourceHealth: [],
      }
    }

    const [briefs, sources, runs, latestMatches] = await Promise.all([
      this.listBriefs(organizationId),
      this.listSources(organizationId),
      client
        .from('source_connector_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(25),
      client
        .from('opportunity_matches')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (runs.error) throw new Error(runs.error.message)
    if (latestMatches.error) throw new Error(latestMatches.error.message)

    const runRows = toArray(runs.data as RunRow[])
    const activeBriefs = briefs.filter((row) => row.is_active)

    const matchRows = toArray(latestMatches.data as MatchRow[])
    const rawIds = matchRows.map((row) => row.raw_opportunity_id)

    let rawById = new Map<string, RawOpportunity>()
    if (rawIds.length > 0) {
      const rawResult = await client
        .from('raw_opportunities')
        .select('*')
        .eq('organization_id', organizationId)
        .in('id', rawIds)

      if (rawResult.error) throw new Error(rawResult.error.message)
      rawById = new Map(toArray(rawResult.data as RawRow[]).map((row) => [row.id ?? '', row]))
    }

    const hydratedMatches = matchRows.map((match) => ({
      ...match,
      raw: rawById.get(match.raw_opportunity_id) ?? null,
    }))

    const topRanked = [...hydratedMatches]
      .sort((a, b) => b.rank_score - a.rank_score)
      .slice(0, 10)

    const lastRunBySource = new Map<string, RunRow>()
    for (const run of runRows) {
      if (run.source_id && !lastRunBySource.has(run.source_id)) {
        lastRunBySource.set(run.source_id, run)
      }
    }

    const sourceHealth = sources.map((source) => {
      const lastRun = lastRunBySource.get(source.id) ?? null
      const { health, reason } = mapHealth(source, lastRun)
      return {
        source,
        lastRun,
        health,
        reason,
      }
    })

    return {
      activeBriefs,
      latestMatches: hydratedMatches,
      topRanked,
      lastDiscoveryStatus: runRows.slice(0, 8),
      sourceHealth,
    }
  }

  async getDiscoveryRunDetail(organizationId: string, runId: string): Promise<OpportunityHunterRunDetailData | null> {
    const client = getSupabaseClient()
    if (!client) return null

    const { data: runData, error: runError } = await client
      .from('source_connector_runs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', runId)
      .maybeSingle()

    if (runError) throw new Error(runError.message)
    const run = (runData as RunRow | null) ?? null
    if (!run) return null

    const [sourceResult, briefResult] = await Promise.all([
      run.source_id
        ? client
          .from('opportunity_sources')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', run.source_id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      run.brief_id
        ? client
          .from('investment_search_briefs')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', run.brief_id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

      const extractedResult = await client
        .from('raw_opportunities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('connector_run_id', runId)
        .order('created_at', { ascending: true })

    if (sourceResult.error) throw new Error(sourceResult.error.message)
    if (briefResult.error) throw new Error(briefResult.error.message)
      if (extractedResult.error) throw new Error(extractedResult.error.message)

    return {
      run,
      source: (sourceResult.data as SourceRow | null) ?? null,
      brief: (briefResult.data as BriefRow | null) ?? null,
        extractedOpportunities: toArray(extractedResult.data as RawRow[]),
    }
  }
}

export const opportunityHunterService = new OpportunityHunterService()
