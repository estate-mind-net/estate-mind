import type { ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

type SearchResult = {
  title: string
  url: string
  snippet: string
}

export type PageClassification =
  | 'individual_listing'
  | 'category_page'
  | 'agency_homepage'
  | 'search_results_page'
  | 'irrelevant'

export type PortalKey = 'cityexpert' | '4zida' | 'nekretnine' | 'halo_oglasi' | 'realitica' | 'estitor' | 'generic'

export type PortalMetricsEntry = {
  listings_found: number
  listings_extracted: number
  listings_skipped: number
  extraction_errors: number
  invalid_titles_rejected: number
  invalid_urls_rejected: number
  low_confidence_rejected: number
  four_zida_cards_found: number
  four_zida_cards_extracted: number
  four_zida_cards_rejected: number
  rejection_reasons: Record<string, number>
}

export type PortalMetricsMap = Record<PortalKey, PortalMetricsEntry>

export type PortalExtractionInput = {
  portal: PortalKey
  classification: PageClassification
  html: string
  pageUrl: string
  result: SearchResult
  brief: ConnectorInput['brief']
  sourceId: string
}

export type PortalExtractionOutcome = {
  opportunities: RawOpportunity[]
  metrics: PortalMetricsEntry
  rejections: ValidationRejection[]
}

export type ValidationRejection = {
  portal: PortalKey
  title: string
  source_url: string
  rejection_reason: string
  reason_code: 'invalid_title' | 'invalid_url' | 'low_confidence'
  confidence: number
}

type ListingCandidate = Pick<RawOpportunity, 'title' | 'description' | 'price' | 'currency' | 'city' | 'district' | 'size_m2' | 'property_type' | 'source_url' | 'raw_payload'> & {
  image_count: number
}

type ValidationResult = {
  accepted: boolean
  confidence: number
  rejection?: ValidationRejection
}

const PROPERTY_KEYWORDS = [
  'apartment',
  'flat',
  'condo',
  'house',
  'villa',
  'land',
  'parcel',
  'plot',
  'studio',
  'listing',
  'property',
  'real estate',
  'for sale',
  'stan',
  'kuća',
  'kuca',
  'nekretnina',
  'plac',
  'placevi',
  'parcela',
  'zemljište',
  'zemljiste',
  'građevinski plac',
  'gradjevinski plac',
  'građevinsko zemljište',
  'gradjevinsko zemljiste',
  'vikend plac',
  'salaš',
  'salas',
]

const TITLE_BLOCKLIST = ['cookie', 'privacy', 'policy', 'ngcontent', 'script', 'stylesheet', 'javascript']

const PORTAL_PATH_HINTS: Record<Exclude<PortalKey, 'generic'>, string[]> = {
  cityexpert: ['prodaja-nekretnina', 'izdavanje-nekretnina', 'nekretnine', 'stanovi', 'kuce'],
  '4zida': ['prodaja-stanova', 'prodaja-placeva', 'prodaja-nekretnina', 'stanovi', 'placevi', 'nekretnine'],
  nekretnine: ['stambeni-objekti/stanovi', 'stambeni-objekti', 'placevi', 'prodaja', 'stanovi', 'nekretnine'],
  halo_oglasi: ['nekretnine', 'prodaja-placeva', 'oglasi', 'stan', 'plac', 'prodaja', 'izdavanje'],
  realitica: ['prodaja', 'sale', 'apartman', 'apartment', 'stan', 'nekretnine', 'real-estate'],
  estitor: ['id-', 'nekretnine', 'stanovi', 'prodaja', 'izdavanje'],
}

const PORTAL_HOST_HINTS: Record<Exclude<PortalKey, 'generic'>, string[]> = {
  cityexpert: ['cityexpert.rs'],
  '4zida': ['4zida.rs'],
  nekretnine: ['nekretnine.rs'],
  halo_oglasi: ['halooglasi.com', 'halooglasi.com'],
  realitica: ['realitica.com'],
  estitor: ['estitor.com'],
}

const PORTAL_LABELS: Record<Exclude<PortalKey, 'generic'>, string> = {
  cityexpert: 'City Expert',
  '4zida': '4Zida',
  nekretnine: 'Nekretnine.rs',
  halo_oglasi: 'Halo Oglasi',
  realitica: 'Realitica',
  estitor: 'Estitor',
}

const toArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const stripHtml = (value: string): string => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const parseNumeric = (value: string | null | undefined): number | null => {
  if (!value) return null
  const parsed = Number(String(value).replace(/[^0-9]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const resolveUrl = (href: string, baseUrl: string): string | null => {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeDomain = (domain: string) => domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

const getHostname = (url: string): string => {
  try {
    return normalizeDomain(new URL(url).hostname)
  } catch {
    return ''
  }
}

const getPath = (url: string): string => {
  try {
    return new URL(url).pathname.toLowerCase().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

const looksPropertyLike = (text: string): boolean => {
  const lower = text.toLowerCase()
  return PROPERTY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

const buildMetrics = (): PortalMetricsEntry => ({
  listings_found: 0,
  listings_extracted: 0,
  listings_skipped: 0,
  extraction_errors: 0,
  invalid_titles_rejected: 0,
  invalid_urls_rejected: 0,
  low_confidence_rejected: 0,
  four_zida_cards_found: 0,
  four_zida_cards_extracted: 0,
  four_zida_cards_rejected: 0,
  rejection_reasons: {},
})

export const createPortalMetrics = (): PortalMetricsMap => ({
  cityexpert: buildMetrics(),
  '4zida': buildMetrics(),
  nekretnine: buildMetrics(),
  halo_oglasi: buildMetrics(),
  realitica: buildMetrics(),
  estitor: buildMetrics(),
  generic: buildMetrics(),
})

const cloneMetrics = (metrics: PortalMetricsEntry): PortalMetricsEntry => ({ ...metrics })

const incMetric = (metrics: PortalMetricsMap, portal: PortalKey, key: keyof PortalMetricsEntry, amount = 1) => {
  metrics[portal][key] += amount
}

export const getPortalKey = (url: string): PortalKey => {
  const hostname = getHostname(url)
  if (!hostname) return 'generic'
  if (PORTAL_HOST_HINTS.cityexpert.some((hint) => hostname.includes(hint))) return 'cityexpert'
  if (PORTAL_HOST_HINTS['4zida'].some((hint) => hostname.includes(hint))) return '4zida'
  if (PORTAL_HOST_HINTS.nekretnine.some((hint) => hostname.includes(hint))) return 'nekretnine'
  if (PORTAL_HOST_HINTS.halo_oglasi.some((hint) => hostname.includes(hint))) return 'halo_oglasi'
  if (PORTAL_HOST_HINTS.realitica.some((hint) => hostname.includes(hint))) return 'realitica'
  if (PORTAL_HOST_HINTS.estitor.some((hint) => hostname.includes(hint))) return 'estitor'
  return 'generic'
}

const classifyPageBySignals = (result: SearchResult, html: string): PageClassification => {
  let url: URL
  try {
    url = new URL(result.url)
  } catch {
    return 'irrelevant'
  }

  const path = url.pathname.toLowerCase().replace(/\/+$/, '')
  const query = url.search.toLowerCase()
  const text = `${result.title} ${result.snippet} ${stripHtml(html).slice(0, 1200)}`.toLowerCase()
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] ?? ''
  const pathWithQuery = `${path} ${query}`

  if (!looksPropertyLike(text)) return 'irrelevant'

  if (/properties for sale in|search results|rezultati|pretraga|filter/i.test(text) || /[?&](q|search|query|page)=/i.test(query) || /search/.test(pathWithQuery)) {
    return 'search_results_page'
  }

  if (/agency|agencija|real estate agency/i.test(text) && segments.length <= 1) {
    return 'agency_homepage'
  }

  if (segments.length <= 1 && /agency|agencija|real estate/i.test(text)) {
    return 'agency_homepage'
  }

  if (/prodaja|nekretnine|stan|apartman|house|villa|property|listing|oglas/i.test(lastSegment) && /\d/.test(lastSegment)) {
    return 'individual_listing'
  }

  if (/oglas|nekretnina|property|stan|apartman|house|villa/.test(lastSegment) && /price|cena|eur|€/.test(text)) {
    return 'individual_listing'
  }

  if (/prodaja|nekretnine|stanovi|apartmani|kuce|listing/i.test(path) || PORTAL_PATH_HINTS.cityexpert.some((hint) => path.includes(hint))) {
    return 'category_page'
  }

  return 'category_page'
}

const classifyCandidateListing = (candidate: SearchResult): PageClassification => {
  const html = candidate.snippet ?? ''
  return classifyPageBySignals(candidate, html)
}

const buildRawOpportunity = (
  sourceId: string,
  brief: ConnectorInput['brief'],
  pageUrl: string,
  extracted: Pick<RawOpportunity, 'title' | 'description' | 'price' | 'currency' | 'city' | 'district' | 'size_m2' | 'property_type' | 'source_url' | 'raw_payload'>,
  extraPayload: Record<string, unknown>,
): RawOpportunity => ({
  source_id: sourceId,
  external_id: `web-${pageUrl}`,
  source_url: extracted.source_url ?? pageUrl,
  title: extracted.title,
  description: extracted.description,
  country: brief.countries[0] ?? null,
  city: extracted.city,
  district: extracted.district,
  price: extracted.price,
  currency: extracted.currency ?? brief.currency ?? 'EUR',
  size_m2: extracted.size_m2,
  bedrooms: null,
  property_type: extracted.property_type,
  raw_payload: {
    ...extracted.raw_payload,
    ...extraPayload,
  },
})

const isValidHttpUrl = (value: string | null | undefined): boolean => {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const containsHtmlTag = (value: string): boolean => /<[^>]+>/.test(value)

const containsBlockedTitleText = (value: string): boolean => {
  const lower = value.toLowerCase()
  return TITLE_BLOCKLIST.some((token) => lower.includes(token))
}

const hasPortalListingUrl = (portal: PortalKey, url: string): boolean => {
  if (!isValidHttpUrl(url)) return false

  if (portal === 'generic' || portal === 'halo_oglasi') {
    return true
  }

  const path = getPath(url)
  const hasIdentifier = /\d{3,}/.test(path)

  if (portal === 'cityexpert') {
    return hasIdentifier && /(nekretnin|prodaja-nekretnina|izdavanje-nekretnina|stan|kuc|apartman|studio)/i.test(path)
  }

  if (portal === '4zida') {
    return hasIdentifier && /(prodaja|izdavanje|nekretnin|stan|kuc|apartman|oglas|plac|placevi|parcela|zemljiste|zemljište)/i.test(path)
  }

  if (portal === 'nekretnine') {
    return hasIdentifier && /(nekretnin|stambeni-objekti|stan|kuc|apartman|oglas|prodaja|izdavanje|plac|placevi|parcela|zemljiste|zemljište)/i.test(path)
  }

  if (portal === 'estitor') {
    if (/\/agency(\/|$)/i.test(path)) return false
    if (/\/(municipality|opstina|category|categories|listings|search|pretraga|rezultati)(\/|$)/i.test(path)) return false
    return /\/id-\d+(\/|$)/i.test(path)
  }

  return true
}

const getConfidenceScore = (candidate: ListingCandidate): number => {
  let score = 0
  if (candidate.title.trim().length > 0) score += 20
  if (typeof candidate.price === 'number' && Number.isFinite(candidate.price)) score += 20
  if (typeof candidate.size_m2 === 'number' && Number.isFinite(candidate.size_m2)) score += 20
  if (candidate.image_count > 0) score += 20
  if (isValidHttpUrl(candidate.source_url)) score += 20
  return Math.max(0, Math.min(100, score))
}

const buildRejection = (
  portal: PortalKey,
  candidate: ListingCandidate,
  reasonCode: ValidationRejection['reason_code'],
  rejectionReason: string,
  confidence: number,
): ValidationRejection => ({
  portal,
  title: candidate.title,
  source_url: candidate.source_url ?? '',
  rejection_reason: rejectionReason,
  reason_code: reasonCode,
  confidence,
})

const validateListingCandidate = (portal: PortalKey, candidate: ListingCandidate): ValidationResult => {
  const title = candidate.title.trim()
  const confidence = getConfidenceScore(candidate)

  if (title.length < 10 || containsBlockedTitleText(title) || containsHtmlTag(title)) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection(portal, candidate, 'invalid_title', 'Title failed validation rules.', confidence),
    }
  }

  if (!isValidHttpUrl(candidate.source_url) || !hasPortalListingUrl(portal, candidate.source_url ?? '')) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection(portal, candidate, 'invalid_url', 'Listing URL failed portal-specific validation.', confidence),
    }
  }

  if (portal === 'cityexpert') {
    const hasCityExpertSignal = [
      typeof candidate.price === 'number' && Number.isFinite(candidate.price),
      typeof candidate.size_m2 === 'number' && Number.isFinite(candidate.size_m2),
      /(apartment|house|studio|flat|stan|kuca|kuća|plac|parcela|zemljište|zemljiste|vikend plac|salaš|salas)/i.test(`${candidate.title} ${candidate.property_type ?? ''} ${candidate.description ?? ''}`),
    ].some(Boolean)

    if (!hasCityExpertSignal) {
      return {
        accepted: false,
        confidence,
        rejection: buildRejection(portal, candidate, 'low_confidence', 'City Expert listing is missing price, size, and property-type signals.', confidence),
      }
    }
  }

  if (confidence < 50) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection(portal, candidate, 'low_confidence', 'Confidence score below threshold.', confidence),
    }
  }

  return { accepted: true, confidence }
}

const applyRejectionMetrics = (metrics: PortalMetricsEntry, rejection: ValidationRejection) => {
  metrics.listings_skipped += 1
  metrics.rejection_reasons[rejection.rejection_reason] = (metrics.rejection_reasons[rejection.rejection_reason] ?? 0) + 1
  if (rejection.reason_code === 'invalid_title') {
    metrics.invalid_titles_rejected += 1
  }
  if (rejection.reason_code === 'invalid_url') {
    metrics.invalid_urls_rejected += 1
  }
  if (rejection.reason_code === 'low_confidence') {
    metrics.low_confidence_rejected += 1
  }
}

const normalizeSignalText = (value: string): string => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const hasNoviSadSignal = (value: string): boolean => {
  const normalized = normalizeSignalText(value)
  return normalized.includes('novi sad') || normalized.includes('novi-sad')
}

const hasApartmentSignal = (value: string): boolean => {
  const normalized = normalizeSignalText(value)
  return /\b(stan|apartman|apartment|garsonjera|jednosoban|dvosoban|trosoban|cetvorosoban)\b/.test(normalized)
}

const hasNonApartmentSignal = (value: string): boolean => {
  const normalized = normalizeSignalText(value)
  return /\b(kuca|house|villa|vikendica|plac|parcela|zemljiste|lokal|poslovni|garaza)\b/.test(normalized)
}

const parseDecimalNumber = (value: string | null | undefined): number | null => {
  if (!value) return null
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

const extractDistrictFromNoviSad = (value: string): string | null => {
  const match = value.match(/novi\s*[-\s]?sad\s*[-,]\s*([a-zA-Z\u00C0-\u024F\s]{2,40})/i)
  if (!match?.[1]) return null
  const district = match[1].trim().replace(/\s+/g, ' ')
  if (!district) return null
  return district
}

const extractImageUrlFromHtml = (html: string, baseUrl: string): string | null => {
  const match = html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i)
  const candidate = match?.[1]
  if (!candidate) return null
  const resolved = resolveUrl(candidate, baseUrl)
  return resolved && /^https?:\/\//i.test(resolved) ? resolved : null
}

const is4zidaListingUrl = (url: string): boolean => {
  if (!isValidHttpUrl(url)) return false
  const host = getHostname(url)
  if (!host.includes('4zida.rs')) return false
  const path = getPath(url)
  if (!/(prodaja-stanova|izdavanje-stanova|stanovi|nekretnine)/i.test(path)) return false
  if (!/\d{3,}/.test(path)) return false
  if (/(agencij|agent|kontakt|o-nama|blog|vesti|news|pretraga|rezultati|filter)/i.test(path)) return false
  if (/\/(prodaja-stanova|izdavanje-stanova|stanovi|nekretnine)\/?$/.test(path)) return false
  return true
}

type FourZidaCardContext = {
  candidate: SearchResult
  contextText: string
  contextHtml: string
}

const extract4zidaCardLinks = (html: string, pageUrl: string): FourZidaCardContext[] => {
  const cards: FourZidaCardContext[] = []
  const seenUrls = new Set<string>()
  const anchorMatches = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi))

  for (const match of anchorMatches) {
    const href = match[1]
    const absoluteUrl = resolveUrl(href, pageUrl)
    if (!absoluteUrl || seenUrls.has(absoluteUrl)) continue
    if (!is4zidaListingUrl(absoluteUrl)) continue

    const anchorText = stripHtml(match[2] ?? '')
    const startIndex = Math.max(0, (match.index ?? 0) - 900)
    const endIndex = Math.min(html.length, (match.index ?? 0) + match[0].length + 900)
    const contextHtml = html.slice(startIndex, endIndex)
    const contextText = stripHtml(contextHtml)
    const combinedSignals = `${anchorText} ${contextText} ${absoluteUrl}`

    if (!/novi\s*[-\s]?sad|\bm2\b|m\u00b2|\beur\b|\u20ac|\bstan\b|apartman/i.test(combinedSignals)) {
      continue
    }

    seenUrls.add(absoluteUrl)
    cards.push({
      candidate: {
        title: anchorText || contextText.slice(0, 120),
        url: absoluteUrl,
        snippet: contextText,
      },
      contextText,
      contextHtml,
    })
  }

  return cards
}

