import type { Property } from './property'
import type { InvestmentAnalysis } from './analysis'

export type OpportunityStatus = 
  | 'new-opportunity' 
  | 'initial-analysis' 
  | 'watching' 
  | 'due-diligence' 
  | 'negotiation' 
  | 'acquired' 
  | 'rejected'

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
