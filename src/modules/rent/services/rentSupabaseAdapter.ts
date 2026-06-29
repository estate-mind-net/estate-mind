/**
 * Rent Supabase Adapter (Phase 4)
 *
 * Maps RentalApartment ↔ shared Opportunity + Property system
 * using OpportunityWorkspaceService module-aware methods.
 *
 * Does NOT import Supabase client directly.
 * Does NOT touch rentStorage.ts (No longer used for data persistence).
 */

import type { RentalApartment, RentalStatus } from '../types'
import { opportunityWorkspaceService } from '@/services/supabase/opportunityWorkspace.service'
import type { CreateOpportunityInput } from '@/services/supabase/opportunityWorkspace.service'
import type { Opportunity } from '@/lib/types'
import { getSupabaseClient } from '@/services/supabase/client'

// ── Stage ↔ Status mapping ─────────────────────────────────────────

const rentStatusToStage: Record<RentalStatus, Opportunity['status']> = {
  new: 'lead',
  shortlisted: 'interested',
  viewing_scheduled: 'negotiating',
  viewed: 'due-diligence',
  favorite: 'offer-made',
  rejected: 'rejected',
}

const stageToRentStatus: Record<string, RentalStatus> = {
  lead: 'new',
  interested: 'shortlisted',
  negotiating: 'viewing_scheduled',
  'due-diligence': 'viewed',
  'offer-made': 'favorite',
  rejected: 'rejected',
}

export function toStage(status: RentalStatus): Opportunity['status'] {
  return rentStatusToStage[status] ?? 'lead'
}

export function toRentStatus(stage: string): RentalStatus {
  return stageToRentStatus[stage] ?? 'new'
}

// ── Module data shape ──────────────────────────────────────────────

interface RentModuleData {
  monthlyRent?: number
  furnished?: boolean
  parking?: boolean
  balcony?: boolean
  elevator?: boolean
  petsAllowed?: boolean
  floor?: number
  score?: number
  recommendation?: string
  [key: string]: unknown
}

// ── Result types ───────────────────────────────────────────────────

export interface RentAdapterResult<T = RentalApartment> {
  success: boolean
  data?: T
  error?: string
}

export interface RentAdapterListResult {
  success: boolean
  data?: RentalApartment[]
  error?: string
}

export interface AdapterContext {
  organizationId: string
  userId: string
  profileId?: string | null
}

// ── Mapping helpers ────────────────────────────────────────────────

function extractModuleData(apartment: RentalApartment): RentModuleData {
  return {
    monthlyRent: apartment.monthlyRent,
    furnished: apartment.furnished,
    parking: apartment.parking,
    balcony: apartment.balcony,
    elevator: apartment.elevator,
    petsAllowed: apartment.petsAllowed,
    floor: apartment.floor,
    score: apartment.score,
    recommendation: apartment.recommendation,
  }
}

function extractModuleDataFromRaw(raw: Record<string, unknown> | null | undefined): RentModuleData {
  if (!raw || typeof raw !== 'object') return {}
  return raw as RentModuleData
}

