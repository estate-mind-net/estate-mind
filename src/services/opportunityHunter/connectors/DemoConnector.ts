import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export class DemoConnector implements OpportunityConnector {
  name = 'DemoConnector'
  type = 'demo'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const country = input.brief.countries[0] ?? 'Portugal'
    const city = input.brief.cities[0] ?? 'Lisbon'
    const currency = input.brief.currency ?? 'EUR'

    const demoRows: RawOpportunity[] = [
      {
        source_id: input.source.id,
        external_id: `demo-${input.source.id}-1`,
        source_url: 'https://demo-source.local/listings/1',
        title: `${city} Renovation-ready apartment`,
        description: 'Demo inventory from legal sandbox feed.',
        country,
        city,
        district: input.brief.districts[0] ?? 'Center',
        price: 245000,
        currency,
        size_m2: 76,
        bedrooms: 2,
        property_type: input.brief.property_types[0] ?? 'apartment',
        raw_payload: { origin: 'demo' },
      },
      {
        source_id: input.source.id,
        external_id: `demo-${input.source.id}-2`,
        source_url: 'https://demo-source.local/listings/2',
        title: `${city} Cashflow-focused unit`,
        description: 'Demo inventory from legal sandbox feed.',
        country,
        city,
        district: input.brief.districts[0] ?? 'North',
        price: 320000,
        currency,
        size_m2: 92,
        bedrooms: 3,
        property_type: input.brief.property_types[0] ?? 'apartment',
        raw_payload: { origin: 'demo' },
      },
    ]

    return demoRows
  }
}
