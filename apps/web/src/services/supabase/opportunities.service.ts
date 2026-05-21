import type { Opportunity } from '@/lib/types'
import { getSupabaseClient } from './client'
import { mockOpportunities } from '@/lib/mockData'

export interface OpportunityFilters {
  status?: string[]
  country?: string[]
  minScore?: number
  maxScore?: number
  search?: string
}

export interface OpportunityUpdate {
  status?: string
  notes?: string
  tags?: string[]
  isFavorite?: boolean
  isArchived?: boolean
}

export class OpportunitiesService {
  private tableName = 'opportunities'

  async getAll(filters?: OpportunityFilters): Promise<Opportunity[]> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.getMockOpportunities(filters)
    }

    try {
      let query = client.from(this.tableName).select('*')

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.country && filters.country.length > 0) {
        query = query.in('country', filters.country)
      }

      if (filters?.minScore !== undefined) {
        query = query.gte('score', filters.minScore)
      }

      if (filters?.maxScore !== undefined) {
        query = query.lte('score', filters.maxScore)
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      query = query.order('updated_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching opportunities:', error)
        return this.getMockOpportunities(filters)
      }

      return data as Opportunity[]
    } catch (error) {
      console.error('Unexpected error fetching opportunities:', error)
      return this.getMockOpportunities(filters)
    }
  }

  async getById(id: string): Promise<Opportunity | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.getMockOpportunityById(id)
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching opportunity:', error)
        return this.getMockOpportunityById(id)
      }

      return data as Opportunity
    } catch (error) {
      console.error('Unexpected error fetching opportunity:', error)
      return this.getMockOpportunityById(id)
    }
  }

  async create(opportunity: Omit<Opportunity, 'id' | 'savedAt' | 'updatedAt'>): Promise<Opportunity | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.createMockOpportunity(opportunity)
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .insert([opportunity])
        .select()
        .single()

      if (error) {
        console.error('Error creating opportunity:', error)
        return null
      }

      return data as Opportunity
    } catch (error) {
      console.error('Unexpected error creating opportunity:', error)
      return null
    }
  }

  async update(id: string, updates: OpportunityUpdate): Promise<Opportunity | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.updateMockOpportunity(id, updates)
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating opportunity:', error)
        return null
      }

      return data as Opportunity
    } catch (error) {
      console.error('Unexpected error updating opportunity:', error)
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = getSupabaseClient()
    
    if (!client) {
      return true
    }

    try {
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting opportunity:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error deleting opportunity:', error)
      return false
    }
  }

  async bulkUpdate(ids: string[], updates: OpportunityUpdate): Promise<boolean> {
    const client = getSupabaseClient()
    
    if (!client) {
      return true
    }

    try {
      const { error } = await client
        .from(this.tableName)
        .update(updates)
        .in('id', ids)

      if (error) {
        console.error('Error bulk updating opportunities:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error bulk updating opportunities:', error)
      return false
    }
  }

  private getMockOpportunities(filters?: OpportunityFilters): Opportunity[] {
    let opportunities = [...mockOpportunities]

    if (filters?.status && filters.status.length > 0) {
      opportunities = opportunities.filter(opp => filters.status?.includes(opp.status))
    }

    if (filters?.country && filters.country.length > 0) {
      opportunities = opportunities.filter(opp => 
        opp.analysis && filters.country?.includes(opp.analysis.property.country)
      )
    }

    if (filters?.minScore !== undefined) {
      opportunities = opportunities.filter(opp => 
        opp.analysis && opp.analysis.score.overall >= filters.minScore!
      )
    }

    if (filters?.maxScore !== undefined) {
      opportunities = opportunities.filter(opp => 
        opp.analysis && opp.analysis.score.overall <= filters.maxScore!
      )
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      opportunities = opportunities.filter(opp =>
        opp.property.title.toLowerCase().includes(searchLower)
      )
    }

    return opportunities
  }

  private getMockOpportunityById(id: string): Opportunity | null {
    return mockOpportunities.find(opp => opp.id === id) || null
  }

  private createMockOpportunity(opportunity: Omit<Opportunity, 'id' | 'savedAt' | 'updatedAt'>): Opportunity {
    return {
      ...opportunity,
      id: `mock-${Date.now()}`,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Opportunity
  }

  async archive(ids: string[]): Promise<boolean> {
    const client = getSupabaseClient()

    if (!client) {
      return true
    }

    try {
      const { error } = await client
        .from(this.tableName)
        .update({ is_archived: true })
        .in('id', ids)

      if (error) {
        console.error('Error archiving opportunities:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error archiving opportunities:', error)
      return false
    }
  }

  async getAllArchived(): Promise<Opportunity[]> {
    const client = getSupabaseClient()

    if (!client) {
      return []
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching archived opportunities:', error)
        return []
      }

      return data as Opportunity[]
    } catch (error) {
      console.error('Unexpected error fetching archived opportunities:', error)
      return []
    }
  }

  private updateMockOpportunity(id: string, updates: OpportunityUpdate): Opportunity | null {
    const opportunity = this.getMockOpportunityById(id)
    if (!opportunity) return null

    return {
      ...opportunity,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }
}

export const opportunitiesService = new OpportunitiesService()
