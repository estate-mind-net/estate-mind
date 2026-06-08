import type { OpportunitySource } from '@/lib/types/opportunityHunter'
import type { OpportunityConnector } from './types'
import { ManualUrlConnector } from './connectors/ManualUrlConnector'
import { CsvImportConnector } from './connectors/CsvImportConnector'
import { DemoConnector } from './connectors/DemoConnector'
import { ApiConnector } from './connectors/ApiConnector'
import { RssConnector } from './connectors/RssConnector'
import { PartnerFeedConnector } from './connectors/PartnerFeedConnector'
import { PortalConnector } from './connectors/PortalConnector'
import { WebSearchConnector } from './connectors/WebSearchConnector'

const connectors: OpportunityConnector[] = [
  new ManualUrlConnector(),
  new CsvImportConnector(),
  new DemoConnector(),
  new ApiConnector(),
  new RssConnector(),
  new PartnerFeedConnector(),
  new PortalConnector(),
  new WebSearchConnector(),
]

export const resolveConnector = (source: OpportunitySource): OpportunityConnector | null => {
  const byType = connectors.find((connector) => connector.type === source.type)
  if (byType) return byType

  const byName = connectors.find((connector) => connector.name.toLowerCase() === source.type.toLowerCase())
  return byName ?? null
}

export const listConnectorDefinitions = () => connectors.map((connector) => ({ name: connector.name, type: connector.type }))
