import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import {
  createPortalMetrics,
  getPortalKey,
  routePortalExtractor,
} from './portalExtractors'

type SearchResult = {
  title: string
  url: string
  snippet: string
}

type PageClassification =
  | 'individual_listing'
  | 'category_page'
  | 'agency_homepage'
  | 'search_results_page'
  | 'irrelevant'

type WebSearchProvider = {
  name: 'tavily' | 'serpapi'
  search(params: {
    query: string
    maxResults: number
    apiKey: string
  }): Promise<SearchResult[]>
}

type WebSearchConfig = {
  allowedDomains: string[]
  excludedDomains: string[]
  excludedUrlPathPatterns: string[]
  maxResultsPerRun: number
  provider?: string
}

type SearchResultRejection = {
  reasonCode: string
  reason: string
  pathPattern?: string
}

type RejectedSearchResult = {
  title: string
  url: string
  domain: string
  classification: PageClassification
  skip_reason: string
  skip_reason_code: string
  path_pattern?: string
}

const DEFAULT_EXCLUDED_URL_PATH_PATTERNS = [
  '/blog/',
  '/news/',
  '/privacy',
  '/cookie',
  '/terms',
  '/about',
  '/contact',
]

const CITYEXPERT_ALLOWED_PATH_PREFIXES = [
  '/prodaja-nekretnina',
  '/izdavanje-nekretnina',
]

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
  'stanovi',
  'apartman',
  'nekretnina',
  'nekretnine',
  'prodaja',
  'oglas',
  'kuća',
  'kuca',
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

const CATEGORY_SEGMENTS = [
  'prodaja-nekretnina',
  'prodaja-stanova',
  'prodaja-placeva',
  'stambeni-objekti/stanovi',
  'placevi',
  'nekretnine',
  'properties-for-sale',
  'property-for-sale',
]

const SEARCH_SEGMENTS = ['search', 'rezultati', 'results', 'pretraga', 'filter', 'listing']

const toArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseConfig = (input: ConnectorInput): WebSearchConfig => {
  const config = input.source.connector_config && typeof input.source.connector_config === 'object'
    ? input.source.connector_config
    : {}
  const allowedDomains = toArray(config.allowed_domains)
  const excludedDomains = toArray(config.excluded_domains)
  const excludedUrlPathPatterns = [
    ...DEFAULT_EXCLUDED_URL_PATH_PATTERNS,
    ...toArray(config.excluded_url_path_patterns),
    ...toArray(config.excluded_path_patterns),
  ]
  const maxRaw = Number(config.max_results_per_run)

  return {
    allowedDomains,
    excludedDomains,
    excludedUrlPathPatterns: [...new Set(excludedUrlPathPatterns.map((pattern) => pattern.toLowerCase()))],
    maxResultsPerRun: Number.isFinite(maxRaw) && maxRaw > 0 ? Math.round(maxRaw) : 20,
    provider: typeof config.provider === 'string' && config.provider.trim().length > 0 ? config.provider.trim() : undefined,
  }
}

const normalizeDomain = (domain: string) => domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

const getUrlDomain = (url: string): string => {
  try {
    return normalizeDomain(new URL(url).hostname)
  } catch {
    return ''
  }
}

