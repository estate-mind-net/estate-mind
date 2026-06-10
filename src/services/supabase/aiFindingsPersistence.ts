import type {
  AiFindingCreateInput,
  AiFindingSourceType,
  AiFindingType,
  AnalysisFindingBucket,
  AnalysisFindingItem,
  InvestmentAnalysis,
} from '@/lib/types'

type FindingGroup = {
  type: AiFindingType
  category: AnalysisFindingBucket
  items: AnalysisFindingItem[]
}

const clampConfidence = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

const toFindingTitle = (value: string, fallbackPrefix: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return fallbackPrefix
  if (trimmed.length <= 80) return trimmed
  return `${trimmed.slice(0, 77)}...`
}

const mapStringArray = (
  values: string[] | undefined,
  sourceType: AiFindingSourceType,
  fallbackPrefix: string,
): AnalysisFindingItem[] => {
  const items = Array.isArray(values) ? values : []
  return items
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item, index) => ({
      title: toFindingTitle(item, `${fallbackPrefix} ${index + 1}`),
      value: item,
      confidence: null,
      sourceType,
      explanation: item,
    }))
}

const fallbackFindingsFromLegacy = (analysis: InvestmentAnalysis): Record<AnalysisFindingBucket, AnalysisFindingItem[]> => {
  return {
    facts: [],
    estimates: mapStringArray((analysis as InvestmentAnalysis & { estimates?: string[] }).estimates, 'ai_inference', 'Estimate'),
    assumptions: mapStringArray(analysis.assumptions, 'ai_inference', 'Assumption'),
    risks: mapStringArray(analysis.risks, 'ai_inference', 'Risk'),
    opportunities: mapStringArray(analysis.opportunities, 'ai_inference', 'Opportunity'),
    missingEvidence: mapStringArray(analysis.missingData, 'ai_inference', 'Missing Evidence'),
  }
}

export const getAnalysisFindings = (analysis: InvestmentAnalysis): Record<AnalysisFindingBucket, AnalysisFindingItem[]> => {
  const findings = analysis.findings
  if (!findings) {
    return fallbackFindingsFromLegacy(analysis)
  }

  return {
    facts: findings.facts,
    estimates: findings.estimates,
    assumptions: findings.assumptions,
    risks: findings.risks,
    opportunities: findings.opportunities,
    missingEvidence: findings.missingEvidence,
  }
}

export const mapAnalysisFindingsToRows = (
  analysis: InvestmentAnalysis,
  organizationId: string,
  opportunityId: string,
): AiFindingCreateInput[] => {
  const findings = getAnalysisFindings(analysis)

  const groups: FindingGroup[] = [
    { type: 'fact', category: 'facts', items: findings.facts },
    { type: 'estimate', category: 'estimates', items: findings.estimates },
    { type: 'assumption', category: 'assumptions', items: findings.assumptions },
    { type: 'risk', category: 'risks', items: findings.risks },
    { type: 'opportunity', category: 'opportunities', items: findings.opportunities },
    { type: 'missing_evidence', category: 'missingEvidence', items: findings.missingEvidence },
  ]

  const rows: AiFindingCreateInput[] = []

  for (const group of groups) {
    for (const item of group.items) {
      const title = item.title.trim()
      const value = item.value.trim()
      const explanation = item.explanation.trim()
      if (!title || !value || !explanation) continue

      rows.push({
        organization_id: organizationId,
        opportunity_id: opportunityId,
        category: group.category,
        title,
        finding_type: group.type,
        confidence: clampConfidence(item.confidence),
        source_type: item.sourceType,
        evidence: value,
        metadata: {
          explanation,
          value,
          ...(item.severity ? { severity: item.severity } : {}),
        },
      })
    }
  }

  return rows
}

export const replaceAiFindingsForOpportunity = async (
  client: { from: (table: string) => any },
  analysis: InvestmentAnalysis,
  organizationId: string,
  opportunityId: string,
): Promise<void> => {
  const rows = mapAnalysisFindingsToRows(analysis, organizationId, opportunityId)

  const deleteResult = await client
    .from('ai_findings')
    .delete()
    .eq('organization_id', organizationId)
    .eq('opportunity_id', opportunityId)

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message ?? 'Failed to clear previous AI findings.')
  }

  if (rows.length === 0) {
    return
  }

  const insertResult = await client.from('ai_findings').insert(rows)
  if (insertResult.error) {
    throw new Error(insertResult.error.message ?? 'Failed to persist AI findings.')
  }
}
