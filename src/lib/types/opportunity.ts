import type { Property } from './property'
import type { InvestmentAnalysis } from './analysis'
import type { OpportunityStage } from '../constants/opportunityStages'
import type { ModuleId } from '@/modules/shared/types/module'

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
  module_type?: ModuleId
  module_data?: Record<string, unknown>
  contact_name?: string | null
  contact_phone?: string | null
  next_action?: string | null
  viewed_at?: string | null
}
