import type { OpportunityModuleType } from '../types'
import { getSupabaseClient } from '@/services/supabase/client'
import { requireDataContext, type DataContext } from '../auth/ContextValidation'
export type { DataContext } from '../auth/ContextValidation'

export interface DeleteResult {
  opportunitiesRemoved: number
  matchesRemoved: number
  rawOpportunitiesRemoved: number
  sourcesRemoved: number
  briefsRemoved: number
  notesRemoved: number
  findingsRemoved: number
  propertiesRemoved: number
  skipped: string[]
  errors: string[]
}

export interface StorageSummary {
  searchSources: number
  opportunities: number
  aiReports: number
  lastImport: string | null
}

function emptyResult(errors: string[] = []): DeleteResult {
  return { opportunitiesRemoved: 0, matchesRemoved: 0, rawOpportunitiesRemoved: 0, sourcesRemoved: 0, briefsRemoved: 0, notesRemoved: 0, findingsRemoved: 0, propertiesRemoved: 0, skipped: [], errors }
}

export async function getStorageSummary(context: DataContext): Promise<StorageSummary> {
  requireDataContext(context)
  const supabase = getSupabaseClient()
  if (!supabase) return { searchSources: 0, opportunities: 0, aiReports: 0, lastImport: null }
  try {
    const [oppResult] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    ])
    return { searchSources: 0, opportunities: oppResult.count ?? 0, aiReports: 0, lastImport: null }
  } catch { return { searchSources: 0, opportunities: 0, aiReports: 0, lastImport: null } }
}

export async function countOpportunities(context: DataContext): Promise<number> {
  requireDataContext(context)
  const supabase = getSupabaseClient()
  if (!supabase) return 0
  try { const { count } = await supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId); return count ?? 0 } catch { return 0 }
}
export async function deleteOpportunity(opportunityId: string, context: DataContext): Promise<DeleteResult> {
  requireDataContext(context)
  const supabase = getSupabaseClient()
  if (!supabase) return emptyResult(['Supabase unavailable'])
  const result = emptyResult()
  try {
    try { await supabase.from('notes').delete().eq('opportunity_id', opportunityId).eq('organization_id', context.organizationId); result.notesRemoved++ } catch { result.skipped.push('notes') }
    try { await supabase.from('ai_findings').delete().eq('opportunity_id', opportunityId).eq('organization_id', context.organizationId); result.findingsRemoved++ } catch { result.skipped.push('ai_findings') }
    const { error } = await supabase.from('opportunities').delete().eq('id', opportunityId).eq('organization_id', context.organizationId)
    if (error) throw error
    result.opportunitiesRemoved = 1
  } catch (e) { result.errors.push(e instanceof Error ? e.message : 'Delete failed') }
  return result
}

export async function clearModuleData(moduleType: OpportunityModuleType, context: DataContext): Promise<DeleteResult> {
  requireDataContext(context)
  const supabase = getSupabaseClient()
  if (!supabase) return emptyResult(['Supabase unavailable'])
  const result = emptyResult()

  try {
    // 1. Delete opportunity_matches via briefs
    try {
      const { data: briefs } = await supabase.from('investment_search_briefs').select('id').eq('organization_id', context.organizationId).limit(1000)
      const briefIds = (briefs ?? []).map((b: { id: string }) => b.id)
      if (briefIds.length > 0) {
        const { count } = await supabase.from('opportunity_matches').delete().eq('organization_id', context.organizationId).in('brief_id', briefIds).select('id', { count: 'exact', head: true })
        result.matchesRemoved = count ?? 0
      }
    } catch { result.skipped.push('opportunity_matches') }

    // 2. Delete raw_opportunities
    try {
      const { count } = await supabase.from('raw_opportunities').delete().eq('organization_id', context.organizationId).select('id', { count: 'exact', head: true })
      result.rawOpportunitiesRemoved = count ?? 0
    } catch { result.skipped.push('raw_opportunities') }

    // 3. Get opportunity IDs for linked record deletion
    const { data: opps } = await supabase.from('opportunities').select('id').eq('organization_id', context.organizationId).limit(1000)
    const oppIds = (opps ?? []).map((o: { id: string }) => o.id)

    // 4. Delete notes and ai_findings
    if (oppIds.length > 0) {
      try { await supabase.from('notes').delete().eq('organization_id', context.organizationId).in('opportunity_id', oppIds) } catch { result.skipped.push('notes') }
      try { await supabase.from('ai_findings').delete().eq('organization_id', context.organizationId).in('opportunity_id', oppIds) } catch { result.skipped.push('ai_findings') }
    }

    // 5. Delete opportunities
    const { count: oppCount } = await supabase.from('opportunities').delete().eq('organization_id', context.organizationId).select('id', { count: 'exact', head: true })
    result.opportunitiesRemoved = oppCount ?? 0

    // 6. Delete orphaned properties
    const { data: remainingOpps } = await supabase.from('opportunities').select('property_id').eq('organization_id', context.organizationId).limit(10000)
    const remainingPropIds = new Set((remainingOpps ?? []).map((o: { property_id: string }) => o.property_id))
    const { data: allProps } = await supabase.from('properties').select('id').eq('organization_id', context.organizationId).limit(10000)
    const orphanIds = (allProps ?? []).map((p: { id: string }) => p.id).filter((id: string) => !remainingPropIds.has(id))
    if (orphanIds.length > 0) {
      await supabase.from('properties').delete().eq('organization_id', context.organizationId).in('id', orphanIds)
      result.propertiesRemoved = orphanIds.length
    }

    // 7. Delete opportunity_sources
    try {
      const { count } = await supabase.from('opportunity_sources').delete().eq('organization_id', context.organizationId).select('id', { count: 'exact', head: true })
      result.sourcesRemoved = count ?? 0
    } catch { result.skipped.push('opportunity_sources') }

    // 8. Delete investment_search_briefs
    try {
      const { count } = await supabase.from('investment_search_briefs').delete().eq('organization_id', context.organizationId).select('id', { count: 'exact', head: true })
      result.briefsRemoved = count ?? 0
    } catch { result.skipped.push('investment_search_briefs') }

  } catch (e) { result.errors.push(e instanceof Error ? e.message : 'Clear failed') }
  return result
}

export async function clearAllTestData(context: DataContext): Promise<DeleteResult> {
  return clearModuleData('rent', context)
}