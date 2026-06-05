import type { InvestmentAnalysis, Opportunity, Property } from '@/lib/types'
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

export interface OpportunityWorkspaceDetail extends OpportunityWorkspaceItem {
  notes: OpportunityNoteSnapshot[]
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

interface OpportunityWorkspaceQueryOptions {
  organizationId?: string | null
  allowMockFallback?: boolean
}

export interface CreateOpportunityInput {
  title: string
  country: string
  city: string
  district: string
  propertyType: Property['propertyType']
  askingPrice: number
  currency: string
  sizeSqm: number
  bedrooms: number
  condition: Property['condition']
  listingUrl: string
  description: string
}

type PropertyInsertRow = {
  organization_id: string
  title: string
  city: string
  country: string
  address: string
  property_type: string
  asking_price: number
  currency: string
  area_sqm: number
  bedrooms: number
  condition: string
  description: string
  listing_url: string
}

type OpportunityInsertRow = {
  organization_id: string
  property_id: string
  title: string
  stage: Opportunity['status']
  priority: string
  notes: string
}

export interface CreateOpportunityResult {
  opportunityId: string
}

export interface PersistOpportunityAnalysisResult {
  saved: boolean
  warning?: string
}

const isCreatedByIssue = (message: string) => {
  const lower = message.toLowerCase()
  return lower.includes('created_by')
}

const isListingUrlIssue = (message: string) => {
  const lower = message.toLowerCase()
  return lower.includes('listing_url')
}

const isColumnIssue = (message: string) => {
  const lower = message.toLowerCase()
  return lower.includes('column') && lower.includes('does not exist')
}

const shouldRetryWithoutCreatedBy = (message: string) => {
  return isCreatedByIssue(message) && (isColumnIssue(message) || message.toLowerCase().includes('foreign key'))
}

const shouldRetryWithoutListingUrl = (message: string) => {
  return isListingUrlIssue(message) && isColumnIssue(message)
}

const stageFallback: Opportunity['status'] = 'initial-analysis'

const safeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return null
}

const estimateRoi = (analysis: InvestmentAnalysis): number | null => {
  const appreciation = safeNumber(analysis.appreciationPotential.oneYear)
  const rentalYieldPct = safeNumber(analysis.rentalYieldEstimate.percentage)
  if (appreciation === null || rentalYieldPct === null) {
    return null
  }

  return Number((appreciation + rentalYieldPct).toFixed(2))
}

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
  const analysis = parsedAnalysis

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
      : null,
  }
}

const isMissingCreatedByColumn = (message: string) => {
  const lower = message.toLowerCase()
  return lower.includes('created_by') && lower.includes('column') && lower.includes('does not exist')
}

const isMissingEstimatedRoiColumn = (message: string) => {
  const lower = message.toLowerCase()
  return lower.includes('estimated_roi') && lower.includes('column') && lower.includes('does not exist')
}

export class OpportunityWorkspaceService {
  private buildAiNoteContent(analysis: InvestmentAnalysis) {
    return {
      ...analysis,
      snapshot: {
        estimatedMonthlyRent: analysis.rentalYieldEstimate.monthly,
        roiEstimate: estimateRoi(analysis),
        rentalYield: analysis.rentalYieldEstimate.percentage,
        airbnbYield: analysis.airbnbPotential.percentage,
        score: analysis.score.overall,
        recommendation: analysis.recommendation,
        explanation: analysis.executiveSummary,
      },
    }
  }

  private async updateOpportunityWithAnalysis(opportunityId: string, analysis: InvestmentAnalysis): Promise<void> {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase is unavailable.')
    }

    const summary = `AI analyzed ${new Date().toISOString()}. Recommendation: ${analysis.recommendation}.`
    const basePayload = {
      expected_monthly_rent: analysis.rentalYieldEstimate.monthly,
      stage: 'initial-analysis',
      notes: summary,
    }

    const firstAttempt = await client
      .from('opportunities')
      .update({
        ...basePayload,
        estimated_roi: estimateRoi(analysis),
      })
      .eq('id', opportunityId)

    if (!firstAttempt.error) {
      return
    }

    const firstMessage = firstAttempt.error.message ?? firstAttempt.error.details ?? 'Failed to update opportunity analysis fields.'
    if (!isMissingEstimatedRoiColumn(firstMessage)) {
      throw new Error(firstMessage)
    }

    const fallbackAttempt = await client
      .from('opportunities')
      .update(basePayload)
      .eq('id', opportunityId)

