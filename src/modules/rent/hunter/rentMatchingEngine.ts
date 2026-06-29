/**
 * rentMatchingEngine.ts
 *
 * Evaluates how well a raw opportunity (discovered listing) matches a Rent Search Brief.
 * Uses the same MatchEvaluation interface as the investment matching engine.
 *
 * Scoring is tuned for rental apartment matching:
 * - Prioritizes rent budget, location, and essential features
 * - Rejects listings missing critical data (city, rent)
 * - Uses module_data from both brief and raw opportunity for rent-specific fields
 */

import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import type { MatchEvaluation } from '@/services/opportunityHunter/types'

// ── Brief shape (rent-specific) ────────────────────────────────────

export interface RentSearchBrief {
  id: string
  organization_id: string
  title: string
  cities: string[]
  districts: string[]
  max_price: number | null  // DB column name (not max_rent)
  min_price: number | null  // DB column name (not min_rent)
  currency: string | null
  min_size_m2: number | null
  max_size_m2: number | null
  module_data: {
    bedrooms?: number | null
    furnished_required?: boolean
    parking_required?: boolean
    balcony_required?: boolean
    elevator_required?: boolean
    pets_allowed_required?: boolean
    remote_work_important?: boolean
    preferred_districts?: string[]
    quiet_important?: boolean
    max_floor?: number | null
    notes?: string
  }
}

// ── Helpers ────────────────────────────────────────────────────────

