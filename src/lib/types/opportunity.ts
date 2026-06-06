import type { Property } from './property'
import type { InvestmentAnalysis } from './analysis'
import type { OpportunityStage } from '../constants/opportunityStages'

export type OpportunityStatus = OpportunityStage

export interface OpportunityStageHistoryEntry {
  id: string
  fromStage: OpportunityStatus | null
  toStage: OpportunityStatus
  changedAt: string
  source: 'manual' | 'drag' | 'analysis' | 'import'
  note?: string
}

export interface Opportunity {
  id: string
  property: Property
  analysis?: InvestmentAnalysis
  status: OpportunityStatus
  tags: string[]
  notes: string
  savedAt: string
  updatedAt: string
}