const build4zidaApartmentListing = (card: FourZidaCardContext, pageUrl: string): ListingCandidate => {
  const titleText = card.candidate.title?.trim() ?? ''
  const combinedText = `${titleText} ${card.contextText}`
  const titlePriceSuffix = titleText.match(/([0-9]{2,3}(?:[\.\s]?[0-9]{3})+|[0-9]{4,7})\s?(?:\u20ac|eur)/i)
  const titlePricePrefix = titleText.match(/(?:\u20ac|eur)\s?([0-9]{2,3}(?:[\.\s]?[0-9]{3})+|[0-9]{4,7})/i)
  const contextPriceSuffix = card.contextText.match(/([0-9]{2,3}(?:[\.\s]?[0-9]{3})+|[0-9]{4,7})\s?(?:\u20ac|eur)/i)
  const contextPricePrefix = card.contextText.match(/(?:\u20ac|eur)\s?([0-9]{2,3}(?:[\.\s]?[0-9]{3})+|[0-9]{4,7})/i)
  const priceValue = parseNumeric(titlePriceSuffix?.[1] ?? titlePricePrefix?.[1] ?? contextPriceSuffix?.[1] ?? contextPricePrefix?.[1] ?? null)
  const titleSizeMatch = titleText.match(/([0-9]{1,3}(?:[\.,][0-9])?)\s?(?:m2|m\u00b2|sqm|sq m)/i)
  const sizeMatch = card.contextText.match(/([0-9]{1,3}(?:[\.,][0-9])?)\s?(?:m2|m\u00b2|sqm|sq m)/i)
  const cityFromTitle = (() => {
    const cityMatch = titleText.match(/\b(Novi Sad|Beograd|Belgrade|Ni[s\u0161]|Kragujevac|Subotica)\b/i)
    return cityMatch?.[1] ?? null
  })()
  const sizeValue = parseDecimalNumber(sizeMatch?.[1] ?? null)
  const titleSizeValue = parseDecimalNumber(titleSizeMatch?.[1] ?? null)
  const imageUrl = extractImageUrlFromHtml(card.contextHtml, pageUrl)

  return {
    title: titleText || 'Apartment listing',
    description: card.contextText.slice(0, 700) || card.candidate.snippet || null,
    price: typeof priceValue === 'number' ? priceValue : null,
    currency: typeof priceValue === 'number' && priceValue > 0 ? 'EUR' : null,
    city: cityFromTitle ?? (hasNoviSadSignal(`${combinedText} ${card.candidate.url}`) ? 'Novi Sad' : null),
    district: extractDistrictFromNoviSad(titleText) ?? extractDistrictFromNoviSad(combinedText),
    size_m2: typeof titleSizeValue === 'number' ? titleSizeValue : (typeof sizeValue === 'number' ? sizeValue : null),
    property_type: 'apartment',
    source_url: card.candidate.url,
    raw_payload: {
      origin: 'web_search_card',
      category_page_url: pageUrl,
      image_url: imageUrl,
      extracted_images: imageUrl ? [imageUrl] : [],
    },
    image_count: imageUrl ? 1 : 0,
  }
}

