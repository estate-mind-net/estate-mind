import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export class ApiConnector implements OpportunityConnector {
  name = 'ApiConnector'
  type = 'api'

  async fetchOpportunities(_input: ConnectorInput): Promise<RawOpportunity[]> {
    return []
  }
}
