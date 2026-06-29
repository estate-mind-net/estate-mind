import type { InvestmentSearchBrief, OpportunitySource, RawOpportunity } from '@/lib/types/opportunityHunter'

export type DiscoveryTraceEvent = {
  stage:
    | 'connector_execution'
    | 'search_queries_generated'
    | 'search_results_returned'
    | 'raw_search_results'
    | 'listings_extracted'
    | 'page_classified'
    | 'error'
  data?: Record<string, unknown>
}

export interface ConnectorInput {
  organizationId: string
  brief: InvestmentSearchBrief
  source: OpportunitySource
  nowIso?: string
  onTrace?: (event: DiscoveryTraceEvent) => void
}

export type OpportunityConnector = {
  name: string
  type: string
  fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]>
}

export interface MatchEvaluation {
  matchScore: number
  matchReasons: string[]
  mismatchReasons: string[]
  missingData: string[]
  rejectionReasons: string[]
  isRejected: boolean
  suggestedNextStep: string
  rankScore: number
  qualityLabels?: string[]
}

export interface DiscoveryRunResult {
  runId: string
  sourceId: string
  sourceName: string
  fetched: number
  inserted: number
  deduplicated: number
  matched: number
  failedReason?: string
}