const validate4zidaApartmentCandidate = (
  candidate: ListingCandidate,
  brief: ConnectorInput['brief'],
): ValidationResult => {
  const confidence = getConfidenceScore(candidate)
  const title = candidate.title.trim()
  const sourceUrl = candidate.source_url ?? ''
  const combinedText = `${title} ${candidate.description ?? ''} ${sourceUrl}`

  if (title.length < 8 || containsBlockedTitleText(title) || containsHtmlTag(title)) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'invalid_title', 'four_zida_rejected_invalid_title', confidence),
    }
  }

  if (!is4zidaListingUrl(sourceUrl)) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'invalid_url', 'four_zida_rejected_invalid_or_non_listing_url', confidence),
    }
  }

  if (!hasNoviSadSignal(combinedText)) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_outside_novi_sad', confidence),
    }
  }

  if (!hasApartmentSignal(combinedText) || hasNonApartmentSignal(combinedText)) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_non_apartment_property_type', confidence),
    }
  }

  if (candidate.price === null || candidate.price === undefined || candidate.price <= 0) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_missing_price', confidence),
    }
  }

  if (candidate.currency !== 'EUR') {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_non_eur_currency', confidence),
    }
  }

  if (candidate.size_m2 === null || candidate.size_m2 === undefined || candidate.size_m2 <= 0) {
    return {
      accepted: false,
      confidence,
      rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_missing_size', confidence),
    }
  }

  const minSize = brief.min_size_m2
  const maxSize = brief.max_size_m2
  if (typeof candidate.size_m2 === 'number') {
    if (typeof minSize === 'number' && candidate.size_m2 < minSize) {
      return {
        accepted: false,
        confidence,
        rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_size_outside_brief_range', confidence),
      }
    }
    if (typeof maxSize === 'number' && candidate.size_m2 > maxSize) {
      return {
        accepted: false,
        confidence,
        rejection: buildRejection('4zida', candidate, 'low_confidence', 'four_zida_rejected_size_outside_brief_range', confidence),
      }
    }
  }

  return { accepted: true, confidence }
}

