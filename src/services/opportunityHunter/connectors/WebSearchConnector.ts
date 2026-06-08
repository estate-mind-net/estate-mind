import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

type SearchResult = {
  title: string
  url: string
  snippet: string
}

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
  maxResultsPerRun: number
  provider?: string
}

const PROPERTY_KEYWORDS = [
  'apartment',
  'flat',
  'condo',
  'house',
  'villa',
  'land',
  'parcel',
  'studio',
  'listing',
  'property',
  'real estate',
  'for sale',
]

const toArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseConfig = (input: ConnectorInput): WebSearchConfig => {
  const config = input.source.connector_config
  const allowedDomains = toArray(config.allowed_domains)
  const excludedDomains = toArray(config.excluded_domains)
  const maxRaw = Number(config.max_results_per_run)

  return {
    allowedDomains,
    excludedDomains,
    maxResultsPerRun: Number.isFinite(maxRaw) && maxRaw > 0 ? Math.round(maxRaw) : 20,
    provider: typeof config.provider === 'string' && config.provider.trim().length > 0 ? config.provider.trim() : undefined,
  }
}

const normalizeDomain = (domain: string) => domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

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

const buildQueries = (input: ConnectorInput): string[] => {
  const brief = input.brief
  const countries = brief.countries.length > 0 ? brief.countries : ['']
  const cities = brief.cities.length > 0 ? brief.cities : ['']
  const types = brief.property_types.length > 0 ? brief.property_types : ['property']

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

  return unique.slice(0, 10)
}

const extractFromHtml = (html: string, fallback: SearchResult): Pick<RawOpportunity, 'title' | 'description' | 'price' | 'currency' | 'city' | 'district' | 'size_m2' | 'property_type' | 'source_url' | 'raw_payload'> => {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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
    if (!apiKey) {
      throw new Error('WEB_SEARCH_API_KEY is not configured for web_search source.')
    }

    const config = parseConfig(input)
    const provider = resolveProvider(input, config)
    const queries = buildQueries(input)

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

    const listingLike = allResults
      .filter((result) => keepPropertyLikeResult(result))
      .filter((result) => isDomainAllowed(result.url, config))

    const uniqueByUrl = new Map<string, SearchResult>()
    for (const row of listingLike) {
      if (!uniqueByUrl.has(row.url)) {
        uniqueByUrl.set(row.url, row)
      }
    }

    const bounded = [...uniqueByUrl.values()].slice(0, config.maxResultsPerRun)

    const opportunities: RawOpportunity[] = []
    for (const result of bounded) {
      const html = await safeFetchPage(result.url)
      if (!html) {
        continue
      }

      const extracted = extractFromHtml(html, result)
      opportunities.push({
        source_id: input.source.id,
        external_id: `web-${result.url}`,
        source_url: extracted.source_url,
        title: extracted.title,
        description: extracted.description,
        country: input.brief.countries[0] ?? null,
        city: extracted.city,
        district: extracted.district,
        price: extracted.price,
        currency: extracted.currency ?? input.brief.currency ?? 'EUR',
        size_m2: extracted.size_m2,
        bedrooms: null,
        property_type: extracted.property_type,
        raw_payload: {
          ...extracted.raw_payload,
          provider: provider.name,
          query_count: queries.length,
          source_name: input.source.name,
        },
      })
    }

    if (opportunities.length === 0) {
      throw new Error(`WebSearchConnector found no accessible listing pages for ${input.source.name}.`)
    }

    return opportunities
  }
}
