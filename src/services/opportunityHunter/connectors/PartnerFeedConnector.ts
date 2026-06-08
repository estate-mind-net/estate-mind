import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export class PartnerFeedConnector implements OpportunityConnector {
  name = 'PartnerFeedConnector'
  type = 'partner_feed'

  async fetchOpportunities(_input: ConnectorInput): Promise<RawOpportunity[]> {
    return []
  }
}