const extractGenericOpportunity = (html: string, result: SearchResult): ListingCandidate => {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const text = stripHtml(html)
  const priceMatch = text.match(/(?:€|eur|usd|\$|gbp)\s?([0-9]{2,3}(?:[\.,\s]?[0-9]{3})+|[0-9]{4,7})/i)
  const m2Match = text.match(/([0-9]{2,4})\s?(?:m2|sqm|sq m|m\u00b2)/i)
  const currency = /€|eur/i.test(priceMatch?.[0] ?? '')
    ? 'EUR'
    : /usd|\$/i.test(priceMatch?.[0] ?? '')
      ? 'USD'
      : /gbp/i.test(priceMatch?.[0] ?? '')
        ? 'GBP'
        : null

  const imageUrls = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .filter((value) => /^https?:\/\//i.test(value))
    .slice(0, 5)

  const price = priceMatch ? Number(String(priceMatch[1]).replace(/[^0-9]/g, '')) : null
  const size = m2Match ? Number(m2Match[1]) : null
  const propertyType = PROPERTY_KEYWORDS.find((keyword) => text.toLowerCase().includes(keyword)) ?? null
  const cityGuess = result.title.split('|')[0]?.trim() || null

  const extractedTitle = (titleMatch?.[1] ?? result.title ?? '').trim()
  const contentTitleFallback = text
    .split(/\||-|,|\n/)
    .map((part) => part.trim())
    .find((part) => part.length >= 12)

  return {
    title: extractedTitle.length > 0 ? extractedTitle : (contentTitleFallback ?? 'Web listing'),
    description: text.slice(0, 1200) || result.snippet || null,
    price: Number.isFinite(price) ? price : null,
    currency,
    city: cityGuess,
    district: null,
    size_m2: Number.isFinite(size) ? size : null,
    property_type: propertyType,
    source_url: result.url,
    raw_payload: {
      origin: 'web_search',
      snippet: result.snippet,
      extracted_images: imageUrls,
    },
    image_count: imageUrls.length,
  }
}

const extractCardLinks = (
  html: string,
  pageUrl: string,
  portal: PortalKey,
): Array<{ candidate: SearchResult; context: string }> => {
  const cardCandidates: Array<{ candidate: SearchResult; context: string }> = []
  const anchorMatches = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi))
  const pathHints = portal === 'generic' ? [] : PORTAL_PATH_HINTS[portal as Exclude<PortalKey, 'generic'>]

  for (const match of anchorMatches) {
    const href = match[1]
    const absoluteUrl = resolveUrl(href, pageUrl)
    if (!absoluteUrl) continue

    const resolvedPath = getPath(absoluteUrl)
    const anchorText = stripHtml(match[2] ?? '')
    const startIndex = Math.max(0, (match.index ?? 0) - 600)
    const endIndex = Math.min(html.length, (match.index ?? 0) + match[0].length + 600)
    const context = stripHtml(html.slice(startIndex, endIndex))
    const candidate: SearchResult = {
      title: anchorText || context.slice(0, 120),
      url: absoluteUrl,
      snippet: context,
    }

    const hasHint = pathHints.some((hint) => resolvedPath.includes(hint) || anchorText.toLowerCase().includes(hint.replace(/-/g, ' ')))
    const propertyLike = looksPropertyLike(`${anchorText} ${context}`)
    if (!hasHint && !propertyLike) continue
    if (classifyCandidateListing(candidate) === 'irrelevant') continue

    cardCandidates.push({ candidate, context })
  }

  return cardCandidates
}

