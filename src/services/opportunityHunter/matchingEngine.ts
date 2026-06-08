import type { InvestmentSearchBrief, RawOpportunity } from '@/lib/types/opportunityHunter'
import type { MatchEvaluation } from './types'

const includeOne = (source: string[] | undefined, candidate: string | null | undefined) => {
  if (!source || source.length === 0) return true
  if (!candidate) return false
  return source.map((item) => item.toLowerCase()).includes(candidate.toLowerCase())
}

export const evaluateOpportunityMatch = (brief: InvestmentSearchBrief, item: RawOpportunity): MatchEvaluation => {
  let score = 40
  const matchReasons: string[] = []
  const mismatchReasons: string[] = []
  const missingData: string[] = []

  if (includeOne(brief.countries, item.country)) {
    score += 15
    matchReasons.push('Country criteria matched')
  } else {
    mismatchReasons.push('Country outside configured brief scope')
  }

  if (includeOne(brief.cities, item.city)) {
    score += 12
    matchReasons.push('City criteria matched')
  } else if (brief.cities.length > 0) {
    mismatchReasons.push('City mismatch')
  }

  if (includeOne(brief.districts, item.district)) {
    score += 8
    matchReasons.push('District criteria matched')
  } else if (brief.districts.length > 0) {
    mismatchReasons.push('District mismatch')
  }

  if (brief.property_types.length === 0 || includeOne(brief.property_types, item.property_type)) {
    score += 8
    matchReasons.push('Property type aligned')
  } else {
    mismatchReasons.push('Property type not preferred')
  }

  if (item.price === null || item.price === undefined) {
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

  score = Math.max(0, Math.min(100, score - mismatchReasons.length * 3 - missingData.length * 2))

  const suggestedNextStep = score >= 80
    ? 'Trigger AI underwriting and legal due diligence.'
    : score >= 60
      ? 'Collect missing fields and run quick underwriting.'
      : 'Keep in watchlist and gather additional data before action.'

  const rankScore = Number((score - mismatchReasons.length * 1.5 - missingData.length).toFixed(2))

  return {
    matchScore: score,
    matchReasons,
    mismatchReasons,
    missingData,
    suggestedNextStep,
    rankScore,
  }
}
