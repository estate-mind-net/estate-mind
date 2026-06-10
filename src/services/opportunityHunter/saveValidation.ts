import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export type SaveValidationResult = {
  accepted: boolean
  reasons: string[]
}

const toLower = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase()

const getUrlParts = (value: string | null | undefined): { hostname: string; path: string; query: string } => {
  if (!value) return { hostname: '', path: '', query: '' }
  try {
    const url = new URL(value)
    return {
      hostname: url.hostname.toLowerCase(),
      path: url.pathname.toLowerCase(),
      query: url.search.toLowerCase(),
    }
  } catch {
    return { hostname: '', path: '', query: '' }
  }
}

const isMissingNumber = (value: unknown): boolean => {
  const numeric = Number(value)
  return !Number.isFinite(numeric) || numeric <= 0
}

const is4zidaListingUrl = (hostname: string, path: string): boolean => {
  if (!hostname.includes('4zida.rs')) return false
  if (!/(prodaja|izdavanje|stan|apartman|nekretnin)/i.test(path)) return false
  if (!/\d{3,}/.test(path)) return false
  if (/\/(prodaja-stanova|izdavanje-stanova|stanovi|nekretnine)\/?$/.test(path)) return false
  return true
}

const isEstitorListingUrl = (hostname: string, path: string): boolean => {
  if (!hostname.includes('estitor.com')) return false
  if (/\/agency(\/|$)/i.test(path)) return false
  return /\/id-\d+(\/|$)/i.test(path)
}

const isCategoryOrSearchPath = (path: string, query: string): boolean => {
  if (/(\?|&)(q|query|search|page|filter|sort)=/i.test(query)) return true
  if (/\/(search|pretraga|rezultati|results|category|categories|listing|listings|opstina|municipality)(\/|$)/i.test(path)) return true
  if (/\/(prodaja-stanova|prodaja-placeva|prodaja-nekretnina|stambeni-objekti\/stanovi|placevi)\/?$/i.test(path)) return true
  return false
}

export const validateRawOpportunityForSave = (item: RawOpportunity): SaveValidationResult => {
  const reasons: string[] = []
  const title = toLower(item.title)
  const city = toLower(item.city)
  const sourceUrl = item.source_url ?? ''
  const { hostname, path, query } = getUrlParts(sourceUrl)
  const is4zida = hostname.includes('4zida.rs')
  const is4zidaListing = is4zidaListingUrl(hostname, path)
  const isEstitor = hostname.includes('estitor.com')

  if (!sourceUrl || !hostname) {
    reasons.push('rejected_missing_or_invalid_source_url')
  }

  if (/\/agency(\/|$)/i.test(path)) {
    reasons.push('rejected_agency_url')
  }

  if (isCategoryOrSearchPath(path, query)) {
    reasons.push('rejected_category_or_search_page')
  }

  if (/\bagency\b/i.test(title) && !(is4zida && is4zidaListing)) {
    reasons.push('rejected_title_contains_agency')
  }

  if (/\blistings\b/i.test(title)) {
    reasons.push('rejected_title_contains_listings')
  }

  if (isMissingNumber(item.price)) {
    reasons.push('rejected_missing_price')
  }

  if (!city || city === 'n/a' || city === 'unknown city' || city === 'unknown') {
    reasons.push('rejected_missing_city')
  }

  if (isMissingNumber(item.size_m2)) {
    reasons.push('rejected_missing_size')
  }

  if (isEstitor) {
    if (/\/(municipality|opstina|category|categories|listings)(\/|$)/i.test(path)) {
      reasons.push('rejected_estitor_category_or_municipality_page')
    }
    if (!isEstitorListingUrl(hostname, path)) {
      reasons.push('rejected_estitor_non_listing_url')
    }
  }

  return {
    accepted: reasons.length === 0,
    reasons: [...new Set(reasons)],
  }
}
