import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import { resolveWebSearchProvider } from './WebSearchConnector'

type SearchResult = {
  title: string
  url: string
  snippet: string
}

const RENT_KEYWORDS = [
  'izdavanje', 'iznajmljivanje', 'rent', 'rental', 'letting',
  'stan', 'stanovi', 'apartman', 'apartment', 'flat',
  'nekretnina', 'nekretnine', 'property',
  'mesečno', 'mjesecno', 'monthly', 'mesecno',
  'dnevno', 'daily',
]

const PORTAL_DOMAINS: Record<string, string> = {
  '4zida': '4zida.rs',
  'cityexpert': 'cityexpert.rs',
  'halo oglasi': 'halooglasi.com',
  'halooglasi': 'halooglasi.com',
  'nekretnine': 'nekretnine.rs',
  'sasomange': 'sasomange.rs',
}

const PORTAL_QUERIES: Record<string, (city: string, district?: string, maxPrice?: number, bedrooms?: number) => string[]> = {
  '4zida': (city, district, maxPrice, bedrooms) => {
    const base = `site:4zida.rs izdavanje stanova ${city}`
    const queries = [base]
    if (district) queries.push(`${base} ${district}`)
    if (maxPrice) queries.push(`${base} ${maxPrice} eur`)
    if (bedrooms) queries.push(`${base} ${bedrooms} sobe`)
    return queries
  },
  'cityexpert': (city, district) => {
    const base = `site:cityexpert.rs/izdavanje-nekretnina stan ${city}`
    return district ? [`${base} ${district}`] : [base]
  },
  'halo oglasi': (city, district, maxPrice) => {
    const base = `site:halooglasi.com izdavanje stanova ${city}`
    const queries = [base]
    if (district) queries.push(`${base} ${district}`)
    if (maxPrice) queries.push(`${base} ${maxPrice}`)
    return queries
  },
}

const toArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseNumeric = (value: string | null | undefined): number | null => {
  if (!value) return null
  const parsed = Number(String(value).replace(/[^0-9]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const stripHtml = (value: string): string => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const buildRentQueries = (input: ConnectorInput, config: RentWebSearchConfig): string[] => {
  const brief = input.brief
  const city = brief.cities[0] ?? ''
  const districts = toArray(brief.districts)
  const maxPrice = brief.max_price ?? undefined
  const briefRecord = brief as unknown as Record<string, unknown>
  const moduleDataRaw = briefRecord.module_data as Record<string, unknown> | undefined
  const bedrooms = moduleDataRaw?.bedrooms as number | undefined
  const portals = config.portals.length > 0 ? config.portals : ['4zida', 'cityexpert', 'halo oglasi']

  const override = config.searchQueryOverride
  if (override && override.trim().length > 0) {
    return [override.trim()]
  }

  const queries: string[] = []

  for (const portal of portals) {
    const portalLower = portal.toLowerCase()
    const queryFn = PORTAL_QUERIES[portalLower]
    if (queryFn) {
      queries.push(...queryFn(city, districts[0], maxPrice, bedrooms))
    } else {
      // Generic portal query
      const domain = PORTAL_DOMAINS[portalLower]
      if (domain) {
        queries.push(`site:${domain} izdavanje stanova ${city}`)
      } else {
        queries.push(`${portal} izdavanje stanova ${city}`)
      }
    }
  }

  // District-specific queries
  if (districts.length > 0) {
    for (const district of districts.slice(0, 3)) {
      queries.push(`izdavanje stanova ${city} ${district} ${maxPrice ? `${maxPrice} eur` : ''}`.trim())
    }
  }

  // Fallback generic rent query
  if (queries.length === 0) {
    queries.push(`izdavanje stanova ${city}`)
  }

  return [...new Set(queries)].slice(0, 10)
}

const inferCity = (text: string): string | null => {
  const cities = ['novi sad', 'beograd', 'belgrade', 'niš', 'nis', 'subotica', 'kragujevac', 'zrenjanin']
  const lower = text.toLowerCase()
  for (const city of cities) {
    if (lower.includes(city)) return city.charAt(0).toUpperCase() + city.slice(1)
  }
  return null
}

const inferDistrict = (text: string): string | null => {
  const districts = ['liman', 'detelinara', 'grbavica', 'podbara', 'stari grad', 'sremska kamenica', 'petrovaradin', 'telep', 'adice', 'novi beograd', 'vračar', 'vračar', 'savski venac', 'zemun', 'dorćol']
  const lower = text.toLowerCase()
  for (const d of districts) {
    if (lower.includes(d)) return d.charAt(0).toUpperCase() + d.slice(1)
  }
  return null
}

const inferPriceFromSnippet = (text: string): { price: number | null; currency: string | null } => {
  // Match patterns like "800 EUR", "€800", "800 €", "800 evra"
  const match = text.match(/(?:€|eur|evra)\s?([0-9]{2,3}(?:[\.,\s]?[0-9]{3})+|[0-9]{3,5})/i)
    ?? text.match(/([0-9]{2,3}(?:[\.,\s]?[0-9]{3})+|[0-9]{3,5})\s?(?:€|eur|evra)/i)
  if (!match) return { price: null, currency: null }
  const price = parseNumeric(match[1])
  const currency = /€|eur|evra/i.test(match[0]) ? 'EUR' : null
  return { price, currency }
}

const inferSizeFromSnippet = (text: string): number | null => {
  const match = text.match(/([0-9]{2,4})\s?(?:m2|m²|kv|sqm)/i)
  return match ? parseNumeric(match[1]) : null
}

const inferBedroomsFromSnippet = (text: string): number | null => {
  const match = text.match(/(\d)\s?(?:sob|stan|room|bed|br\.?\s* soba)/i)
  return match ? parseNumeric(match[1]) : null
}

type RentWebSearchConfig = {
  portals: string[]
  maxResults: number
  searchQueryOverride: string | null
}

const parseConfig = (input: ConnectorInput): RentWebSearchConfig => {
  const config = input.source.connector_config && typeof input.source.connector_config === 'object'
    ? input.source.connector_config as Record<string, unknown>
    : {}
  return {
    portals: toArray(config.portals),
    maxResults: Number.isFinite(Number(config.maxResults)) && Number(config.maxResults) > 0
      ? Math.round(Number(config.maxResults))
      : 20,
    searchQueryOverride: typeof config.searchQueryOverride === 'string' && config.searchQueryOverride.trim().length > 0
      ? config.searchQueryOverride.trim()
      : null,
  }
}

export class RentWebSearchConnector implements OpportunityConnector {
  name = 'RentWebSearchConnector'
  type = 'rent_web_search'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const apiKey = process.env.WEB_SEARCH_API_KEY ?? ''

    input.onTrace?.({
      stage: 'connector_execution',
      data: {
        connector: this.name,
        apiKeyExists: Boolean(apiKey),
      },
    })

    if (!apiKey) {
      input.onTrace?.({
        stage: 'error',
        data: {
          message: 'WEB_SEARCH_API_KEY not configured. Use Saved Search or Manual URL import instead.',
          action_required: true,
          reason: 'web_search_unavailable',
          suggested_action: 'Use Saved Search or Manual URL import.',
        },
      })
      // Don't throw — return empty and let the run finalize as succeeded with 0 results
      // The metadata will contain action_required=true
      return []
    }

    const config = parseConfig(input)
    const provider = resolveWebSearchProvider(input)
    const queries = buildRentQueries(input, config)

    input.onTrace?.({
      stage: 'search_queries_generated',
      data: {
        queryCount: queries.length,
        queries,
      },
    })

    const perQueryMax = Math.max(2, Math.min(10, Math.ceil(config.maxResults / Math.max(1, queries.length))))

    const allResults: SearchResult[] = []
    for (const query of queries) {
      try {
        const rows = await provider.search({
          query,
          maxResults: perQueryMax,
          apiKey,
        })
        allResults.push(...rows)
      } catch (error) {
        input.onTrace?.({
          stage: 'error',
          data: {
            message: `Search query failed: ${query}`,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
        // Continue with other queries
      }
    }

    input.onTrace?.({
      stage: 'search_results_returned',
      data: {
        searchResultsCount: allResults.length,
      },
    })

    // Filter for rent-related results
    const rentResults = allResults.filter((result) => {
      const text = `${result.title} ${result.snippet}`.toLowerCase()
      return RENT_KEYWORDS.some((keyword) => text.includes(keyword))
    })

    // Deduplicate by URL
    const uniqueByUrl = new Map<string, SearchResult>()
    for (const row of rentResults) {
      if (!uniqueByUrl.has(row.url)) {
        uniqueByUrl.set(row.url, row)
      }
    }

    const brief = input.brief
    const briefRec = brief as unknown as Record<string, unknown>
    const moduleData = briefRec.module_data as Record<string, unknown> | undefined
    const briefBedrooms = moduleData?.bedrooms as number | null | undefined

    const opportunities: RawOpportunity[] = []
    for (const result of uniqueByUrl.values()) {
      const text = `${result.title} ${result.snippet}`
      const { price, currency } = inferPriceFromSnippet(text)
      const size = inferSizeFromSnippet(text)
      const district = inferDistrict(text) ?? inferDistrict(result.url)
      const city = inferCity(text) ?? brief.cities[0] ?? null
      const bedrooms = inferBedroomsFromSnippet(text)
      const needsManualCompletion = !price || !size

      opportunities.push({
        source_id: input.source.id,
        external_id: `rent-web-${result.url}`,
        source_url: result.url,
        title: result.title || 'Rent listing',
        description: result.snippet?.slice(0, 600) || null,
        country: brief.countries[0] ?? null,
        city,
        district,
        price: price ?? null,
        currency: currency ?? brief.currency ?? 'EUR',
        size_m2: size,
        bedrooms: bedrooms ?? briefBedrooms ?? null,
        property_type: 'apartment',
        raw_payload: {
          origin: 'rent_web_search',
          snippet: result.snippet,
          provider: provider.name,
          monthlyRent: price,
          extractionSource: 'search_snippet',
          needs_manual_completion: needsManualCompletion,
          module_type: 'rent',
        },
      })
    }

    const bounded = opportunities.slice(0, config.maxResults)

    input.onTrace?.({
      stage: 'listings_extracted',
      data: {
        extractedOpportunitiesCount: bounded.length,
        totalSearchResults: allResults.length,
        rentFilteredResults: rentResults.length,
        uniqueResults: uniqueByUrl.size,
      },
    })

    return bounded
  }
}