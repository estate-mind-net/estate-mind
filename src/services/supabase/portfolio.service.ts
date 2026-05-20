import type { PortfolioMetrics, PortfolioProperty } from '@/lib/types'
import { getSupabaseClient } from './client'
import { mockPortfolioData } from '@/lib/mockData'

export class PortfolioService {
  private tableName = 'portfolio_properties'

  async getMetrics(): Promise<PortfolioMetrics | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.getMockMetrics()
    }

    try {
      const { data, error } = await client
        .from('portfolio_metrics')
        .select('*')
        .single()

      if (error) {
        console.error('Error fetching portfolio metrics:', error)
        return this.getMockMetrics()
      }

      return data as PortfolioMetrics
    } catch (error) {
      console.error('Unexpected error fetching portfolio metrics:', error)
      return this.getMockMetrics()
    }
  }

  async getProperties(): Promise<PortfolioProperty[]> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.getMockProperties()
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .order('acquisitionDate', { ascending: false })

      if (error) {
        console.error('Error fetching portfolio properties:', error)
        return this.getMockProperties()
      }

      return data as PortfolioProperty[]
    } catch (error) {
      console.error('Unexpected error fetching portfolio properties:', error)
      return this.getMockProperties()
    }
  }

  async addProperty(property: Omit<PortfolioProperty, 'id'>): Promise<PortfolioProperty | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return this.createMockProperty(property)
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .insert([property])
        .select()
        .single()

      if (error) {
        console.error('Error adding portfolio property:', error)
        return null
      }

      return data as PortfolioProperty
    } catch (error) {
      console.error('Unexpected error adding portfolio property:', error)
      return null
    }
  }

  async updateProperty(id: string, updates: Partial<PortfolioProperty>): Promise<PortfolioProperty | null> {
    const client = getSupabaseClient()
    
    if (!client) {
      return null
    }

    try {
      const { data, error } = await client
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating portfolio property:', error)
        return null
      }

      return data as PortfolioProperty
    } catch (error) {
      console.error('Unexpected error updating portfolio property:', error)
      return null
    }
  }

  async removeProperty(id: string): Promise<boolean> {
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
        console.error('Error removing portfolio property:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error removing portfolio property:', error)
      return false
    }
  }

  private getMockMetrics(): PortfolioMetrics {
    return mockPortfolioData.metrics
  }

  private getMockProperties(): PortfolioProperty[] {
    return mockPortfolioData.properties
  }

  private createMockProperty(property: Omit<PortfolioProperty, 'id'>): PortfolioProperty {
    return {
      ...property,
      id: `mock-${Date.now()}`,
    } as PortfolioProperty
  }
}

export const portfolioService = new PortfolioService()