function workspaceItemToApartment(item: {
  id: string
  title: string
  city: string
  property: { district?: string; address?: string; currency?: string; sizeSqm?: number; bedrooms?: number; listingUrl?: string }
  stage: string
  expectedMonthlyRent: number | null
  analysis?: { rentalYieldEstimate?: { monthly?: number } } | null
  module_data?: Record<string, unknown> | null
  contact_name?: string | null
  contact_phone?: string | null
  next_action?: string | null
  viewed_at?: string | null
}): RentalApartment {
  const status = toRentStatus(item.stage)
  const moduleData = extractModuleDataFromRaw(item.module_data)

  return {
    id: item.id,
    title: item.title,
    city: item.city,
    district: item.property.district ?? '',
    address: item.property.address,
    monthlyRent: moduleData.monthlyRent ?? item.expectedMonthlyRent ?? item.analysis?.rentalYieldEstimate?.monthly ?? 0,
    currency: item.property.currency ?? 'EUR',
    sizeM2: item.property.sizeSqm ?? 0,
    bedrooms: item.property.bedrooms ?? 0,
    furnished: moduleData.furnished ?? false,
    parking: moduleData.parking ?? false,
    balcony: moduleData.balcony ?? false,
    elevator: moduleData.elevator ?? false,
    petsAllowed: moduleData.petsAllowed ?? false,
    floor: moduleData.floor,
    listingUrl: item.property.listingUrl,
    status,
    viewedAt: item.viewed_at ?? undefined,
    contactName: item.contact_name ?? undefined,
    contactPhone: item.contact_phone ?? undefined,
    nextAction: item.next_action ?? undefined,
    score: moduleData.score,
    recommendation: moduleData.recommendation as RentalApartment['recommendation'],
  }
}

function detailToApartment(detail: {
  id: string
  title: string
  city: string
  property: { district?: string; address?: string; currency?: string; sizeSqm?: number; bedrooms?: number; listingUrl?: string; description?: string }
  stage: string
  expectedMonthlyRent: number | null
  analysis?: { rentalYieldEstimate?: { monthly?: number } } | null
  latestNote?: { content?: string } | null
  contact_name?: string | null
  contact_phone?: string | null
  next_action?: string | null
  viewed_at?: string | null
  module_data?: Record<string, unknown> | null
}): RentalApartment {
  const status = toRentStatus(detail.stage)
  const moduleData = extractModuleDataFromRaw(detail.module_data)

  return {
    id: detail.id,
    title: detail.title,
    city: detail.city,
    district: detail.property.district ?? '',
    address: detail.property.address,
    monthlyRent: moduleData.monthlyRent ?? detail.expectedMonthlyRent ?? detail.analysis?.rentalYieldEstimate?.monthly ?? 0,
    currency: detail.property.currency ?? 'EUR',
    sizeM2: detail.property.sizeSqm ?? 0,
    bedrooms: detail.property.bedrooms ?? 0,
    furnished: moduleData.furnished ?? false,
    parking: moduleData.parking ?? false,
    balcony: moduleData.balcony ?? false,
    elevator: moduleData.elevator ?? false,
    petsAllowed: moduleData.petsAllowed ?? false,
    floor: moduleData.floor,
    listingUrl: detail.property.listingUrl,
    notes: detail.property.description,
    status,
    viewedAt: detail.viewed_at ?? undefined,
    contactName: detail.contact_name ?? undefined,
    contactPhone: detail.contact_phone ?? undefined,
    nextAction: detail.next_action ?? undefined,
    score: moduleData.score,
    recommendation: moduleData.recommendation as RentalApartment['recommendation'],
  }
}

// ── Adapter ────────────────────────────────────────────────────────

