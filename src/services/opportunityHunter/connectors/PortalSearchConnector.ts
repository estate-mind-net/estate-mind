import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import { resolveWebSearchProvider } from './WebSearchConnector'
import {
  extractPrice,
  extractSize,
  extractBedrooms,
  extractDistrict,
  extractCity,
} from '../../../modules/rent/hunter/services/snippetExtraction'

type SearchResult = {
  title: string
  url: string
  snippet: string
}

const PORTAL_SITE_MAP: Record<string, string> = {
  '4zida': '4zida.rs',
  'cityexpert': 'cityexpert.rs',
  'city expert': 'cityexpert.rs',
  'halo oglasi': 'halooglasi.com',
  'halooglasi': 'halooglasi.com',
}

const RENT_KEYWORDS = [
  'izdavanje', 'iznajmljivanje', 'rent', 'rental', 'letting',
  'stan', 'stanovi', 'apartman', 'apartment', 'flat',
  'mesečno', 'mesecno', 'monthly',
]

type PortalSearchConfig = {
  portal: string | null
  city: string | null
  districts: string[]
  maxRent: number | null
  minRent: number | null
  bedrooms: number | null
  sizeMin: number | null
  sizeMax: number | null
}

const toArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseConfig = (input: ConnectorInput): PortalSearchConfig => {
  const config = input.source.connector_config && typeof input.source.connector_config === 'object'
    ? input.source.connector_config as Record<string, unknown>
    : {}
  return {
    portal: typeof config.portal === 'string' ? config.portal : null,
    city: typeof config.city === 'string' ? config.city : null,
    districts: toArray(config.districts),
    maxRent: Number.isFinite(Number(config.maxRent)) ? Number(config.maxRent) : null,
    minRent: Number.isFinite(Number(config.minRent)) ? Number(config.minRent) : null,
    bedrooms: Number.isFinite(Number(config.bedrooms)) ? Number(config.bedrooms) : null,
    sizeMin: Number.isFinite(Number(config.sizeMin)) ? Number(config.sizeMin) : null,
    sizeMax: Number.isFinite(Number(config.sizeMax)) ? Number(config.sizeMax) : null,
  }
}

const buildQueries = (input: ConnectorInput, config: PortalSearchConfig): string[] => {
  const city = config.city ?? input.brief.cities[0] ?? ''
  const districts = config.districts.length > 0 ? config.districts : (input.brief.districts ?? []).slice(0, 3)
  const portal = config.portal?.toLowerCase() ?? ''
  const domain = PORTAL_SITE_MAP[portal] ?? portal

  const queries: string[] = []

  if (domain) {
    // Portal-specific queries with rent keywords
    const base = `${domain} izdavanje stan ${city}`
    queries.push(base)

    // Site-specific query
    queries.push(`site:${domain} izdavanje stan ${city}`)

    // District-specific queries
    if (districts.length > 0) {
      for (const d of districts.slice(0, 3)) {
        queries.push(`${domain} izdavanje stan ${city} ${d}`)
      }
    }

    // Budget query
    if (config.maxRent) {
      queries.push(`${domain} izdavanje stan ${city} do ${config.maxRent} EUR`)
    }

    // Bedroom query
    if (config.bedrooms) {
      const bedroomWord = config.bedrooms === 1 ? 'jednosoban' : config.bedrooms === 2 ? 'dvosoban' : config.bedrooms === 3 ? 'trosoban' : `${config.bedrooms} sobe`
      queries.push(`${domain} ${bedroomWord} ${city} izdavanje`)
    }

    // Combined district + budget query
    if (districts.length > 0 && config.maxRent) {
      const d = districts[0]
      queries.push(`${domain} izdavanje stan ${city} ${d} do ${config.maxRent} EUR`)
    }
  } else {
    // No portal specified — generic rent queries
    const base = `izdavanje stanova ${city}`
    queries.push(base)
    for (const d of districts.slice(0, 3)) {
      queries.push(`${base} ${d}`)
    }
  }

  return [...new Set(queries)].slice(0, 10)
}