const normalizeText = (value: string | null | undefined): string => {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const hasMissingCity = (city: string | null | undefined): boolean => {
  const normalized = normalizeText(city).trim()
  return normalized.length === 0 || normalized === 'unknown city' || normalized === 'unknown'
}

const containsCitySignal = (briefCities: string[], item: RawOpportunity): boolean => {
  if (briefCities.length === 0) return true

  const itemCity = normalizeText(item.city).trim()
  const haystack = normalizeText(`${item.title} ${item.description ?? ''}`)

  return briefCities.some((city) => {
    const normalizedCity = normalizeText(city).trim()
    if (!normalizedCity) return false
    return itemCity === normalizedCity || haystack.includes(normalizedCity)
  })
}

const containsDistrictSignal = (briefDistricts: string[], item: RawOpportunity): 'exact' | 'partial' | 'generic' | 'wrong' | 'unknown' => {
  if (briefDistricts.length === 0) return 'unknown'

  const itemDistrict = normalizeText(item.district).trim()
  const haystack = normalizeText(`${item.title} ${item.description ?? ''}`)
  const combined = `${itemDistrict} ${haystack}`

  for (const district of briefDistricts) {
    const normalizedDistrict = normalizeText(district).trim()
    if (!normalizedDistrict) continue
    // Exact match (e.g., "liman 3" in text)
    if (itemDistrict === normalizedDistrict || haystack.includes(normalizedDistrict)) {
      return 'exact'
    }
  }

  // Check for generic district match (e.g., "liman" without number)
  const genericDistricts = briefDistricts.map((d) => normalizeText(d).replace(/\s*\d+\s*$/, '').trim()).filter(Boolean)
  const uniqueGeneric = [...new Set(genericDistricts)]
  for (const generic of uniqueGeneric) {
    if (generic.length >= 3 && combined.includes(generic)) {
      return 'generic'
    }
  }

  // Check if there's any district info at all
  if (itemDistrict || (haystack.match(/\b(liman|grbavica|detelinara|podbara|stari grad|satelit|telep|adice|bistrica)\b/i))) {
    return 'wrong'
  }

  return 'unknown'
}

const getModuleData = (item: RawOpportunity): Record<string, unknown> => {
  if (item.normalized_payload && typeof item.normalized_payload === 'object') {
    return item.normalized_payload as Record<string, unknown>
  }
  if (item.raw_payload && typeof item.raw_payload === 'object') {
    return item.raw_payload as Record<string, unknown>
  }
  return {}
}

const getBooleanField = (data: Record<string, unknown>, key: string): boolean | null => {
  const value = data[key]
  if (typeof value === 'boolean') return value
  return null
}

const getNumericField = (data: Record<string, unknown>, key: string): number | null => {
  const value = data[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const hasTextSignal = (haystack: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => haystack.includes(pattern))
}

/** Sale listing signals — reject these for rent sources */
const SALE_SIGNALS = [
  '/prodaja-stanova/',
  '/prodaja-kuca/',
  '/prodaja-kuće/',
  'prodaja stanova',
  'prodaja kuca',
  'prodaja kuće',
  'kupovina',
  'uknjizeno',
  'uknjiženo',
  '€/m²',
  'eur/m²',
  'eur /m²',
  '€ /m²',
  'cena po m2',
  'cijena po m2',
]

const isSaleListing = (item: RawOpportunity): boolean => {
  const url = (item.source_url ?? '').toLowerCase()
  const titleDesc = `${item.title} ${item.description ?? ''}`.toLowerCase()
  const combined = `${url} ${titleDesc}`
  return SALE_SIGNALS.some((signal) => combined.includes(signal))
}

/** Price over 3000 EUR is almost certainly a sale price, not monthly rent */
const isImplausibleRentPrice = (price: number | null | undefined): boolean => {
  if (price === null || price === undefined) return false
  return price > 3000
}

/** Price context: does the text contain rent-specific terms near the price? */
const RENT_CONTEXT_TERMS = [
  'izdavanje', 'iznajmljivanje', 'rent', 'rental', 'letting',
  'kirija', 'mesečno', 'mesecno', 'monthly', 'po mesecu',
  'stan na dan', 'apartment',
]

const hasRentContext = (item: RawOpportunity): boolean => {
  const text = `${item.title} ${item.description ?? ''}`.toLowerCase()
  return RENT_CONTEXT_TERMS.some((term) => text.includes(term))
}

const getMinRent = (brief: RentSearchBrief): number | null => {
  return brief.min_price ?? null
}

const getMaxRent = (brief: RentSearchBrief): number | null => {
  return brief.max_price ?? null
}

const getBedrooms = (brief: RentSearchBrief): number | null => {
  return brief.module_data?.bedrooms ?? null
}

// ── Main evaluation ────────────────────────────────────────────────

export const evaluateRentMatch = (brief: RentSearchBrief, item: RawOpportunity): MatchEvaluation => {
  let score = 40
  const matchReasons: string[] = []
  const mismatchReasons: string[] = []
  const missingData: string[] = []
  const rejectionReasons: string[] = []
  let scoreCap = 100
  const qualityLabels: string[] = []

  const briefModuleData = brief.module_data ?? {}
  const itemData = getModuleData(item)
  const titleDesc = normalizeText(`${item.title} ${item.description ?? ''}`)
  const briefDistricts = [...(brief.districts ?? []), ...(briefModuleData.preferred_districts ?? [])]
  const briefBedrooms = getBedrooms(brief)

  // ── Hard rejections ──────────────────────────────────────────────

  // Sale listing rejection (portal_search / rent_web_search only)
  const rawPayload = (item.raw_payload ?? {}) as Record<string, unknown>
  const origin = typeof rawPayload.origin === 'string' ? rawPayload.origin : ''
  const isSearchSource = origin === 'portal_search' || origin === 'rent_web_search'
  if (isSearchSource && isSaleListing(item)) {
    rejectionReasons.push('rejected_sale_listing')
    qualityLabels.push('Rejected sale listing')
  }

  // Implausible rent price (sale price treated as rent)
  const monthlyRent = item.price ?? getNumericField(itemData, 'monthlyRent') ?? getNumericField(itemData, 'monthly_rent')
  if (isImplausibleRentPrice(monthlyRent)) {
    // Only reject if no rent context terms found
    if (!hasRentContext(item)) {
      rejectionReasons.push('rejected_implausible_rent_price')
      qualityLabels.push('Rejected over budget')
    }
  }

  // Missing city
  if (hasMissingCity(item.city)) {
    rejectionReasons.push('rejected_missing_city')
    scoreCap = Math.min(scoreCap, 30)
  }

  // Missing rent price — cap score but don't reject for search sources
  if (monthlyRent === null || monthlyRent === undefined || monthlyRent <= 0) {
    if (isSearchSource) {
      missingData.push('Monthly rent missing — needs manual review')
      qualityLabels.push('Needs manual review')
      scoreCap = Math.min(scoreCap, 55)
    } else {
      rejectionReasons.push('rejected_missing_rent')
      scoreCap = Math.min(scoreCap, 25)
    }
  }

  // ── City match (+15) ─────────────────────────────────────────────

  const cityMatches = containsCitySignal(brief.cities, item)
  if (cityMatches) {
    score += 15
    matchReasons.push('City matched')
  } else if (brief.cities.length > 0) {
    scoreCap = Math.min(scoreCap, 40)
    mismatchReasons.push('City mismatch')
    rejectionReasons.push('rejected_city_mismatch')
  }

  // ── District match (stricter scoring) ────────────────────────────

  if (briefDistricts.length > 0) {
    const districtResult = containsDistrictSignal(briefDistricts, item)
    if (districtResult === 'exact') {
      score += 15
      matchReasons.push('District matched exactly')
    } else if (districtResult === 'generic') {
      scoreCap = Math.min(scoreCap, 60)
      mismatchReasons.push('District generic (e.g., "Liman" without number) — needs manual review')
      qualityLabels.push('Needs manual review')
    } else if (districtResult === 'wrong') {
      scoreCap = Math.min(scoreCap, 45)
      mismatchReasons.push('Wrong district — not in preferred list')
      rejectionReasons.push('rejected_wrong_district')
      qualityLabels.push('Rejected wrong district')
    } else {
      // unknown — no district info
      scoreCap = Math.min(scoreCap, 60)
      missingData.push('District unknown — needs manual review')
      qualityLabels.push('Needs manual review')
    }
  }

  // ── Rent within budget (+15) ─────────────────────────────────────

  const minBudget = getMinRent(brief)
  const maxBudget = getMaxRent(brief)

  if (monthlyRent !== null && monthlyRent !== undefined && monthlyRent > 0 && !isImplausibleRentPrice(monthlyRent)) {
    const effectiveMax = maxBudget ?? 5000
    const effectiveMin = minBudget ?? 0

    if (monthlyRent >= effectiveMin && monthlyRent <= effectiveMax) {
      score += 15
      matchReasons.push(`Rent ${monthlyRent} within budget (${effectiveMin}–${effectiveMax})`)
      if (!qualityLabels.includes('Rejected over budget')) {
        qualityLabels.unshift('Good candidate')
      }
    } else if (monthlyRent < effectiveMin) {
      score += 8
      matchReasons.push(`Rent ${monthlyRent} below minimum — still interesting`)
    } else {
      const excess = monthlyRent - effectiveMax
      const excessPercent = effectiveMax > 0 ? (excess / effectiveMax) * 100 : 100
      if (excessPercent <= 10) {
        score += 5
        mismatchReasons.push(`Rent ${monthlyRent} slightly above ${effectiveMax} budget (+${excessPercent.toFixed(0)}%)`)
      } else if (excessPercent <= 25) {
        score += 0
        mismatchReasons.push(`Rent ${monthlyRent} above ${effectiveMax} budget (+${excessPercent.toFixed(0)}%)`)
      } else {
        scoreCap = Math.min(scoreCap, 50)
        mismatchReasons.push(`Rent ${monthlyRent} significantly exceeds ${effectiveMax} budget (+${excessPercent.toFixed(0)}%)`)
        rejectionReasons.push('rejected_rent_too_high')
        qualityLabels.push('Rejected over budget')
      }
    }
  } else if (monthlyRent === null || monthlyRent === undefined || monthlyRent <= 0) {
    // Already handled above
  } else {
    // Implausible price — already rejected above
  }

  // ── Size fit (+10) ───────────────────────────────────────────────

  const sizeM2 = item.size_m2 ?? getNumericField(itemData, 'sizeM2') ?? getNumericField(itemData, 'size_m2')
  if (sizeM2 !== null && sizeM2 !== undefined) {
    const minSize = brief.min_size_m2 ?? Number.MIN_SAFE_INTEGER
    const maxSize = brief.max_size_m2 ?? Number.MAX_SAFE_INTEGER

    if (sizeM2 >= minSize && sizeM2 <= maxSize) {
      score += 10
      matchReasons.push(`Size ${sizeM2} m² within range`)
    } else if (sizeM2 < minSize) {
      const deficit = minSize - sizeM2
      if (deficit <= 5) {
        score += 3
        mismatchReasons.push(`Size ${sizeM2} m² slightly below ${minSize} m² minimum`)
      } else {
        scoreCap = Math.min(scoreCap, 60)
        mismatchReasons.push(`Size ${sizeM2} m² below ${minSize} m² minimum`)
      }
    } else {
      score += 5
      matchReasons.push(`Size ${sizeM2} m² above minimum (larger than required)`)
    }
  } else {
    missingData.push('Size (m²) missing')
  }

  // ── Bedroom fit (+8) ─────────────────────────────────────────────

  const bedrooms = item.bedrooms ?? getNumericField(itemData, 'bedrooms')
  if (bedrooms !== null && bedrooms !== undefined && briefBedrooms !== null) {
    if (bedrooms === briefBedrooms) {
      score += 8
      matchReasons.push(`${bedrooms} bedrooms matches requirement`)
    } else if (bedrooms > briefBedrooms) {
      score += 4
      matchReasons.push(`${bedrooms} bedrooms (more than ${briefBedrooms} required)`)
    } else {
      mismatchReasons.push(`${bedrooms} bedrooms (need ${briefBedrooms})`)
      score -= 3
    }
  } else if (bedrooms === null || bedrooms === undefined) {
    missingData.push('Bedrooms missing')
  }
  // If briefBedrooms is null, don't report bedroom mismatch

  // ── Feature matching ─────────────────────────────────────────────

  // Furnished (+5)
  if (briefModuleData.furnished_required === true) {
    const furnished = getBooleanField(itemData, 'furnished')
    if (furnished === true) {
      score += 5
      matchReasons.push('Furnished as required')
    } else if (furnished === false) {
      mismatchReasons.push('Not furnished (furnished required)')
      score -= 3
    } else {
      missingData.push('Furnished status unknown')
    }
  }

  // Parking (+5)
  if (briefModuleData.parking_required === true) {
    const parking = getBooleanField(itemData, 'parking')
    if (parking === true) {
      score += 5
      matchReasons.push('Parking available as required')
    } else if (parking === false) {
      mismatchReasons.push('No parking (parking required)')
      score -= 2
    } else {
      missingData.push('Parking status unknown')
    }
  }

  // Balcony (+3)
  const balcony = getBooleanField(itemData, 'balcony')
  if (balcony === true) {
    if (briefModuleData.balcony_required === true) {
      score += 5
      matchReasons.push('Balcony available as required')
    } else {
      score += 3
      matchReasons.push('Balcony available')
    }
  } else if (balcony === false && briefModuleData.balcony_required === true) {
    mismatchReasons.push('No balcony (required)')
    score -= 2
  }

  // Elevator (+3)
  const elevator = getBooleanField(itemData, 'elevator')
  if (elevator === true) {
    if (briefModuleData.elevator_required === true) {
      score += 5
      matchReasons.push('Elevator available as required')
    } else {
      score += 3
      matchReasons.push('Elevator available')
    }
  } else if (elevator === false && briefModuleData.elevator_required === true) {
    mismatchReasons.push('No elevator (required)')
    score -= 2
  }

  // Pets (+5)
  if (briefModuleData.pets_allowed_required === true) {
    const petsAllowed = getBooleanField(itemData, 'petsAllowed') ?? getBooleanField(itemData, 'pets_allowed')
    if (petsAllowed === true) {
      score += 5
      matchReasons.push('Pets allowed as required')
    } else if (petsAllowed === false) {
      mismatchReasons.push('Pets not allowed (required)')
      score -= 5
    } else {
      missingData.push('Pets policy unknown')
    }
  }

  // ── Remote work / quiet signals (+3 each) ────────────────────────

  if (briefModuleData.remote_work_important === true) {
    if (hasTextSignal(titleDesc, ['remote', 'work from home', 'home office', 'wfh', 'kancelarija', 'rad od kuce'])) {
      score += 3
      matchReasons.push('Remote work signals found in listing')
    }
    if (sizeM2 !== null && sizeM2 !== undefined && sizeM2 >= 50 && (bedrooms ?? 0) >= 2) {
      score += 2
      matchReasons.push('Size suggests dedicated home office space')
    }
  }

  if (briefModuleData.quiet_important === true) {
    if (hasTextSignal(titleDesc, ['quiet', 'mirno', 'ticho', 'spokoj', 'green area', 'park', 'zelenilo'])) {
      score += 3
      matchReasons.push('Quiet environment signals found')
    }
  }

  // ── Floor check ──────────────────────────────────────────────────

  const floor = getNumericField(itemData, 'floor')
  if (floor !== null && floor !== undefined && briefModuleData.max_floor !== null && briefModuleData.max_floor !== undefined) {
    if (floor <= briefModuleData.max_floor) {
      score += 2
      matchReasons.push(`Floor ${floor} within limit`)
    } else {
      mismatchReasons.push(`Floor ${floor} exceeds ${briefModuleData.max_floor} limit`)
      if (elevator !== true) {
        score -= 3
        mismatchReasons.push('High floor without elevator')
      }
    }
  }

  // ── Final score calculation ───────────────────────────────────────

  score = Math.max(0, Math.min(100, score - mismatchReasons.length * 2 - missingData.length * 1))
  score = Math.min(score, scoreCap)

  // ── Suggested next step ──────────────────────────────────────────

  const suggestedNextStep = score >= 80
    ? 'Schedule viewing immediately. High match.'
    : score >= 60
      ? 'Collect missing details and schedule viewing.'
      : score >= 40
        ? 'Monitor. May improve with more data.'
        : 'Low match. Consider adjusting brief criteria.'

  // ── Rank score ───────────────────────────────────────────────────

  const rankScore = Number((score - mismatchReasons.length * 1.5 - missingData.length).toFixed(2))

  // ── Deduplicate rejection reasons ────────────────────────────────

  const uniqueRejectionReasons = [...new Set(rejectionReasons)]

  return {
    matchScore: score,
    matchReasons,
    mismatchReasons,
    missingData,
    rejectionReasons: uniqueRejectionReasons,
    isRejected: uniqueRejectionReasons.length > 0,
    suggestedNextStep,
    rankScore,
    qualityLabels: [...new Set(qualityLabels)],
  }
}