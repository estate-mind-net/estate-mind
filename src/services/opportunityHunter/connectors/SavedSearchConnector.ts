import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

/**
 * SavedSearchConnector
 *
 * Does NOT fetch or scrape any URL.
 * Returns zero RawOpportunity items.
 * Emits meaningful metadata so the discovery run records
 * the saved search details and signals "action required".
 */
export class SavedSearchConnector implements OpportunityConnector {
  name = 'SavedSearchConnector'
  type = 'saved_search'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const config = input.source.connector_config && typeof input.source.connector_config === 'object'
      ? input.source.connector_config as Record<string, unknown>
      : {}

    const portal = typeof config.portal === 'string' ? config.portal : null
    const searchUrl = typeof config.searchUrl === 'string' ? config.searchUrl : null
    const notes = typeof config.notes === 'string' ? config.notes : null

    input.onTrace?.({
      stage: 'connector_execution',
      data: {
        connector: this.name,
        action_required: true,
        suggested_action: 'Open saved search and import promising listing URLs manually.',
        portal,
        searchUrl,
        notes,
      },
    })

    // No scraping — return empty
    return []
  }
}