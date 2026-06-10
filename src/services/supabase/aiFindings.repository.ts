import type { AiFinding, AiFindingCreateInput, AiFindingUpdateInput } from '@/lib/types'
import { getSupabaseClient } from './client'

export interface AiFindingsRepository {
  listByOpportunity(organizationId: string, opportunityId: string): Promise<AiFinding[]>
  getById(organizationId: string, findingId: string): Promise<AiFinding | null>
  create(input: AiFindingCreateInput): Promise<AiFinding>
  update(organizationId: string, findingId: string, input: AiFindingUpdateInput): Promise<AiFinding>
  delete(organizationId: string, findingId: string): Promise<boolean>
}

export class SupabaseAiFindingsRepository implements AiFindingsRepository {
  private readonly tableName = 'ai_findings'

  async listByOpportunity(organizationId: string, opportunityId: string): Promise<AiFinding[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as AiFinding[]
  }

  async getById(organizationId: string, findingId: string): Promise<AiFinding | null> {
    const client = getSupabaseClient()
    if (!client) return null

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', findingId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data as AiFinding | null) ?? null
  }

  async create(input: AiFindingCreateInput): Promise<AiFinding> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const payload: AiFindingCreateInput = {
      ...input,
      metadata: input.metadata ?? {},
    }

    const { data, error } = await client
      .from(this.tableName)
      .insert([payload])
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create AI finding.')
    }

    return data as AiFinding
  }

  async update(organizationId: string, findingId: string, input: AiFindingUpdateInput): Promise<AiFinding> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from(this.tableName)
      .update(input)
      .eq('organization_id', organizationId)
      .eq('id', findingId)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update AI finding.')
    }

    return data as AiFinding
  }

  async delete(organizationId: string, findingId: string): Promise<boolean> {
    const client = getSupabaseClient()
    if (!client) return false

    const { error } = await client
      .from(this.tableName)
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', findingId)

    if (error) {
      throw new Error(error.message)
    }

    return true
  }
}