export class PortalSearchConnector implements OpportunityConnector {
  name = 'PortalSearchConnector'
  type = 'portal_search'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const apiKey = process.env.WEB_SEARCH_API_KEY ?? ''
    const providerConfigured = Boolean(apiKey)
    const config = parseConfig(input)
    const provider = resolveWebSearchProvider(input)
    const queries = buildQueries(input, config)

    const diagnostics: Record<string, unknown> = {
      connector: this.name,
      providerConfigured,
      providerName: provider.name,
      portal: config.portal,
      city: config.city,
      districts: config.districts,
      generatedQueries: queries,
      queryResultsCount: {} as Record<string, number>,
      totalResultsBeforeFiltering: 0,
      totalResultsAfterRentalKeywordFilter: 0,
      totalResultsAfterDedup: 0,
      totalResultsAfterConfigFilter: 0,
      rawOpportunitiesReturned: 0,
      rejectionReasons: {} as Record<string, number>,
    }

    input.onTrace?.({
      stage: 'connector_execution',
      data: { ...diagnostics },
    })

    if (!apiKey) {
      diagnostics.error = 'WEB_SEARCH_API_KEY not configured'
      input.onTrace?.({
        stage: 'error',
        data: {
          ...diagnostics,
          message: 'WEB_SEARCH_API_KEY not configured. Add WEB_SEARCH_API_KEY to your environment.',
          action_required: true,
          reason: 'web_search_unavailable',
          suggested_action: 'Add WEB_SEARCH_API_KEY to .env.local',
        },
      })
      return []
    }

    const allResults: SearchResult[] = []
    for (const query of queries) {
      try {
        const rows = await provider.search({ query, maxResults: 10, apiKey })
        ;(diagnostics.queryResultsCount as Record<string, number>)[query] = rows.length
        allResults.push(...rows)
      } catch (error) {
        ;(diagnostics.queryResultsCount as Record<string, number>)[query] = -1
        ;(diagnostics.rejectionReasons as Record<string, number>)[`query_error: ${query}`] = 1
        input.onTrace?.({
          stage: 'error',
          data: { message: `Query failed: ${query}`, error: error instanceof Error ? error.message : 'Unknown' },
        })
      }
    }
    diagnostics.totalResultsBeforeFiltering = allResults.length

    if (allResults.length === 0) {
      diagnostics.error = 'Search API returned zero results'
      input.onTrace?.({
      stage: 'listings_extracted',
      data: { ...diagnostics, message: 'Search API returned zero results for all queries. Check WEB_SEARCH_API_KEY and provider availability.' },
      })
      return []
    }

    // Filter for rent-related
    const rentResults = allResults.filter((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase()
      return RENT_KEYWORDS.some((kw) => text.includes(kw))
    })
    diagnostics.totalResultsAfterRentalKeywordFilter = rentResults.length

    if (rentResults.length === 0) {
      // Try without rental keyword filter — search results may still be valid
      diagnostics.rentFilterRelaxed = true
      // Use all results if rental filter eliminates everything
      const useResults = allResults
      diagnostics.totalResultsAfterRentalKeywordFilter = useResults.length

      // Deduplicate by URL
      const unique = new Map<string, SearchResult>()
      for (const r of useResults) {
        if (!unique.has(r.url)) unique.set(r.url, r)
      }
      diagnostics.totalResultsAfterDedup = unique.size

      const brief = input.brief
      const briefBedrooms = ((brief as unknown as Record<string, unknown>).module_data as Record<string, unknown> | undefined)?.bedrooms as number | null | undefined
      const city = config.city ?? brief.cities[0] ?? null

      const opportunities: RawOpportunity[] = []
      for (const result of unique.values()) {
        opportunities.push(this.buildOpportunity(input, result, config, provider.name, city, briefBedrooms, true))
      }
      diagnostics.totalResultsAfterConfigFilter = opportunities.length
      diagnostics.rawOpportunitiesReturned = opportunities.length

      input.onTrace?.({
      stage: 'listings_extracted',
      data: { ...diagnostics, note: 'Rental keyword filter was too strict — relaxed to include all results.' },
      })
      return opportunities.slice(0, 20)
    }