const buildPortalListing = (
  candidate: SearchResult,
  context: string,
  pageUrl: string,
): ListingCandidate => {
  const priceMatch = context.match(/(?:€|eur|usd|\$|gbp)\s?([0-9]{2,3}(?:[\.,\s]?[0-9]{3})+|[0-9]{4,7})/i)
  const sizeMatch = context.match(/([0-9]{2,4})\s?(?:m2|sqm|sq m|m\u00b2)/i)
  const propertyType = PROPERTY_KEYWORDS.find((keyword) => context.toLowerCase().includes(keyword)) ?? null
  const currency = /€|eur/i.test(priceMatch?.[0] ?? '')
    ? 'EUR'
    : /usd|\$/i.test(priceMatch?.[0] ?? '')
      ? 'USD'
      : /gbp/i.test(priceMatch?.[0] ?? '')
        ? 'GBP'
        : null

  const imageCount = Array.from(context.matchAll(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi)).length

  return {
    title: candidate.title || 'Property listing',
    description: context.slice(0, 600) || candidate.snippet || null,
    price: parseNumeric(priceMatch?.[1]),
    currency,
    city: null,
    district: null,
    size_m2: parseNumeric(sizeMatch?.[1]),
    property_type: propertyType,
    source_url: candidate.url,
    raw_payload: {
      origin: 'web_search_card',
      category_page_url: pageUrl,
    },
    image_count: imageCount,
  }
}

