/**
 * Rent Preset Service
 *
 * Creates pre-configured rent search presets with dedup prevention.
 * Reuses existing opportunityHunterService for brief/source creation.
 */

import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import type { InvestmentSearchBrief, OpportunitySource } from '@/lib/types/opportunityHunter'

const LIMAN_PRESET_BRIEF_TITLE = 'Liman 2-4 Novi Sad Rent Search'
const LIMAN_PRESET_SOURCE_NAME = '4zida Liman 2-4 Rent Search'

export interface PresetResult {
  brief: InvestmentSearchBrief
  source: OpportunitySource
  created: boolean // true if newly created, false if already existed
}

/**
 * Create the Liman 2-4 Novi Sad rent preset.
 * Returns existing brief if already created (dedup by title).
 */
export async function createLimanPreset(
  organizationId: string,
): Promise<PresetResult> {
  // Check for existing brief with same title
  const existingBriefs = await opportunityHunterService.listBriefs(organizationId, 'rent')
  const existingBrief = existingBriefs.find((b) => b.title === LIMAN_PRESET_BRIEF_TITLE)

  if (existingBrief) {
    // Find the existing source
    const existingSources = await opportunityHunterService.listSources(organizationId, 'rent')
    const existingSource = existingSources.find((s) => s.name === LIMAN_PRESET_SOURCE_NAME)

    if (existingSource) {
      return { brief: existingBrief, source: existingSource, created: false }
    }

    // Brief exists but source doesn't — create and assign source
    const source = await createLimanSource(organizationId)
    await opportunityHunterService.assignSourceToBrief(existingBrief.id, source.id)
    return { brief: existingBrief, source, created: false }
  }

  // Create brief
  const brief = await opportunityHunterService.createBrief(organizationId, {
    title: LIMAN_PRESET_BRIEF_TITLE,
    is_active: true,
    countries: ['Serbia'],
    cities: ['Novi Sad'],
    districts: ['Liman 2', 'Liman 3', 'Liman 4'],
    property_types: ['apartment'],
    min_price: 200,
    max_price: 400,
    currency: 'EUR',
    min_size_m2: 30,
    max_size_m2: null,
    rental_strategy: 'long_term',
    target_yield: null,
    risk_tolerance: 'medium',
    renovation_preference: 'any',
    notes: 'Preset: Liman 2-4 apartments in Novi Sad, 200-400 EUR/month, min 30m²',
    module_type: 'rent',
    module_data: {
      bedrooms: 1,
      furnished_required: false,
      parking_required: false,
      balcony_required: false,
      elevator_required: false,
      pets_allowed_required: false,
      remote_work_important: false,
      quiet_important: false,
      max_floor: null,
      preferred_districts: ['Liman 2', 'Liman 3', 'Liman 4'],
    },
  })

  // Create source
  const source = await createLimanSource(organizationId)

  // Assign source to brief
  await opportunityHunterService.assignSourceToBrief(brief.id, source.id)

  return { brief, source, created: true }
}

async function createLimanSource(organizationId: string): Promise<OpportunitySource> {
  return opportunityHunterService.createSource(organizationId, {
    name: LIMAN_PRESET_SOURCE_NAME,
    type: 'portal_search',
    source_url: null,
    seed_urls: [],
    connector_config: {
      portal: '4zida',
      city: 'Novi Sad',
      districts: ['Liman 2', 'Liman 3', 'Liman 4'],
      minRent: 200,
      maxRent: 400,
      bedrooms: 1,
      sizeMin: 30,
      sizeMax: null,
    },
    terms_checked: true,
    allowed_use_notes: 'Preset portal search for Liman 2-4 Novi Sad rentals',
    rate_limit_per_hour: 24,
    contact_email: null,
    is_enabled: true,
    module_type: 'rent',
  })
}