    if (fallbackAttempt.error) {
      throw new Error(fallbackAttempt.error.message ?? fallbackAttempt.error.details ?? 'Failed to update opportunity analysis fields.')
    }
  }

  private async insertAnalysisNote(
    organizationId: string,
    userId: string,
    opportunityId: string,
    analysis: InvestmentAnalysis,
  ): Promise<void> {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase is unavailable.')
    }

    const payloadWithCreatedBy: Record<string, unknown> = {
      organization_id: organizationId,
      opportunity_id: opportunityId,
      content: JSON.stringify(this.buildAiNoteContent(analysis)),
      created_by: userId,
    }

    const firstAttempt = await client.from('notes').insert([payloadWithCreatedBy])
    if (!firstAttempt.error) {
      return
    }

    const firstMessage = firstAttempt.error.message ?? firstAttempt.error.details ?? 'Failed to persist AI note.'
    if (!isMissingCreatedByColumn(firstMessage)) {
      throw new Error(firstMessage)
    }

    const payloadWithoutCreatedBy = {
      organization_id: organizationId,
      opportunity_id: opportunityId,
      content: JSON.stringify(this.buildAiNoteContent(analysis)),
    }

    const secondAttempt = await client.from('notes').insert([payloadWithoutCreatedBy])
    if (secondAttempt.error) {
      throw new Error(secondAttempt.error.message ?? secondAttempt.error.details ?? 'Failed to persist AI note.')
    }
  }

  private async insertProperty(
    organizationId: string,
    createdBy: string | null,
    input: CreateOpportunityInput,
  ): Promise<string> {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase is unavailable.')
    }

    const basePayload: PropertyInsertRow = {
      organization_id: organizationId,
      title: input.title,
      city: input.city,
      country: input.country,
      address: input.district,
      property_type: input.propertyType,
      asking_price: input.askingPrice,
      currency: input.currency,
      area_sqm: input.sizeSqm,
      bedrooms: input.bedrooms,
      condition: input.condition,
      description: input.description,
      listing_url: input.listingUrl,
    }

    const buildPayload = (includeCreatedBy: boolean, includeListingUrl: boolean) => {
      const payload = {
        ...basePayload,
      } as Record<string, unknown>

      if (!includeListingUrl) {
        delete payload.listing_url
      }

      if (includeCreatedBy && createdBy) {
        payload.created_by = createdBy
      }

      return payload
    }

    let includeCreatedBy = Boolean(createdBy)
    let includeListingUrl = true

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await client
        .from('properties')
        .insert([buildPayload(includeCreatedBy, includeListingUrl)])
        .select('id')
        .single()

      if (!error && data) {
        return (data as { id: string }).id
      }

      const message = error?.message ?? error?.details ?? 'Failed to create property row.'

      if (includeCreatedBy && shouldRetryWithoutCreatedBy(message)) {
        includeCreatedBy = false
        continue
      }

      if (includeListingUrl && shouldRetryWithoutListingUrl(message)) {
        includeListingUrl = false
        continue
      }

      throw new Error(message)
    }

    throw new Error('Failed to create property row.')
  }

  private async insertOpportunity(
    organizationId: string,
    createdBy: string | null,
    propertyId: string,
    input: CreateOpportunityInput,
  ): Promise<string> {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase is unavailable.')
    }

    const basePayload: OpportunityInsertRow = {
      organization_id: organizationId,
      property_id: propertyId,
      title: input.title,
      stage: 'new-opportunity',
      priority: 'medium',
      notes: input.listingUrl ? `Listing URL: ${input.listingUrl}` : '',
    }

    const withCreatedBy = createdBy
      ? ({ ...basePayload, created_by: createdBy } as Record<string, unknown>)
      : (basePayload as Record<string, unknown>)

    const tryInsert = async (payload: Record<string, unknown>) => {
      return client
        .from('opportunities')
        .insert([payload])
        .select('id')
        .single()
    }

    const firstAttempt = await tryInsert(withCreatedBy)
    if (!firstAttempt.error && firstAttempt.data) {
      return (firstAttempt.data as { id: string }).id
    }

    const firstMessage = firstAttempt.error?.message ?? firstAttempt.error?.details ?? 'Failed to create opportunity row.'
    if (createdBy && shouldRetryWithoutCreatedBy(firstMessage)) {
      const secondAttempt = await tryInsert(basePayload as Record<string, unknown>)
      if (!secondAttempt.error && secondAttempt.data) {
        return (secondAttempt.data as { id: string }).id
      }

      throw new Error(secondAttempt.error?.message ?? secondAttempt.error?.details ?? 'Failed to create opportunity row.')
    }

    throw new Error(firstMessage)
  }

  async createOpportunity(
    input: CreateOpportunityInput,
    context: {
      organizationId: string
      userId: string
      profileId?: string | null
    },
  ): Promise<CreateOpportunityResult> {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase is unavailable. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }

    const createdBy = context.userId || context.profileId || null

    console.info('[opportunity-workspace] createOpportunity', {
      organizationId: context.organizationId,
      userId: context.userId,
      profileId: context.profileId ?? null,
      createdBy,
      title: input.title,
    })

    const propertyId = await this.insertProperty(context.organizationId, createdBy, input)

    try {
      const opportunityId = await this.insertOpportunity(context.organizationId, createdBy, propertyId, input)
      return { opportunityId }
    } catch (error) {
      await client.from('properties').delete().eq('id', propertyId)
      throw error
    }
  }

  async persistOpportunityAnalysis(
    analysis: InvestmentAnalysis,
    context: {
      organizationId: string
      userId: string
      opportunityId: string
    },
  ): Promise<PersistOpportunityAnalysisResult> {
    try {
      await this.updateOpportunityWithAnalysis(context.opportunityId, analysis)
      await this.insertAnalysisNote(context.organizationId, context.userId, context.opportunityId, analysis)
      return { saved: true }
    } catch (error) {
      return {
        saved: false,
        warning: error instanceof Error ? error.message : 'Failed to persist AI analysis for this opportunity.',
      }
    }
  }

  async getOpportunityById(opportunityId: string, options?: OpportunityWorkspaceQueryOptions): Promise<OpportunityWorkspaceDetail | null> {
    const client = getSupabaseClient()
    const organizationId = options?.organizationId

    if (!client || !organizationId) {
      return null
    }

    const [opportunityResult, propertyResult, notesResult] = await Promise.all([
      client
        .from('opportunities')
        .select('id,property_id,title,stage,priority,expected_monthly_rent,created_at,updated_at')
        .eq('organization_id', organizationId)
        .eq('id', opportunityId)
        .maybeSingle(),
      client
        .from('properties')
        .select('id,title,city,country,address,property_type,asking_price,currency,area_sqm,bedrooms,condition,description,created_at,updated_at')
        .eq('organization_id', organizationId),
      client
        .from('notes')
        .select('id,opportunity_id,content,created_at')
        .eq('organization_id', organizationId)
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false }),
    ])

    if (opportunityResult.error) {
      throw new Error(opportunityResult.error.message)
    }

    if (propertyResult.error) {
      throw new Error(propertyResult.error.message)
    }

    if (notesResult.error) {
      throw new Error(notesResult.error.message)
    }

    const opportunity = (opportunityResult.data as OpportunityRow | null) ?? null
    if (!opportunity) {
      return null
    }

    const properties = (propertyResult.data ?? []) as PropertyRow[]
    const property = properties.find((item) => item.id === opportunity.property_id)
    if (!property) {
      return null
    }

    const notes = ((notesResult.data ?? []) as NoteRow[]).map((note) => ({
      id: note.id,
      content: note.content ?? '',
      createdAt: note.created_at ?? opportunity.updated_at ?? opportunity.created_at ?? new Date().toISOString(),
      parsedAnalysis: parseAnalysisSnapshot(note.content ?? null),
    }))

    const latestNote = notes[0]
    const item = mapRowsToItem(opportunity, property, latestNote)

    return {
      ...item,
      notes,
    }
  }

  async getMyOpportunities(options?: OpportunityWorkspaceQueryOptions): Promise<OpportunityWorkspaceLoadResult> {
    const client = getSupabaseClient()
    const organizationId = options?.organizationId

    if (!client) {
      if (!options?.allowMockFallback) {
        return {
          items: [],
          source: 'supabase',
        }
      }

      return {
        items: [],
        source: 'mock',
      }
    }

    if (!organizationId) {
      return {
        items: [],
        source: 'supabase',
      }
    }

    const [opportunitiesResult, propertiesResult, notesResult] = await Promise.all([
      client
        .from('opportunities')
        .select('id,property_id,title,stage,priority,expected_monthly_rent,created_at,updated_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      client
        .from('properties')
        .select('id,title,city,country,address,property_type,asking_price,currency,area_sqm,bedrooms,condition,description,created_at,updated_at')
        .eq('organization_id', organizationId),
      client
        .from('notes')
        .select('id,opportunity_id,content,created_at')
        .eq('organization_id', organizationId)
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