const extractPortalPage = (
  input: PortalExtractionInput,
  portal: PortalKey,
): PortalExtractionOutcome => {
  const metrics = buildMetrics()
  const rejections: ValidationRejection[] = []

  try {
    if (input.classification === 'agency_homepage' || input.classification === 'irrelevant') {
      metrics.listings_skipped += 1
      return { opportunities: [], metrics, rejections }
    }

    if (input.classification === 'individual_listing') {
      const candidate = extractGenericOpportunity(input.html, input.result)
      metrics.listings_found += 1
      const validation = validateListingCandidate(portal, candidate)
      if (!validation.accepted && validation.rejection) {
        applyRejectionMetrics(metrics, validation.rejection)
        rejections.push(validation.rejection)
        return { opportunities: [], metrics, rejections }
      }

      const opportunity = buildRawOpportunity(input.sourceId, input.brief, input.result.url, candidate, {
        portal_key: portal,
        page_classification: input.classification,
        portal_label: PORTAL_LABELS[portal as Exclude<PortalKey, 'generic'>] ?? 'Generic',
        extraction_confidence: validation.confidence,
      })
      metrics.listings_extracted += 1
      return { opportunities: [opportunity], metrics, rejections }
    }

    const cards = extractCardLinks(input.html, input.pageUrl, portal)
    metrics.listings_found += cards.length

    if (cards.length === 0) {
      metrics.listings_skipped += 1
      return { opportunities: [], metrics, rejections }
    }

    const opportunities: RawOpportunity[] = []
    for (const card of cards) {
      const candidate = buildPortalListing(card.candidate, card.context, input.pageUrl)
      const validation = validateListingCandidate(portal, candidate)
      if (!validation.accepted && validation.rejection) {
        applyRejectionMetrics(metrics, validation.rejection)
        rejections.push(validation.rejection)
        continue
      }

      opportunities.push(buildRawOpportunity(input.sourceId, input.brief, card.candidate.url, candidate, {
        portal_key: portal,
        page_classification: input.classification,
        portal_label: PORTAL_LABELS[portal as Exclude<PortalKey, 'generic'>] ?? 'Generic',
        extraction_confidence: validation.confidence,
      }))
    }

    metrics.listings_extracted += opportunities.length
    return { opportunities, metrics, rejections }
  } catch {
    metrics.extraction_errors += 1
    metrics.listings_skipped += 1
    return { opportunities: [], metrics, rejections }
  }
}

