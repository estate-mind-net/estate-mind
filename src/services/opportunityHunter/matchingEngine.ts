import type { InvestmentSearchBrief, RawOpportunity } from '@/lib/types/opportunityHunter'
import type { MatchEvaluation } from './types'

const includeOne = (source: string[] | undefined, candidate: string | null | undefined) => {
  if (!source || source.length === 0) return true
  if (!candidate) return false
  return source.map((item) => item.toLowerCase()).includes(candidate.toLowerCase())
}

const normalizeText = (value: string | null | undefined): string => {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const LAND_BRIEF_PATTERN = /\b(land|parcel|plot|plac|placevi|parcela|zemljiste|zemljiste)\b/
const LAND_LISTING_PATTERN = /\b(land|parcel|plot|plac|placevi|parcela|zemljiste|gradjevinski plac|gradjevinsko zemljiste|vikend plac|salas)\b/
const HOUSE_PATTERN = /\b(house|kuća|kuca|villa|vikendica)\b/

const slugify = (value: string): string => normalizeText(value)
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const hasMissingCity = (city: string | null | undefined): boolean => {
  const normalized = normalizeText(city).trim()
  return normalized.length === 0 || normalized === 'unknown city' || normalized === 'unknown'
}

const getUrlPath = (value: string | null | undefined): string => {
  if (!value) return ''
  try {
    const url = new URL(value)
    return `${url.pathname} ${url.search}`.toLowerCase()
  } catch {
    return ''
  }
}

const isIndividualListingUrl = (item: RawOpportunity): boolean => {
  const sourceUrl = item.source_url ?? ''
  const path = getUrlPath(sourceUrl)
  if (!path) return false

  const payloadClassification = typeof item.raw_payload?.page_classification === 'string'
    ? item.raw_payload.page_classification
    : ''
  const cardOrigin = item.raw_payload?.origin === 'web_search_card'

  if (payloadClassification === 'agency_homepage' || payloadClassification === 'irrelevant') return false
  if (/\/(blog|news|privacy|cookie|terms|about|contact)(\/|\?|$)/i.test(path)) return false
  if (/(search|rezultati|results|pretraga|filter)/i.test(path)) return false
  if (/(prodaja-stanova|prodaja-placeva|prodaja-nekretnina|stambeni-objekti\/stanovi|placevi)(\/)?(\?|$)/i.test(path)) return false
  if (payloadClassification === 'category_page' && !cardOrigin) return false

  return /\d/.test(path) || /(oglas|nekretnin|stan|apartman|house|villa|plac|placevi|parcela|zemljiste|zemljište|salas|salaš)/i.test(path)
}

const containsCitySignal = (briefCities: string[], item: RawOpportunity): boolean => {
  if (briefCities.length === 0) return true

  const itemCity = normalizeText(item.city).trim()
  const haystack = normalizeText(`${item.title} ${item.description ?? ''}`)
  const urlPath = getUrlPath(item.source_url)

  return briefCities.some((city) => {
    const normalizedCity = normalizeText(city).trim()
    if (!normalizedCity) return false
    const citySlug = slugify(city)
    return itemCity === normalizedCity
      || haystack.includes(normalizedCity)
      || (citySlug.length > 0 && urlPath.includes(citySlug))
  })
}

const propertyTypeMatches = (briefTypes: string[], item: RawOpportunity): boolean => {
  if (briefTypes.length === 0) return true
  if (includeOne(briefTypes, item.property_type)) return true

  const normalizedBriefTypes = briefTypes.map(normalizeText)
  const isLandBrief = normalizedBriefTypes.some((type) => LAND_BRIEF_PATTERN.test(type))
  if (!isLandBrief) return false

  const listingText = normalizeText([
    item.property_type,
    item.title,
    item.description,
    typeof item.raw_payload === 'object' && item.raw_payload ? JSON.stringify(item.raw_payload) : '',
  ].filter(Boolean).join(' '))

  if (LAND_LISTING_PATTERN.test(listingText)) return true

  return HOUSE_PATTERN.test(listingText) && /(large plot|big plot|veliki plac|velika parcela|plac|parcela|zemljiste)/.test(listingText)
}

export const evaluateOpportunityMatch = (brief: InvestmentSearchBrief, item: RawOpportunity): MatchEvaluation => {
  let score = 40
  const matchReasons: string[] = []
  const mismatchReasons: string[] = []
  const missingData: string[] = []
  const rejectionReasons: string[] = []
  let scoreCap = 100

  const titleText = normalizeText(item.title)
  const sourceUrl = item.source_url ?? ''
  const hasHardTitleBlock = /\b(agency|agencija)\b/.test(titleText)
    || /\b(cookie|privacy)\b/.test(titleText)
  const hasBlogSignal = /\bblog\b/.test(titleText) || /\/blog\//i.test(sourceUrl)

  if (hasHardTitleBlock) {
    if (/\b(agency|agencija)\b/.test(titleText)) rejectionReasons.push('rejected_agency_page')
    if (/\bcookie\b/.test(titleText)) rejectionReasons.push('rejected_cookie_page')
    if (/\bprivacy\b/.test(titleText)) rejectionReasons.push('rejected_privacy_page')
  }
  if (hasBlogSignal) rejectionReasons.push('rejected_blog_page')
  if (hasMissingCity(item.city)) rejectionReasons.push('rejected_missing_city')
  if (item.price === null || item.price === undefined || item.price <= 0) rejectionReasons.push('rejected_missing_price')
  if (!item.property_type || item.property_type.trim().length === 0) rejectionReasons.push('rejected_missing_property_type')
  if (!isIndividualListingUrl(item)) rejectionReasons.push('rejected_not_individual_listing')

  if (includeOne(brief.countries, item.country)) {
    score += 15
    matchReasons.push('Country criteria matched')
  } else {
    mismatchReasons.push('Country outside configured brief scope')
  }

  const cityMatches = containsCitySignal(brief.cities, item)
  if (cityMatches) {
    score += 12
    matchReasons.push('City criteria matched')
  } else if (brief.cities.length > 0) {
    scoreCap = Math.min(scoreCap, 40)
    mismatchReasons.push('City mismatch')
    rejectionReasons.push('rejected_city_mismatch')
  }

  if (includeOne(brief.districts, item.district)) {
    score += 8
    matchReasons.push('District criteria matched')
  } else if (brief.districts.length > 0) {
    mismatchReasons.push('District mismatch')
  }

  const propertyMatches = propertyTypeMatches(brief.property_types, item)
  if (propertyMatches) {
    score += 8
    matchReasons.push('Property type aligned')
  } else {
    scoreCap = Math.min(scoreCap, 60)
    mismatchReasons.push('Property type not preferred')
  }

  if (item.price === null || item.price === undefined || item.price <= 0) {
    if (brief.min_price !== null || brief.max_price !== null) {
      scoreCap = Math.min(scoreCap, 40)
    }
    missingData.push('Price missing')
  } else {
    const min = brief.min_price ?? Number.MIN_SAFE_INTEGER
    const max = brief.max_price ?? Number.MAX_SAFE_INTEGER
    if (item.price >= min && item.price <= max) {
      score += 12
      matchReasons.push('Price in range')
    } else {
      mismatchReasons.push('Price outside target range')
    }
  }

  if (item.size_m2 === null || item.size_m2 === undefined) {
    missingData.push('Size (m2) missing')
  } else {
    const min = brief.min_size_m2 ?? Number.MIN_SAFE_INTEGER
    const max = brief.max_size_m2 ?? Number.MAX_SAFE_INTEGER
    if (item.size_m2 >= min && item.size_m2 <= max) {
      score += 8
      matchReasons.push('Size in range')
    } else {
      mismatchReasons.push('Size outside target range')
    }
  }

  if (brief.target_yield) {
    if (brief.rental_strategy === 'airbnb') {
      score += 5
      matchReasons.push('Brief favors short-term strategy')
    } else {
      score += 3
      matchReasons.push('Yield target considered for ranking')
    }
  }

  if (brief.cities.length > 0 && !cityMatches && !propertyMatches) {
    rejectionReasons.push('rejected_city_mismatch')
  }

  if (rejectionReasons.length > 0) {
    scoreCap = Math.min(scoreCap, 50)
  }

  score = Math.max(0, Math.min(100, score - mismatchReasons.length * 3 - missingData.length * 2))
  score = Math.min(score, scoreCap)

  const suggestedNextStep = score >= 80
    ? 'Trigger AI underwriting and legal due diligence.'
    : score >= 60
      ? 'Collect missing fields and run quick underwriting.'
      : 'Keep in watchlist and gather additional data before action.'

  const rankScore = Number((score - mismatchReasons.length * 1.5 - missingData.length).toFixed(2))
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