const matchesPathPattern = (path: string, pattern: string): boolean => {
  const normalizedPath = path.toLowerCase().replace(/\/+/g, '/') || '/'
  const normalizedPattern = pattern.toLowerCase().replace(/\/+/g, '/')
  if (normalizedPattern.endsWith('/')) {
    return normalizedPath === normalizedPattern.slice(0, -1) || normalizedPath.startsWith(normalizedPattern)
  }
  return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`) || normalizedPath.startsWith(`${normalizedPattern}-`)
}

const getUrlPathRejection = (url: string, config: WebSearchConfig): SearchResultRejection | null => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return {
      reasonCode: 'invalid_url',
      reason: 'Invalid result URL',
    }
  }

  const hostname = normalizeDomain(parsed.hostname)
  const path = parsed.pathname.toLowerCase().replace(/\/+/g, '/') || '/'

  if (hostname === 'cityexpert.rs' || hostname.endsWith('.cityexpert.rs')) {
    if (matchesPathPattern(path, '/blog/')) {
      return {
        reasonCode: 'blog_page_rejected',
        reason: 'CityExpert blog page rejected',
        pathPattern: '/blog/',
      }
    }

    if (!CITYEXPERT_ALLOWED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return {
        reasonCode: 'excluded_path_pattern',
        reason: 'CityExpert path is not a listing or listing-search path',
      }
    }
  }

  const matchedPattern = config.excludedUrlPathPatterns.find((pattern) => matchesPathPattern(path, pattern))
  if (matchedPattern) {
    return {
      reasonCode: 'excluded_path_pattern',
      reason: `URL path matched excluded pattern ${matchedPattern}`,
      pathPattern: matchedPattern,
    }
  }

  return null
}

const getSearchResultRejection = (result: SearchResult, config: WebSearchConfig): SearchResultRejection | null => {
  if (!result.url) {
    return {
      reasonCode: 'missing_url',
      reason: 'Missing result URL',
    }
  }

  const domain = getUrlDomain(result.url)
  if (!domain) {
    return {
      reasonCode: 'invalid_url',
      reason: 'Invalid result URL',
    }
  }

  if (!isDomainAllowed(result.url, config)) {
    return {
      reasonCode: 'excluded_domain',
      reason: 'Domain excluded by source configuration',
    }
  }

  const pathRejection = getUrlPathRejection(result.url, config)
  if (pathRejection) return pathRejection

  if (!keepPropertyLikeResult(result)) {
    return {
      reasonCode: 'not_property_related',
      reason: 'Search result does not look property-related',
    }
  }

  return null
}

const getSkipReason = (result: SearchResult, config: WebSearchConfig, classification: PageClassification): SearchResultRejection => {
  const rejection = getSearchResultRejection(result, config)
  if (rejection) return rejection

  if (classification === 'search_results_page') return { reasonCode: 'search_results_page', reason: 'Search results page' }
  if (classification === 'agency_homepage') return { reasonCode: 'agency_homepage', reason: 'Agency homepage' }
  if (classification === 'category_page') return { reasonCode: 'category_page_without_cards', reason: 'Category page without accessible listing cards' }
  if (classification === 'irrelevant') return { reasonCode: 'irrelevant_result', reason: 'Irrelevant result' }

  return { reasonCode: 'no_extractable_data', reason: 'Listing page did not yield extractable data' }
}

const buildRejectedSearchResults = (results: SearchResult[], config: WebSearchConfig, onlyRejected = false): RejectedSearchResult[] => {
  const uniqueByUrl = new Map<string, SearchResult>()
  for (const row of results) {
    if (!uniqueByUrl.has(row.url)) {
      uniqueByUrl.set(row.url, row)
    }
  }

  return [...uniqueByUrl.values()]
    .flatMap((result) => {
      const classification = classifyPage(result)
      const skipReason = getSkipReason(result, config, classification)
      if (onlyRejected && !getSearchResultRejection(result, config)) return []
      return {
        title: result.title,
        url: result.url,
        domain: getUrlDomain(result.url),
        classification,
        skip_reason: skipReason.reason,
        skip_reason_code: skipReason.reasonCode,
        ...(skipReason.pathPattern ? { path_pattern: skipReason.pathPattern } : {}),
      }
    })
    .slice(0, 10)
}

const isDomainAllowed = (url: string, config: WebSearchConfig): boolean => {
  let hostname = ''
  try {
    hostname = normalizeDomain(new URL(url).hostname)
  } catch {
    return false
  }

  const excluded = config.excludedDomains.map(normalizeDomain)
  if (excluded.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return false
  }

  if (config.allowedDomains.length === 0) return true

  const allowed = config.allowedDomains.map(normalizeDomain)
  return allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

const keepPropertyLikeResult = (result: SearchResult): boolean => {
  const text = `${result.title} ${result.snippet}`.toLowerCase()
  return PROPERTY_KEYWORDS.some((keyword) => text.includes(keyword))
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

const classifyPage = (result: SearchResult, html?: string): PageClassification => {
  let url: URL
  try {
    url = new URL(result.url)
  } catch {
    return 'irrelevant'
  }

  const path = url.pathname.toLowerCase().replace(/\/+$/, '')
  const query = url.search.toLowerCase()
  const text = `${result.title} ${result.snippet} ${html ? stripHtml(html).slice(0, 1200) : ''}`.toLowerCase()
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] ?? ''
  const pathWithQuery = `${path} ${query}`

  if (!keepPropertyLikeResult(result)) {
    return 'irrelevant'
  }

  if (SEARCH_SEGMENTS.some((segment) => pathWithQuery.includes(segment)) || /properties for sale in|search results|rezultati/i.test(result.title)) {
    return 'search_results_page'
  }

  if (CATEGORY_SEGMENTS.some((segment) => path.includes(segment)) || /for sale in|buy apartment|agencija|real estate agency/i.test(result.title)) {
    const looksLikeListing = /oglas|nekretnina|property|stan|apartment|house|villa/i.test(lastSegment)
      && /\d/.test(lastSegment)
    if (!looksLikeListing) {
      return segments.length <= 1 ? 'agency_homepage' : 'category_page'
    }
  }

  if (segments.length <= 1 && /agency|agencija|real estate/i.test(text)) {
    return 'agency_homepage'
  }

  const looksLikeIndividual = /\d/.test(lastSegment)
    || /oglas|nekretnina|property|stan|apartman|house|villa|plac|placevi|parcela|zemljište|zemljiste|salaš|salas/i.test(lastSegment)
    || /price|cena|eur|€/.test(text)

  return looksLikeIndividual ? 'individual_listing' : 'category_page'
}

const buildRawOpportunity = (
  sourceId: string,
  brief: ConnectorInput['brief'],
  resultUrl: string,
  extracted: Pick<RawOpportunity, 'title' | 'description' | 'price' | 'currency' | 'city' | 'district' | 'size_m2' | 'property_type' | 'source_url' | 'raw_payload'>,
  extraPayload: Record<string, unknown>,
): RawOpportunity => ({
  source_id: sourceId,
  external_id: `web-${resultUrl}`,
  source_url: extracted.source_url,
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

const extractListingCardsFromHtml = (html: string, pageUrl: string): RawOpportunity[] => {
  const cards = new Map<string, RawOpportunity>()
  const anchorMatches = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi))

  for (const match of anchorMatches) {
    const href = match[1]
    const absoluteUrl = resolveUrl(href, pageUrl)
    if (!absoluteUrl) continue

    const anchorText = stripHtml(match[2] ?? '')
    const startIndex = Math.max(0, (match.index ?? 0) - 600)
    const endIndex = Math.min(html.length, (match.index ?? 0) + match[0].length + 600)
    const context = stripHtml(html.slice(startIndex, endIndex))
    const candidateResult: SearchResult = {
      title: anchorText || context.slice(0, 120),
      url: absoluteUrl,
      snippet: context,
    }

    if (classifyPage(candidateResult) !== 'individual_listing') continue
    if (!keepPropertyLikeResult(candidateResult) && !PROPERTY_KEYWORDS.some((keyword) => context.toLowerCase().includes(keyword))) continue

    const priceMatch = context.match(/(?:€|eur|usd|\$|gbp)\s?([0-9]{2,3}(?:[\.,\s]?[0-9]{3})+|[0-9]{4,7})/i)
    const sizeMatch = context.match(/([0-9]{2,4})\s?(?:m2|sqm|sq m|m\u00b2)/i)
    const propertyType = PROPERTY_KEYWORDS.find((keyword) => context.toLowerCase().includes(keyword)) ?? null

    const title = anchorText || candidateResult.title || 'Property listing'
    const description = context.slice(0, 600) || null
    const price = parseNumeric(priceMatch?.[1])
    const size = parseNumeric(sizeMatch?.[1])
    const currency = /€|eur/i.test(priceMatch?.[0] ?? '')
      ? 'EUR'
      : /usd|\$/i.test(priceMatch?.[0] ?? '')
        ? 'USD'
        : /gbp/i.test(priceMatch?.[0] ?? '')
          ? 'GBP'
          : null

    cards.set(absoluteUrl, {
      title,
      description,
      price,
      currency,
      city: null,
      district: null,
      size_m2: size,
      property_type: propertyType,
      source_url: absoluteUrl,
      raw_payload: {
        origin: 'web_search_card',
        category_page_url: pageUrl,
      },
    })
  }

  return [...cards.values()]
}

const buildQueries = (input: ConnectorInput): string[] => {
  const brief = input.brief
  const countries = brief.countries.length > 0 ? brief.countries : ['']
  const cities = brief.cities.length > 0 ? brief.cities : ['']
  const types = brief.property_types.length > 0 ? brief.property_types : ['property']
  const isLandParcelBrief = brief.property_types.some((type) => /\b(land|parcel|plot|plac|placevi|parcela|zemljište|zemljiste)\b/i.test(type))

  const strategyHint = brief.rental_strategy === 'airbnb'
    ? 'short term rental'
    : brief.rental_strategy === 'flip'
      ? 'value-add property'
      : 'for sale'

  const priceHint = [
    brief.min_price ? `min ${Math.round(brief.min_price)}` : '',
    brief.max_price ? `max ${Math.round(brief.max_price)}` : '',
    brief.currency ?? '',
  ].filter(Boolean).join(' ')

  const sizeHint = [
    brief.min_size_m2 ? `min ${Math.round(brief.min_size_m2)}m2` : '',
    brief.max_size_m2 ? `max ${Math.round(brief.max_size_m2)}m2` : '',
  ].filter(Boolean).join(' ')

  const queries: string[] = []
  const templates = [
    '{type} for sale {city} {country} {strategy} {price} {size} listing',
    '{type} listing {city} {country} {price} {size}',
    'buy {type} {city} {country} real estate',
    '{type} property portal {city} {country}',
    '{type} investment opportunity {city} {country} {strategy}',
  ]

  const render = (template: string, values: Record<string, string>) => {
    return template
      .replace('{type}', values.type)
      .replace('{city}', values.city)
      .replace('{country}', values.country)
      .replace('{strategy}', values.strategy)
      .replace('{price}', values.price)
      .replace('{size}', values.size)
      .replace(/\s+/g, ' ')
      .trim()
  }

  for (const country of countries.slice(0, 3)) {
    for (const city of cities.slice(0, 4)) {
      for (const propertyType of types.slice(0, 3)) {
        for (const template of templates.slice(0, 3)) {
          const query = render(template, {
            type: propertyType,
            city,
            country,
            strategy: strategyHint,
            price: priceHint,
            size: sizeHint,
          })
          if (query.length > 0) {
            queries.push(query)
          }
        }
      }
    }
  }

  if (brief.districts.length > 0) {
    for (const district of brief.districts.slice(0, 3)) {
      queries.push([
        'property for sale',
        district,
        brief.cities[0] ?? '',
        brief.countries[0] ?? '',
        priceHint,
      ].filter(Boolean).join(' '))
    }
  }

  let unique = [...new Set(queries)]

  if (unique.length < 5) {
    const firstType = types[0] ?? 'property'
    const firstCity = cities[0] ?? ''
    const firstCountry = countries[0] ?? ''
    const padding = [
      `${firstType} for sale ${firstCity} ${firstCountry} owner listed`,
      `${firstType} real estate ${firstCity} ${firstCountry} under market`,
      `${firstType} listing ${firstCity} ${firstCountry} investment`,
      `${firstType} property ${firstCity} ${firstCountry} best deals`,
      `${firstType} listing ${firstCity} ${firstCountry} verified portal`,
    ].map((value) => value.replace(/\s+/g, ' ').trim())

    unique = [...new Set([...unique, ...padding])]
  }

  const firstCity = cities[0] ?? ''
  const firstSize = brief.max_size_m2 ?? brief.min_size_m2
  const firstSizeTerm = firstSize ? `${Math.round(firstSize)}m2` : ''
  const targetingText = [
    input.source.name,
    brief.title,
    ...countries,
    ...cities,
    ...brief.districts,
  ].join(' ').toLowerCase()
  const isSerbiaTarget = /serbia|srbija|novi sad|beograd|belgrade/.test(targetingText)
  const isMontenegroTarget = /montenegro|crna gora|budva|tivat|kotor|seaside|sea view|coast|primorje/.test(targetingText)
  const targetedQueries: string[] = []

  if (isSerbiaTarget) {
    const serbiaCity = firstCity || 'Novi Sad'
    if (isLandParcelBrief) {
      targetedQueries.push(
        'plac prodaja Fruška Gora',
        'građevinski plac Fruška Gora',
        'plac Ledinci prodaja',
        'plac Rakovac prodaja',
        'plac Sremska Kamenica prodaja',
        'vikend plac Fruška Gora',
        'zemljište prodaja Novi Sad okolina',
        'placevi na prodaju Fruška Gora',
        'site:4zida.rs/prodaja-placeva Fruška Gora',
        'site:halooglasi.com/nekretnine/prodaja-placeva Fruška Gora',
        'site:nekretnine.rs/placevi Fruška Gora',
        'site:oglasi.rs nekretnine plac Fruška Gora',
        'site:sasomange.rs plac Fruška Gora prodaja',
      )
    } else {
      targetedQueries.push(
        `site:cityexpert.rs/prodaja-nekretnina stan ${serbiaCity} ${firstSizeTerm}`,
        `site:4zida.rs/prodaja-stanova ${serbiaCity} ${firstSizeTerm}`,
        `site:nekretnine.rs/stambeni-objekti/stanovi ${serbiaCity} ${firstSizeTerm}`,
        `site:halooglasi.com/nekretnine/prodaja-stanova ${serbiaCity} ${firstSizeTerm}`,
      )
    }
  }

  if (isMontenegroTarget) {
    targetedQueries.push(
      'site:realitica.com apartman Budva prodaja',
      'site:realitica.com stan Tivat prodaja',
      'site:realitica.com apartment Budva sale',
      'site:realitica.com Montenegro apartment sea view sale',
    )
  }

  unique = [...new Set([
    ...targetedQueries.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean),
    ...unique,
  ])]

  return unique.slice(0, isLandParcelBrief ? 14 : 10)
}

const extractFromHtml = (html: string, fallback: SearchResult): Pick<RawOpportunity, 'title' | 'description' | 'price' | 'currency' | 'city' | 'district' | 'size_m2' | 'property_type' | 'source_url' | 'raw_payload'> => {
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

  const price = priceMatch
    ? Number(String(priceMatch[1]).replace(/[^0-9]/g, ''))
    : null

  const size = m2Match ? Number(m2Match[1]) : null

  const propertyType = PROPERTY_KEYWORDS.find((keyword) => text.toLowerCase().includes(keyword)) ?? null

  const imageUrls = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .filter((value) => /^https?:\/\//i.test(value))
    .slice(0, 5)

  const cityGuess = fallback.title.split('|')[0]?.trim() || null

  return {
    title: (titleMatch?.[1] ?? fallback.title ?? 'Web listing').trim(),
    description: text.slice(0, 1200) || fallback.snippet || null,
    price: Number.isFinite(price) ? price : null,
    currency,
    city: cityGuess,
    district: null,
    size_m2: Number.isFinite(size) ? size : null,
    property_type: propertyType,
    source_url: fallback.url,
    raw_payload: {
      origin: 'web_search',
      snippet: fallback.snippet,
      extracted_images: imageUrls,
    },
  }
}

const tavilyProvider: WebSearchProvider = {
  name: 'tavily',
  async search(params) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: params.apiKey,
        query: params.query,
        search_depth: 'basic',
        max_results: params.maxResults,
        include_answer: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Web search provider tavily failed (${response.status}).`)
    }

    const payload = await response.json() as {
      results?: Array<{ title?: string; url?: string; content?: string }>
    }

    const rows = Array.isArray(payload.results) ? payload.results : []
    return rows
      .filter((row) => typeof row.url === 'string' && row.url.length > 0)
      .map((row) => ({
        title: row.title ?? row.url ?? 'Untitled listing result',
        url: row.url ?? '',
        snippet: row.content ?? '',
      }))
  },
}

