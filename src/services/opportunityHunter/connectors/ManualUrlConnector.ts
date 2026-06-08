import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

const normalizeSeedUrls = (input: ConnectorInput): string[] => {
  const configured = Array.isArray(input.source.seed_urls) ? input.source.seed_urls : []
  const sourceUrl = input.source.source_url ? [input.source.source_url] : []
  return [...configured, ...sourceUrl].filter((url) => typeof url === 'string' && url.length > 0)
}

export class ManualUrlConnector implements OpportunityConnector {
  name = 'ManualUrlConnector'
  type = 'manual_url'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const urls = normalizeSeedUrls(input)
    const now = input.nowIso ?? new Date().toISOString()

    return urls.map((url, index) => {
      let hostname = 'listing source'
      try {
        hostname = new URL(url).hostname
      } catch {
        hostname = 'listing source'
      }

      const payload: RawOpportunity = {
        source_id: input.source.id,
        source_url: url,
        external_id: `manual-${index}-${url.slice(-24)}`,
        title: `Manual listing from ${hostname}`,
        description: 'User-provided listing URL. Structured fields should be completed through manual enrichment.',
        country: input.brief.countries[0] ?? null,
        city: input.brief.cities[0] ?? null,
        district: input.brief.districts[0] ?? null,
        price: input.brief.min_price,
        currency: input.brief.currency,
        property_type: input.brief.property_types[0] ?? null,
        raw_payload: {
          origin: 'manual_url',
          submitted_url: url,
          fetched_at: now,
        },
      }

      return payload
    })
  }
}
