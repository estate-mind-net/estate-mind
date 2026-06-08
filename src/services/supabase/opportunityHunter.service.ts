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

export interface OpportunityHunterDashboardData {
  activeBriefs: InvestmentSearchBrief[]
  latestMatches: Array<OpportunityMatch & { raw: RawOpportunity | null }>
  topRanked: Array<OpportunityMatch & { raw: RawOpportunity | null }>
  lastDiscoveryStatus: SourceConnectorRun[]
  sourceHealth: Array<{
    source: OpportunitySource
    lastRun: SourceConnectorRun | null
    health: 'healthy' | 'degraded' | 'offline'
  }>
}

const toArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

const mapHealth = (run: SourceConnectorRun | null): 'healthy' | 'degraded' | 'offline' => {
  if (!run) return 'offline'
  if (run.status === 'failed') return 'offline'
  if (run.status === 'partial') return 'degraded'
  return 'healthy'
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
      return {
        source,
        lastRun,
        health: mapHealth(lastRun),
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
}

export const opportunityHunterService = new OpportunityHunterService()
