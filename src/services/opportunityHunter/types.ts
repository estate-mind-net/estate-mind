import type { InvestmentSearchBrief, OpportunitySource, RawOpportunity } from '@/lib/types/opportunityHunter'

export interface ConnectorInput {
  organizationId: string
  brief: InvestmentSearchBrief
  source: OpportunitySource
  nowIso?: string
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
  suggestedNextStep: string
  rankScore: number
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
