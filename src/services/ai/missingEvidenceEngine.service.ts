import type { AnalysisFindingItem, MissingEvidenceSeverity } from '@/lib/types'

type MissingEvidenceTemplate = {
  title: string
  value: string
  severity: MissingEvidenceSeverity
  explanation: string
}

export interface MissingEvidenceInputs {
  hasMarketRentalData: boolean
  hasMarketTransactionData: boolean
  hasLegalEvidence: boolean
  hasEnergyEvidence: boolean
  needsRenovation: boolean
}

const toFinding = (template: MissingEvidenceTemplate): AnalysisFindingItem => ({
  title: template.title,
  value: template.value,
  confidence: 30,
  sourceType: 'ai_inference',
  explanation: template.explanation,
  severity: template.severity,
})

const severityRank: Record<MissingEvidenceSeverity, number> = {
  critical: 0,
  important: 1,
  optional: 2,
}

export const generateMissingEvidence = (input: MissingEvidenceInputs): AnalysisFindingItem[] => {
  const items: MissingEvidenceTemplate[] = []

  if (!input.hasMarketRentalData) {
    items.push({
      title: 'Rental comparables',
      value: 'Recent nearby rental comparables are missing.',
      severity: 'critical',
      explanation: 'Rental estimate confidence is limited without at least three local rental comps.',
    })
  }

  if (!input.hasLegalEvidence) {
    items.push({
      title: 'Ownership documents',
      value: 'Title deed and ownership chain documents are missing.',
      severity: 'critical',
      explanation: 'Investment decision cannot be trusted until legal ownership is verified.',
    })
    items.push({
      title: 'Building permit',
      value: 'Building permit and compliance documents are missing.',
      severity: 'important',
      explanation: 'Permit status impacts legal and renovation risk assumptions.',
    })
  }

  if (!input.hasEnergyEvidence) {
    items.push({
      title: 'Energy certificate',
      value: 'Energy performance certificate is missing.',
      severity: 'important',
      explanation: 'Energy class affects tenant demand, utility costs, and value assumptions.',
    })
  }

  items.push({
    title: 'Utility bills',
    value: 'Recent utility bills are missing.',
    severity: 'optional',
    explanation: 'Utility history improves operating expense accuracy in the financial model.',
  })

  if (input.needsRenovation) {
    items.push({
      title: 'Renovation quotes',
      value: 'Contractor renovation quotes are missing.',
      severity: 'critical',
      explanation: 'ROI assumptions are not reliable without scoped contractor quotes.',
    })
  } else {
    items.push({
      title: 'Renovation quotes',
      value: 'Contractor renovation quotes are missing.',
      severity: 'important',
      explanation: 'Quotes improve confidence even when only light upgrades are expected.',
    })
  }

  if (!input.hasMarketTransactionData) {
    items.push({
      title: 'Market transaction data',
      value: 'Recent market transaction data is missing.',
      severity: 'important',
      explanation: 'Comparable sales are required to validate exit price assumptions.',
    })
  }

  return items
    .map(toFinding)
    .sort((a, b) => severityRank[a.severity ?? 'optional'] - severityRank[b.severity ?? 'optional'])
}

export class MissingEvidenceEngineService {
  generateMissingEvidence = generateMissingEvidence
}

export const missingEvidenceEngineService = new MissingEvidenceEngineService()