export const extractCityExpert = (input: PortalExtractionInput): PortalExtractionOutcome => extractPortalPage(input, 'cityexpert')
export const extract4zida = (input: PortalExtractionInput): PortalExtractionOutcome => {
  const metrics = buildMetrics()
  const rejections: ValidationRejection[] = []

  try {
    if (input.classification === 'agency_homepage' || input.classification === 'irrelevant') {
      metrics.listings_skipped += 1
      return { opportunities: [], metrics, rejections }
    }

    if (input.classification === 'individual_listing') {
      const candidate = extractGenericOpportunity(input.html, input.result)
      metrics.listings_found += 1
      metrics.four_zida_cards_found += 1

      const titleText = candidate.title ?? ''
      const titlePriceSuffix = titleText.match(/([0-9]{2,3}(?:[\.\s]?[0-9]{3})+|[0-9]{4,7})\s?(?:\u20ac|eur)/i)
      const titlePricePrefix = titleText.match(/(?:\u20ac|eur)\s?([0-9]{2,3}(?:[\.\s]?[0-9]{3})+|[0-9]{4,7})/i)
      const titleSizeMatch = titleText.match(/([0-9]{1,3}(?:[\.,][0-9])?)\s?(?:m2|m\u00b2|sqm|sq m)/i)
      const titleCityMatch = titleText.match(/\b(Novi Sad|Beograd|Belgrade|Ni[s\u0161]|Kragujevac|Subotica)\b/i)

      const normalizedCandidate: ListingCandidate = {
        ...candidate,
        price: parseNumeric(titlePriceSuffix?.[1] ?? titlePricePrefix?.[1] ?? null) ?? candidate.price,
        size_m2: parseDecimalNumber(titleSizeMatch?.[1] ?? null) ?? candidate.size_m2,
        city: titleCityMatch?.[1] ?? (hasNoviSadSignal(`${candidate.title} ${candidate.description ?? ''} ${candidate.source_url ?? ''}`) ? 'Novi Sad' : candidate.city),
        district: extractDistrictFromNoviSad(titleText) ?? extractDistrictFromNoviSad(`${candidate.title} ${candidate.description ?? ''}`),
        property_type: 'apartment',
        currency: (parseNumeric(titlePriceSuffix?.[1] ?? titlePricePrefix?.[1] ?? null) ?? candidate.price) ? 'EUR' : candidate.currency,
      }

      const validation = validate4zidaApartmentCandidate(normalizedCandidate, input.brief)
      if (!validation.accepted && validation.rejection) {
        applyRejectionMetrics(metrics, validation.rejection)
        metrics.four_zida_cards_rejected += 1
        rejections.push(validation.rejection)
        return { opportunities: [], metrics, rejections }
      }

      const opportunity = buildRawOpportunity(input.sourceId, input.brief, input.result.url, normalizedCandidate, {
        portal_key: '4zida',
        page_classification: input.classification,
        portal_label: PORTAL_LABELS['4zida'],
        extraction_confidence: validation.confidence,
      })
      metrics.listings_extracted += 1
      metrics.four_zida_cards_extracted += 1
      return { opportunities: [opportunity], metrics, rejections }
    }

    const cards = extract4zidaCardLinks(input.html, input.pageUrl)
    metrics.listings_found += cards.length
    metrics.four_zida_cards_found += cards.length

    if (cards.length === 0) {
      metrics.listings_skipped += 1
      const rejection = buildRejection(
        '4zida',
        {
          title: input.result.title || '4zida category page',
          description: input.result.snippet || null,
          price: null,
          currency: null,
          city: null,
          district: null,
          size_m2: null,
          property_type: null,
          source_url: input.pageUrl,
          raw_payload: { origin: 'web_search' },
          image_count: 0,
        },
        'low_confidence',
        'four_zida_rejected_category_without_listing_cards',
        0,
      )
      applyRejectionMetrics(metrics, rejection)
      rejections.push(rejection)
      return { opportunities: [], metrics, rejections }
    }

    const opportunities: RawOpportunity[] = []
    for (const card of cards) {
      const candidate = build4zidaApartmentListing(card, input.pageUrl)
      const validation = validate4zidaApartmentCandidate(candidate, input.brief)
      if (!validation.accepted && validation.rejection) {
        applyRejectionMetrics(metrics, validation.rejection)
        metrics.four_zida_cards_rejected += 1
        rejections.push(validation.rejection)
        continue
      }

      opportunities.push(buildRawOpportunity(input.sourceId, input.brief, card.candidate.url, {
        ...candidate,
        city: 'Novi Sad',
        property_type: 'apartment',
        currency: 'EUR',
      }, {
        portal_key: '4zida',
        page_classification: input.classification,
        portal_label: PORTAL_LABELS['4zida'],
        extraction_confidence: validation.confidence,
      }))
    }

    metrics.listings_extracted += opportunities.length
    metrics.four_zida_cards_extracted += opportunities.length
    return { opportunities, metrics, rejections }
  } catch {
    metrics.extraction_errors += 1
    metrics.listings_skipped += 1
    return { opportunities: [], metrics, rejections }
  }
}
export const extractNekretnine = (input: PortalExtractionInput): PortalExtractionOutcome => extractPortalPage(input, 'nekretnine')
export const extractHaloOglasi = (input: PortalExtractionInput): PortalExtractionOutcome => extractPortalPage(input, 'halo_oglasi')
export const extractRealitica = (input: PortalExtractionInput): PortalExtractionOutcome => extractPortalPage(input, 'realitica')
export const extractEstitor = (input: PortalExtractionInput): PortalExtractionOutcome => extractPortalPage(input, 'estitor')

