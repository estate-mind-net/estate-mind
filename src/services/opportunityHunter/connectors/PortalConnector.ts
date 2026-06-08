import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export class PortalConnector implements OpportunityConnector {
  name = 'PortalConnector'
  type = 'portal'

  async fetchOpportunities(_input: ConnectorInput): Promise<RawOpportunity[]> {
    return []
  }
}
