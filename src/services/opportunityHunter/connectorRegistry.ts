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
import { RentDemoConnector } from './connectors/RentDemoConnector'
import { SavedSearchConnector } from './connectors/SavedSearchConnector'
import { RentWebSearchConnector } from './connectors/RentWebSearchConnector'
import { PortalSearchConnector } from './connectors/PortalSearchConnector'
import { LiveScraperConnector } from './connectors/LiveScraperConnector'

const connectors: OpportunityConnector[] = [
  new ManualUrlConnector(),
  new CsvImportConnector(),
  new DemoConnector(),
  new ApiConnector(),
  new RssConnector(),
  new PartnerFeedConnector(),
  new PortalConnector(),
  new WebSearchConnector(),
  new RentDemoConnector(),
  new SavedSearchConnector(),
  new RentWebSearchConnector(),
  new PortalSearchConnector(),
  new LiveScraperConnector(),
]

console.log('[connectorRegistry] Registered connectors:', connectors.map((c) => `${c.name}(${c.type})`))

export const resolveConnector = (source: OpportunitySource): OpportunityConnector | null => {
  const sourceType = (source.type ?? '').trim()
  const byType = connectors.find((connector) => connector.type === sourceType)
  if (byType) return byType

  const byName = connectors.find((connector) => connector.name.toLowerCase() === sourceType.toLowerCase())
  if (byName) return byName

  console.warn(`[connectorRegistry] No connector found for source type "${sourceType}". Registered types:`, connectors.map((c) => c.type))
  return null
}

export const listConnectorDefinitions = () => connectors.map((connector) => ({ name: connector.name, type: connector.type }))
