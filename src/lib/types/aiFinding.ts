export type AiFindingType =
  | 'fact'
  | 'estimate'
  | 'assumption'
  | 'risk'
  | 'opportunity'
  | 'missing_evidence'

export type AiFindingSourceType =
  | 'user_input'
  | 'listing'
  | 'uploaded_document'
  | 'portal'
  | 'market_api'
  | 'ai_inference'

export interface AiFinding {
  id: string
  organization_id: string
  opportunity_id: string
  category: string
  title: string
  finding_type: AiFindingType
  confidence: number | null
  source_type: AiFindingSourceType
  evidence: string
  metadata: Record<string, unknown>
  created_at: string
}

export type AiFindingCreateInput = Omit<AiFinding, 'id' | 'created_at'>

export type AiFindingUpdateInput = Partial<Pick<AiFinding, 'category' | 'title' | 'finding_type' | 'confidence' | 'source_type' | 'evidence' | 'metadata'>>
