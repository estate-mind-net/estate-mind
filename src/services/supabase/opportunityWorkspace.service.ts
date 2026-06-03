import type { InvestmentAnalysis, Opportunity, Property } from '@/lib/types'
import { mockOpportunities } from '@/lib/mockData'
import { getSupabaseClient } from './client'

type PropertyRow = {
  id: string
  title: string
  city: string
  country: string
  address: string | null
  property_type: string | null
  asking_price: number | null
  currency: string | null
  area_sqm: number | null
  bedrooms: number | null
  condition: string | null
  description: string | null
  created_at: string | null
  updated_at: string | null
}

type OpportunityRow = {
  id: string
  property_id: string
  title: string | null
  stage: string | null
  priority: string | null
  expected_monthly_rent: number | null
  created_at: string | null
  updated_at: string | null
}

type NoteRow = {
  id: string
  opportunity_id: string
  content: string | null
  created_at: string | null
}

export interface OpportunityNoteSnapshot {
  id: string
  content: string
  createdAt: string
  parsedAnalysis: InvestmentAnalysis | null
}

export interface OpportunityWorkspaceItem {
  id: string
  propertyId: string
  title: string
  city: string
  country: string
  askingPrice: number
  currency: string
  expectedMonthlyRent: number | null
  stage: Opportunity['status']
  priority: 'low' | 'medium' | 'high' | string
  createdAt: string
  updatedAt: string
  property: Property
  analysis: InvestmentAnalysis | null
  latestNote: OpportunityNoteSnapshot | null
}

export interface OpportunityWorkspaceLoadResult {
  items: OpportunityWorkspaceItem[]
  source: 'supabase' | 'mock'
}

const stageFallback: Opportunity['status'] = 'initial-analysis'

const parseAnalysisSnapshot = (content: string | null): InvestmentAnalysis | null => {
  if (!content) {
    return null
  }

  try {
    const parsed = JSON.parse(content) as Partial<InvestmentAnalysis>
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return parsed as InvestmentAnalysis
  } catch {
    return null
  }
}

const mapPropertyRow = (row: PropertyRow): Property => ({
  id: row.id,
  title: row.title,
  country: row.country,
  city: row.city,
  district: row.address ?? '',
  propertyType: (row.property_type ?? 'apartment') as Property['propertyType'],
  askingPrice: row.asking_price ?? 0,
  currency: row.currency ?? 'EUR',
  sizeSqm: row.area_sqm ?? 0,
  bedrooms: row.bedrooms ?? 0,
  condition: (row.condition ?? 'good') as Property['condition'],
  description: row.description ?? '',
  createdAt: row.created_at ?? row.updated_at ?? new Date().toISOString(),
})

const mapRowsToItem = (
  opportunity: OpportunityRow,
  property: PropertyRow,
  note?: NoteRow,
): OpportunityWorkspaceItem => {
  const mappedProperty = mapPropertyRow(property)
  const parsedAnalysis = parseAnalysisSnapshot(note?.content ?? null)
  const mockAnalysis = mockOpportunities.find((mock) => mock.property.id === mappedProperty.id)?.analysis ?? null
  const analysis = parsedAnalysis ?? mockAnalysis

  return {
    id: opportunity.id,
    propertyId: property.id,
    title: opportunity.title ?? mappedProperty.title,
    city: mappedProperty.city,
    country: mappedProperty.country,
    askingPrice: mappedProperty.askingPrice,
    currency: mappedProperty.currency,
    expectedMonthlyRent: opportunity.expected_monthly_rent ?? mappedProperty.expectedRent ?? null,
    stage: (opportunity.stage as Opportunity['status']) ?? stageFallback,
    priority: opportunity.priority ?? 'medium',
    createdAt: opportunity.created_at ?? property.created_at ?? mappedProperty.createdAt,
    updatedAt: opportunity.updated_at ?? property.updated_at ?? opportunity.created_at ?? mappedProperty.createdAt,
    property: mappedProperty,
    analysis,
    latestNote: note
      ? {
          id: note.id,
          content: note.content ?? '',
          createdAt: note.created_at ?? opportunity.updated_at ?? opportunity.created_at ?? mappedProperty.createdAt,
          parsedAnalysis,
        }
      : analysis
        ? {
            id: `mock-analysis-${opportunity.id}`,
            content: JSON.stringify(analysis, null, 2),
            createdAt: analysis.analyzedAt,
            parsedAnalysis: analysis,
          }
        : null,
  }
}