const serpApiProvider: WebSearchProvider = {
  name: 'serpapi',
  async search(params) {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google')
    url.searchParams.set('q', params.query)
    url.searchParams.set('api_key', params.apiKey)
    url.searchParams.set('num', String(Math.max(1, Math.min(10, params.maxResults))))

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Web search provider serpapi failed (${response.status}).`)
    }

    const payload = await response.json() as {
      organic_results?: Array<{ title?: string; link?: string; snippet?: string }>
    }

    const rows = Array.isArray(payload.organic_results) ? payload.organic_results : []
    return rows
      .filter((row) => typeof row.link === 'string' && row.link.length > 0)
      .map((row) => ({
        title: row.title ?? row.link ?? 'Untitled listing result',
        url: row.link ?? '',
        snippet: row.snippet ?? '',
      }))
  },
}

const resolveProvider = (input: ConnectorInput, config: WebSearchConfig): WebSearchProvider => {
  const requested = (config.provider ?? process.env.VITE_WEB_SEARCH_PROVIDER ?? '').toLowerCase()
  if (requested === 'serpapi') return serpApiProvider
  return tavilyProvider
}

const isHtmlContent = (contentType: string | null): boolean => {
  if (!contentType) return true
  return contentType.toLowerCase().includes('text/html')
}

const safeFetchPage = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) return null
    if (!isHtmlContent(response.headers.get('content-type'))) return null

    return await response.text()
  } catch {
    return null
  }
}

export class WebSearchConnector implements OpportunityConnector {
  name = 'WebSearchConnector'
  type = 'web_search'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const apiKey = process.env.WEB_SEARCH_API_KEY ?? ''
    const config = parseConfig(input)
    const provider = resolveProvider(input, config)

    console.log('[WEB SEARCH CONFIG]', {
      provider: provider.name,
      apiKeyExists: Boolean(apiKey),
      allowedDomains: config.allowedDomains.length,
      excludedDomains: config.excludedDomains.length,
      maxResultsPerRun: config.maxResultsPerRun,
      sourceType: input.source.type,
      sourceName: input.source.name,
      briefTitle: input.brief.title,
    })

    if (!apiKey) {
      input.onTrace?.({
        stage: 'error',
        data: {
          message: 'WEB_SEARCH_API_KEY is not configured for web_search source.',
        },
      })
      throw new Error('WEB_SEARCH_API_KEY is not configured for web_search source.')
    }

    const queries = buildQueries(input)
    input.onTrace?.({
      stage: 'search_queries_generated',
      data: {
        queryCount: queries.length,
        queries,
      },
    })

    const perQueryMax = Math.max(2, Math.min(10, Math.ceil(config.maxResultsPerRun / Math.max(1, queries.length))))

    const allResults: SearchResult[] = []
    for (const query of queries) {
      const rows = await provider.search({
        query,
        maxResults: perQueryMax,
        apiKey,
      })
      allResults.push(...rows)
    }

    input.onTrace?.({
      stage: 'search_results_returned',
      data: {
        searchResultsCount: allResults.length,
      },
    })

    const rejectedSearchResults = buildRejectedSearchResults(allResults, config, true)
    if (rejectedSearchResults.length > 0) {
      input.onTrace?.({
        stage: 'raw_search_results',
        data: {
          rawSearchResults: rejectedSearchResults,
        },
      })
    }

    const listingLike = allResults.filter((result) => !getSearchResultRejection(result, config))

    const uniqueByUrl = new Map<string, SearchResult>()
    for (const row of listingLike) {
      if (!uniqueByUrl.has(row.url)) {
        uniqueByUrl.set(row.url, row)
      }
    }

    const bounded = [...uniqueByUrl.values()].slice(0, config.maxResultsPerRun)
    const prioritized = [...bounded].sort((left, right) => {
      const leftClass = classifyPage(left)
      const rightClass = classifyPage(right)
      const score = (classification: PageClassification) => {
        if (classification === 'individual_listing') return 0
        if (classification === 'category_page') return 1
        if (classification === 'search_results_page') return 2
        if (classification === 'agency_homepage') return 3
        return 4
      }
      return score(leftClass) - score(rightClass)
    })

    const opportunities: RawOpportunity[] = []
    let categoryPagesSkipped = 0
    let listingPagesFound = 0
    let listingCardsExtracted = 0
    let invalidTitlesRejected = 0
    let invalidUrlsRejected = 0
    let lowConfidenceRejected = 0
    const portalMetrics = createPortalMetrics()
    const validationRejections: Array<Record<string, unknown>> = []

    for (const result of prioritized) {
      const html = await safeFetchPage(result.url)
      if (!html) {
        continue
      }

      const classification = classifyPage(result, html)
      const portal = getPortalKey(result.url)
      if (classification === 'individual_listing') {
        listingPagesFound += 1
      }

      input.onTrace?.({
        stage: 'page_classified',
        data: {
          url: result.url,
          classification,
          portal,
          skipped: classification === 'category_page' || classification === 'search_results_page' || classification === 'agency_homepage' || classification === 'irrelevant',
          cardsExtracted: 0,
        },
      })

      if (classification === 'agency_homepage' || classification === 'irrelevant') {
        portalMetrics[portal].listings_skipped += 1
        continue
      }

      const extractor = routePortalExtractor(portal)
      const extracted = extractor({
        portal,
        classification,
        html,
        pageUrl: result.url,
        result,
        brief: input.brief,
        sourceId: input.source.id,
      })

      portalMetrics[portal].listings_found += extracted.metrics.listings_found
      portalMetrics[portal].listings_extracted += extracted.metrics.listings_extracted
      portalMetrics[portal].listings_skipped += extracted.metrics.listings_skipped
      portalMetrics[portal].extraction_errors += extracted.metrics.extraction_errors
      portalMetrics[portal].invalid_titles_rejected += extracted.metrics.invalid_titles_rejected
      portalMetrics[portal].invalid_urls_rejected += extracted.metrics.invalid_urls_rejected
      portalMetrics[portal].low_confidence_rejected += extracted.metrics.low_confidence_rejected

      invalidTitlesRejected += extracted.metrics.invalid_titles_rejected
      invalidUrlsRejected += extracted.metrics.invalid_urls_rejected
      lowConfidenceRejected += extracted.metrics.low_confidence_rejected
      validationRejections.push(...extracted.rejections)

      if (extracted.opportunities.length === 0) {
        if (classification === 'category_page' || classification === 'search_results_page') {
          categoryPagesSkipped += 1
        }
        continue
      }

      if (classification === 'category_page' || classification === 'search_results_page') {
        listingCardsExtracted += extracted.opportunities.length
        input.onTrace?.({
          stage: 'page_classified',
          data: {
            url: result.url,
            classification,
            portal,
            skipped: false,
            cardsExtracted: extracted.opportunities.length,
          },
        })
      }

      for (const opportunity of extracted.opportunities) {
        opportunities.push({
          ...opportunity,
          raw_payload: {
            ...opportunity.raw_payload,
            provider: provider.name,
            query_count: queries.length,
            source_name: input.source.name,
            page_classification: classification,
            category_pages_skipped: categoryPagesSkipped,
            listing_pages_found: listingPagesFound,
            listing_cards_extracted: listingCardsExtracted,
            portal_metrics: portalMetrics,
          },
        })
      }
    }

    input.onTrace?.({
      stage: 'listings_extracted',
      data: {
        extractedOpportunitiesCount: opportunities.length,
        categoryPagesSkipped,
        listingPagesFound,
        listingCardsExtracted,
        invalid_titles_rejected: invalidTitlesRejected,
        invalid_urls_rejected: invalidUrlsRejected,
        low_confidence_rejected: lowConfidenceRejected,
        portalMetrics,
        validationRejections,
      },
    })

    if (opportunities.length === 0) {
      const seenTraceUrls = new Set<string>()
      const rawSearchResults = [
        ...rejectedSearchResults,
        ...buildRejectedSearchResults(prioritized, config),
      ].filter((row) => {
        if (seenTraceUrls.has(row.url)) return false
        seenTraceUrls.add(row.url)
        return true
      }).slice(0, 10)
      input.onTrace?.({
        stage: 'raw_search_results',
        data: {
          rawSearchResults,
        },
      })
      input.onTrace?.({
        stage: 'error',
        data: {
          message: `WebSearchConnector found no accessible listing pages for ${input.source.name}.`,
        },
      })
      throw new Error(`WebSearchConnector found no accessible listing pages for ${input.source.name}.`)
    }

    return opportunities
  }
}
