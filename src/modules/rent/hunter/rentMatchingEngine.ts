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
  max_rent: number | null
  min_rent: number | null
  currency: string | null
  min_size_m2: number | null
  max_size_m2: number | null
  bedrooms: number | null
  module_data: {
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

const containsDistrictSignal = (briefDistricts: string[], item: RawOpportunity): boolean => {
  if (briefDistricts.length === 0) return true

  const itemDistrict = normalizeText(item.district).trim()
  const haystack = normalizeText(`${item.title} ${item.description ?? ''}`)

  return briefDistricts.some((district) => {
    const normalizedDistrict = normalizeText(district).trim()
    if (!normalizedDistrict) return false
    return itemDistrict === normalizedDistrict || haystack.includes(normalizedDistrict)
  })
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

// ── Main evaluation ────────────────────────────────────────────────

export const evaluateRentMatch = (brief: RentSearchBrief, item: RawOpportunity): MatchEvaluation => {
  let score = 40
  const matchReasons: string[] = []
  const mismatchReasons: string[] = []
  const missingData: string[] = []
  const rejectionReasons: string[] = []
  let scoreCap = 100

  const briefModuleData = brief.module_data ?? {}
  const itemData = getModuleData(item)
  const titleDesc = normalizeText(`${item.title} ${item.description ?? ''}`)

  // ── Hard rejections ──────────────────────────────────────────────

  // Missing city
  if (hasMissingCity(item.city)) {
    rejectionReasons.push('rejected_missing_city')
    scoreCap = Math.min(scoreCap, 30)
  }

  // Missing rent price
  const monthlyRent = item.price ?? getNumericField(itemData, 'monthlyRent') ?? getNumericField(itemData, 'monthly_rent')
  if (monthlyRent === null || monthlyRent === undefined || monthlyRent <= 0) {
    rejectionReasons.push('rejected_missing_rent')
    scoreCap = Math.min(scoreCap, 25)
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

  // ── District match (+12) ─────────────────────────────────────────

  const briefDistricts = [...(brief.districts ?? []), ...(briefModuleData.preferred_districts ?? [])]
  const districtMatches = containsDistrictSignal(briefDistricts, item)
  if (districtMatches && briefDistricts.length > 0) {
    score += 12
    matchReasons.push('District matched')
  } else if (briefDistricts.length > 0) {
    mismatchReasons.push('District mismatch')
  }

  // ── Rent within budget (+15) ─────────────────────────────────────

  if (monthlyRent !== null && monthlyRent !== undefined && monthlyRent > 0) {
    const maxBudget = brief.max_rent ?? Number.MAX_SAFE_INTEGER
    const minBudget = brief.min_rent ?? 0

    if (monthlyRent >= minBudget && monthlyRent <= maxBudget) {
      score += 15
      matchReasons.push(`Rent ${monthlyRent} within budget (${minBudget}–${maxBudget})`)
    } else if (monthlyRent < minBudget) {
      score += 8
      matchReasons.push(`Rent ${monthlyRent} below minimum — still interesting`)
    } else {
      // Above max budget
      const excess = monthlyRent - maxBudget
      const excessPercent = maxBudget > 0 ? (excess / maxBudget) * 100 : 100
      if (excessPercent <= 10) {
        score += 5
        mismatchReasons.push(`Rent ${monthlyRent} slightly above ${maxBudget} budget (+${excessPercent.toFixed(0)}%)`)
      } else if (excessPercent <= 25) {
        score += 0
        mismatchReasons.push(`Rent ${monthlyRent} above ${maxBudget} budget (+${excessPercent.toFixed(0)}%)`)
      } else {
        scoreCap = Math.min(scoreCap, 50)
        mismatchReasons.push(`Rent ${monthlyRent} significantly exceeds ${maxBudget} budget (+${excessPercent.toFixed(0)}%)`)
        rejectionReasons.push('rejected_rent_too_high')
      }
    }
  } else {
    missingData.push('Monthly rent missing')
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
  if (bedrooms !== null && bedrooms !== undefined && brief.bedrooms !== null) {
    if (bedrooms === brief.bedrooms) {
      score += 8
      matchReasons.push(`${bedrooms} bedrooms matches requirement`)
    } else if (bedrooms > brief.bedrooms) {
      score += 4
      matchReasons.push(`${bedrooms} bedrooms (more than ${brief.bedrooms} required)`)
    } else {
      mismatchReasons.push(`${bedrooms} bedrooms (need ${brief.bedrooms})`)
      score -= 3
    }
  } else if (bedrooms === null || bedrooms === undefined) {
    missingData.push('Bedrooms missing')
  }

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
  }
}