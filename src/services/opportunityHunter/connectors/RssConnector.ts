import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export class RssConnector implements OpportunityConnector {
  name = 'RssConnector'
  type = 'rss'

  async fetchOpportunities(_input: ConnectorInput): Promise<RawOpportunity[]> {
    return []
  }
}