    // Deduplicate by URL
    const unique = new Map<string, SearchResult>()
    for (const r of rentResults) {
      if (!unique.has(r.url)) unique.set(r.url, r)
    }
    diagnostics.totalResultsAfterDedup = unique.size

    const brief = input.brief
    const briefBedrooms = ((brief as unknown as Record<string, unknown>).module_data as Record<string, unknown> | undefined)?.bedrooms as number | null | undefined
    const city = config.city ?? brief.cities[0] ?? null

    const opportunities: RawOpportunity[] = []
    let configFilteredOut = 0
    for (const result of unique.values()) {
      const text = `${result.title} ${result.snippet}`

      const priceResult = extractPrice(text)
      const sizeResult = extractSize(text)
      const bedroomsResult = extractBedrooms(text)

      const price = priceResult.value
      const size = sizeResult.value
      const bedrooms = bedroomsResult.value

      // Config filters: only skip if we have extracted data AND it's clearly outside range
      if (config.maxRent && price && price > config.maxRent * 1.1) {
        configFilteredOut++
        continue
      }
      if (config.minRent && price && price < config.minRent * 0.9) {
        configFilteredOut++
        continue
      }
      if (config.sizeMax && size && size > config.sizeMax * 1.1) {
        configFilteredOut++
        continue
      }
      if (config.sizeMin && size && size < config.sizeMin * 0.9) {
        configFilteredOut++
        continue
      }
      // Bedrooms: only filter if explicitly extracted and mismatched
      if (config.bedrooms && bedrooms && bedrooms !== config.bedrooms && bedrooms !== config.bedrooms + 0.5) {
        configFilteredOut++
        continue
      }

      opportunities.push(this.buildOpportunity(input, result, config, provider.name, city, briefBedrooms, false))
    }
    diagnostics.totalResultsAfterConfigFilter = opportunities.length
    diagnostics.configFilteredOut = configFilteredOut
    diagnostics.rawOpportunitiesReturned = opportunities.length

    const bounded = opportunities.slice(0, 20)

    input.onTrace?.({
      stage: 'listings_extracted',
      data: { ...diagnostics },
    })

    return bounded
  }

  private buildOpportunity(
    input: ConnectorInput,
    result: SearchResult,
    config: PortalSearchConfig,
    providerName: string,
    city: string | null,
    briefBedrooms: number | null | undefined,
    relaxed: boolean,
  ): RawOpportunity {
    const brief = input.brief
    const text = `${result.title} ${result.snippet}`

    const priceResult = extractPrice(text)
    const sizeResult = extractSize(text)
    const bedroomsResult = extractBedrooms(text)
    const districtResult = extractDistrict(text, city ?? undefined)
    const cityResult = extractCity(text)

    const price = priceResult.value
    const size = sizeResult.value
    const bedrooms = bedroomsResult.value
    const district = districtResult.value
    const resolvedCity = cityResult.value ?? city
    const needsManualCompletion = !price || !size

    return {
      source_id: input.source.id,
      external_id: `portal-search-${result.url}`,
      source_url: result.url,
      title: result.title || 'Rent listing',
      description: result.snippet?.slice(0, 600) || null,
      country: brief.countries[0] ?? null,
      city: resolvedCity,
      district,
      price,
      currency: brief.currency ?? 'EUR',
      size_m2: size,
      bedrooms: bedrooms ?? briefBedrooms ?? null,
      property_type: 'apartment',
      raw_payload: {
        origin: 'portal_search',
        snippet: result.snippet,
        provider: providerName,
        portal: config.portal,
        monthlyRent: price,
        extractionSource: 'search_snippet',
        needs_manual_completion: needsManualCompletion,
        relaxed,
        confidence: {
          price: priceResult.confidence,
          size: sizeResult.confidence,
          bedrooms: bedroomsResult.confidence,
          district: districtResult.confidence,
        },
        module_type: 'rent',
      },
    }
  }
}