export const extractGenericPortal = (input: PortalExtractionInput): PortalExtractionOutcome => extractPortalPage(input, 'generic')

export const classifyPortalPage = (result: SearchResult, html: string): PageClassification => classifyPageBySignals(result, html)

export const routePortalExtractor = (portal: PortalKey) => {
  switch (portal) {
    case 'cityexpert':
      return extractCityExpert
    case '4zida':
      return extract4zida
    case 'nekretnine':
      return extractNekretnine
    case 'halo_oglasi':
      return extractHaloOglasi
    case 'realitica':
      return extractRealitica
    case 'estitor':
      return extractEstitor
    default:
      return extractGenericPortal
  }
}

export const mergePortalMetrics = (target: PortalMetricsMap, addition: PortalMetricsMap) => {
  (Object.keys(target) as PortalKey[]).forEach((portal) => {
    target[portal].listings_found += addition[portal].listings_found
    target[portal].listings_extracted += addition[portal].listings_extracted
    target[portal].listings_skipped += addition[portal].listings_skipped
    target[portal].extraction_errors += addition[portal].extraction_errors
    target[portal].invalid_titles_rejected += addition[portal].invalid_titles_rejected
    target[portal].invalid_urls_rejected += addition[portal].invalid_urls_rejected
    target[portal].low_confidence_rejected += addition[portal].low_confidence_rejected
    target[portal].four_zida_cards_found += addition[portal].four_zida_cards_found
    target[portal].four_zida_cards_extracted += addition[portal].four_zida_cards_extracted
    target[portal].four_zida_cards_rejected += addition[portal].four_zida_cards_rejected
    Object.entries(addition[portal].rejection_reasons).forEach(([reason, count]) => {
      target[portal].rejection_reasons[reason] = (target[portal].rejection_reasons[reason] ?? 0) + count
    })
  })
  return target
}

export const emptyPortalMetrics = (): PortalMetricsMap => createPortalMetrics()