class RentSupabaseAdapter {
  async listRentApartments(context: AdapterContext): Promise<RentAdapterListResult> {
    try {
      const result = await opportunityWorkspaceService.getOpportunitiesByModule('rent', {
        organizationId: context.organizationId,
      })

      const apartments = result.items.map(workspaceItemToApartment)
      return { success: true, data: apartments }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load rent apartments.',
      }
    }
  }

  async getRentApartmentById(id: string, context: AdapterContext): Promise<RentAdapterResult> {
    try {
      const detail = await opportunityWorkspaceService.getOpportunityByIdForModule(id, 'rent', {
        organizationId: context.organizationId,
      })

      if (!detail) {
        return { success: false, error: 'Apartment not found.' }
      }

      const apartment = detailToApartment(detail)
      return { success: true, data: apartment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load apartment.',
      }
    }
  }

  async createRentApartment(
    apartment: Omit<RentalApartment, 'id'>,
    context: AdapterContext,
  ): Promise<RentAdapterResult> {
    try {
      const moduleData = extractModuleData(apartment as RentalApartment)

      const input: CreateOpportunityInput = {
        title: apartment.title,
        country: 'Serbia',
        city: apartment.city,
        district: apartment.district,
        propertyType: 'apartment',
        askingPrice: apartment.monthlyRent,
        currency: apartment.currency,
        sizeSqm: apartment.sizeM2,
        bedrooms: apartment.bedrooms,
        condition: 'good',
        listingUrl: apartment.listingUrl ?? '',
        description: apartment.notes ?? '',
      }

      const result = await opportunityWorkspaceService.createOpportunityForModule('rent', input, {
        organizationId: context.organizationId,
        userId: context.userId,
        profileId: context.profileId,
        moduleData,
        contactName: apartment.contactName,
        contactPhone: apartment.contactPhone,
        nextAction: apartment.nextAction,
        stage: apartment.status ? toStage(apartment.status) : 'lead',
      })

      return {
        success: true,
        data: {
          ...apartment,
          id: result.opportunityId,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create apartment.',
      }
    }
  }

  async updateRentApartment(apartment: RentalApartment, context: AdapterContext): Promise<RentAdapterResult> {
    try {
      // Update workflow fields
      const workflowResult = await opportunityWorkspaceService.updateOpportunityWorkflowFields(
        apartment.id,
        {
          stage: apartment.status ? toStage(apartment.status) : undefined,
          contact_name: apartment.contactName ?? null,
          contact_phone: apartment.contactPhone ?? null,
          next_action: apartment.nextAction ?? null,
          viewed_at: apartment.viewedAt ?? null,
          notes: apartment.notes,
        },
        { organizationId: context.organizationId },
      )

      if (!workflowResult.saved) {
        return { success: false, error: workflowResult.warning ?? 'Failed to update workflow fields.' }
      }

      // Update module_data
      const moduleData = extractModuleData(apartment)
      const moduleResult = await opportunityWorkspaceService.updateOpportunityModuleData(
        apartment.id,
        moduleData as Record<string, unknown>,
        { organizationId: context.organizationId },
      )

      if (!moduleResult.saved) {
        return { success: false, error: moduleResult.warning ?? 'Failed to update module data.' }
      }

      return { success: true, data: apartment }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update apartment.',
      }
    }
  }

  async updateRentApartmentStatus(
    id: string,
    status: RentalStatus,
    context: AdapterContext,
  ): Promise<RentAdapterResult> {
    try {
      const result = await opportunityWorkspaceService.updateOpportunityWorkflowFields(
        id,
        {
          stage: toStage(status),
          viewed_at: status === 'viewed' ? new Date().toISOString() : undefined,
        },
        { organizationId: context.organizationId },
      )

      if (!result.saved) {
        return { success: false, error: result.warning ?? 'Failed to update status.' }
      }

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status.',
      }
    }
  }

  async deleteRentApartment(id: string, context: AdapterContext): Promise<RentAdapterResult<boolean>> {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return { success: false, error: 'Supabase unavailable.' }
      try { await supabase.from('notes').delete().eq('opportunity_id', id).eq('organization_id', context.organizationId) } catch {}
      try { await supabase.from('ai_findings').delete().eq('opportunity_id', id).eq('organization_id', context.organizationId) } catch {}
      const { error } = await supabase.from('opportunities').delete().eq('id', id).eq('organization_id', context.organizationId)
      if (error) return { success: false, error: error.message }
      return { success: true, data: true }
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Delete failed.' } }
  }

  async existsBySourceUrl(sourceUrl: string, context: AdapterContext): Promise<boolean> {
    try {
      const supabase = getSupabaseClient()
      if (!supabase || !sourceUrl) return false
      // Check properties table for matching listing_url
      const { data } = await supabase
        .from('properties')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('listing_url', sourceUrl)
        .limit(1)
      return (data ?? []).length > 0
    } catch { return false }
  }
}

export const rentSupabaseAdapter = new RentSupabaseAdapter()