const getMockWorkspaceItems = (): OpportunityWorkspaceItem[] =>
  mockOpportunities.map((opportunity) => ({
    id: opportunity.id,
    propertyId: opportunity.property.id,
    title: opportunity.property.title,
    city: opportunity.property.city,
    country: opportunity.property.country,
    askingPrice: opportunity.property.askingPrice,
    currency: opportunity.property.currency,
    expectedMonthlyRent: opportunity.analysis?.rentalYieldEstimate.monthly ?? opportunity.property.expectedRent ?? null,
    stage: opportunity.status,
    priority: opportunity.status === 'due-diligence' || opportunity.status === 'negotiation' ? 'high' : 'medium',
    createdAt: opportunity.savedAt,
    updatedAt: opportunity.updatedAt,
    property: opportunity.property,
    analysis: opportunity.analysis ?? null,
    latestNote: opportunity.analysis
      ? {
          id: `mock-analysis-${opportunity.id}`,
          content: JSON.stringify(opportunity.analysis, null, 2),
          createdAt: opportunity.analysis.analyzedAt,
          parsedAnalysis: opportunity.analysis,
        }
      : null,
  }))

export class OpportunityWorkspaceService {
  async getMyOpportunities(): Promise<OpportunityWorkspaceLoadResult> {
    const client = getSupabaseClient()

    if (!client) {
      return {
        items: getMockWorkspaceItems(),
        source: 'mock',
      }
    }

    const [opportunitiesResult, propertiesResult, notesResult] = await Promise.all([
      client
        .from('opportunities')
        .select('id,property_id,title,stage,priority,expected_monthly_rent,created_at,updated_at')
        .order('created_at', { ascending: false }),
      client
        .from('properties')
        .select('id,title,city,country,address,property_type,asking_price,currency,area_sqm,bedrooms,condition,description,created_at,updated_at'),
      client
        .from('notes')
        .select('id,opportunity_id,content,created_at')
        .order('created_at', { ascending: false }),
    ])

    if (opportunitiesResult.error) {
      throw new Error(opportunitiesResult.error.message)
    }

    if (propertiesResult.error) {
      throw new Error(propertiesResult.error.message)
    }

    if (notesResult.error) {
      throw new Error(notesResult.error.message)
    }

    const opportunities = (opportunitiesResult.data ?? []) as OpportunityRow[]
    const properties = (propertiesResult.data ?? []) as PropertyRow[]
    const notes = (notesResult.data ?? []) as NoteRow[]

    const propertyById = new Map(properties.map((property) => [property.id, property]))
    const latestNoteByOpportunityId = new Map<string, NoteRow>()

    notes.forEach((note) => {
      if (!latestNoteByOpportunityId.has(note.opportunity_id)) {
        latestNoteByOpportunityId.set(note.opportunity_id, note)
      }
    })

    const items = opportunities
      .map((opportunity) => {
        const property = propertyById.get(opportunity.property_id)
        if (!property) {
          return null
        }

        return mapRowsToItem(opportunity, property, latestNoteByOpportunityId.get(opportunity.id))
      })
      .filter((item): item is OpportunityWorkspaceItem => item !== null)

    return {
      items,
      source: 'supabase',
    }
  }
}

export const opportunityWorkspaceService = new OpportunityWorkspaceService()