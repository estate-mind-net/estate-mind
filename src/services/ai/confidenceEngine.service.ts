import type { AiFindingSourceType } from '@/lib/types'

export interface ConfidenceInputs {
  dataCompleteness: number
  evidenceStrength: number
  sourceQuality: number
}

export interface ConfidenceResult {
  confidence: number
  dataCompleteness: number
  evidenceStrength: number
  sourceQuality: number
}

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export const calculateDataCompleteness = (input: {
  missingEvidenceCount: number
  totalExpectedEvidence: number
}): number => {
  const total = Math.max(1, input.totalExpectedEvidence)
  const missing = Math.max(0, input.missingEvidenceCount)
  return Math.round(clampPercent(((total - Math.min(missing, total)) / total) * 100))
}

export const calculateEvidenceStrength = (input: {
  evidenceSignals: number
  totalEvidenceSignals: number
  hasMarketData?: boolean
}): number => {
  const total = Math.max(1, input.totalEvidenceSignals)
  const present = Math.max(0, Math.min(input.evidenceSignals, total))
  const baseScore = (present / total) * 100
  const marketBonus = input.hasMarketData ? 10 : 0
  return Math.round(clampPercent(baseScore + marketBonus))
}

const sourceQualityWeights: Record<AiFindingSourceType, number> = {
  user_input: 72,
  listing: 76,
  uploaded_document: 86,
  portal: 68,
  market_api: 92,
  ai_inference: 58,
}

export const calculateSourceQuality = (input: {
  sourceTypes: AiFindingSourceType[]
}): number => {
  const sourceTypes = input.sourceTypes.length > 0 ? input.sourceTypes : ['ai_inference']
  const weighted = sourceTypes.reduce((sum, sourceType) => sum + sourceQualityWeights[sourceType], 0)
  return Math.round(clampPercent(weighted / sourceTypes.length))
}

export const calculateConfidence = (input: ConfidenceInputs): ConfidenceResult => {
  const dataCompleteness = clampPercent(input.dataCompleteness)
  const evidenceStrength = clampPercent(input.evidenceStrength)
  const sourceQuality = clampPercent(input.sourceQuality)

  const confidence = Math.round(
    dataCompleteness * 0.4 +
    evidenceStrength * 0.4 +
    sourceQuality * 0.2,
  )

  return {
    confidence,
    dataCompleteness,
    evidenceStrength,
    sourceQuality,
  }
}

export class ConfidenceEngineService {
  calculateDataCompleteness = calculateDataCompleteness
  calculateEvidenceStrength = calculateEvidenceStrength
  calculateSourceQuality = calculateSourceQuality
  calculateConfidence = calculateConfidence
}

export const confidenceEngineService = new ConfidenceEngineService()
