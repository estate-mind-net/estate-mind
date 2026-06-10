import type { AiFinding, AiFindingCreateInput, InvestmentAnalysis } from '@/lib/types'
import { getSupabaseClient } from '@/services/supabase/client'
import { storageService } from '@/services/supabase/storage.service'
import { confidenceEngineService, type ConfidenceResult } from './confidenceEngine.service'
import {
  documentAIService,
  type DueDiligenceDocumentType,
  type DueDiligenceExtractionResult,
} from './document.service'

export interface DueDiligenceUploadInput {
  organizationId: string
  opportunityId: string
  documentType: DueDiligenceDocumentType
  file: File
  fallbackText?: string
}

export interface DueDiligenceUploadResult {
  extraction: DueDiligenceExtractionResult
  beforeConfidence: ConfidenceResult
  afterConfidence: ConfidenceResult
  insertedCount: number
  uploadPath: string
  publicUrl?: string
}

const SUPPORTED_TYPES: DueDiligenceDocumentType[] = [
  'ownership_document',
  'building_permit',
  'epc_certificate',
  'utility_bill',
  'floor_plan',
  'renovation_quotation',
  'seller_disclosure',
]

const findingTypeToCategory = (type: AiFinding['finding_type']): string => {
  if (type === 'fact') return 'facts'
  if (type === 'estimate') return 'estimates'
  if (type === 'assumption') return 'assumptions'
  if (type === 'risk') return 'risks'
  if (type === 'opportunity') return 'opportunities'
  return 'missingEvidence'
}

const fileNameTitle = (prefix: string, value: string, index: number): string => {
  const raw = value.trim()
  if (raw.length === 0) return `${prefix} ${index + 1}`
  if (raw.length <= 90) return raw
  return `${raw.slice(0, 87)}...`
}

const clampConfidence = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

const getMetadataDocumentType = (finding: AiFinding): DueDiligenceDocumentType | null => {
  const value = (finding.metadata as Record<string, unknown> | null)?.documentType
  if (typeof value !== 'string') return null
  if (SUPPORTED_TYPES.includes(value as DueDiligenceDocumentType)) {
    return value as DueDiligenceDocumentType
  }
  return null
}

const computeConfidenceFromFindings = (
  findings: AiFinding[],
  fallbackConfidence?: number,
): ConfidenceResult => {
  if (findings.length === 0 && typeof fallbackConfidence === 'number') {
    const clamped = clampConfidence(fallbackConfidence)
    return {
      confidence: clamped,
      dataCompleteness: clamped,
      evidenceStrength: clamped,
      sourceQuality: clamped,
    }
  }

  const missingCountRaw = findings.filter((item) => item.finding_type === 'missing_evidence').length
  const evidenceSignals = findings.filter((item) => item.finding_type !== 'missing_evidence').length

  const resolvedDocTypes = new Set<string>()
  findings.forEach((finding) => {
    if (finding.source_type !== 'uploaded_document') return
    const docType = getMetadataDocumentType(finding)
    if (docType) {
      resolvedDocTypes.add(docType)
    }
  })

  const effectiveMissingCount = Math.max(0, missingCountRaw - resolvedDocTypes.size)
  const totalExpectedEvidence = Math.max(8, effectiveMissingCount + evidenceSignals)

  const dataCompleteness = confidenceEngineService.calculateDataCompleteness({
    missingEvidenceCount: effectiveMissingCount,
    totalExpectedEvidence,
  })

  const evidenceStrength = confidenceEngineService.calculateEvidenceStrength({
    evidenceSignals,
    totalEvidenceSignals: totalExpectedEvidence,
    hasMarketData: findings.some((item) => item.source_type === 'market_api'),
  })

  const sourceQuality = confidenceEngineService.calculateSourceQuality({
    sourceTypes: findings.map((item) => item.source_type),
  })

  return confidenceEngineService.calculateConfidence({
    dataCompleteness,
    evidenceStrength,
    sourceQuality,
  })
}

const deriveFallbackConfidence = (analysis?: InvestmentAnalysis | null): number | undefined => {
  const explicit = analysis?.recommendationConfidence?.confidence
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return clampConfidence(explicit)
  }

  if (analysis?.confidenceLevel === 'high') return 80
  if (analysis?.confidenceLevel === 'medium') return 65
  if (analysis?.confidenceLevel === 'low') return 45

  const score = analysis?.score?.overall
  if (typeof score === 'number' && Number.isFinite(score)) {
    return clampConfidence(Math.round(score * 0.75))
  }

  return undefined
}

const createRowsFromExtraction = (
  extraction: DueDiligenceExtractionResult,
  input: DueDiligenceUploadInput,
  uploadPath: string,
  publicUrl?: string,
): AiFindingCreateInput[] => {
  const commonMetadata = {
    documentType: input.documentType,
    fileName: input.file.name,
    uploadPath,
    ...(publicUrl ? { publicUrl } : {}),
  }

  const rows: AiFindingCreateInput[] = []

  extraction.keyFacts.forEach((fact, index) => {
    rows.push({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      category: 'facts',
      title: fileNameTitle('Key fact', fact, index),
      finding_type: 'fact',
      confidence: extraction.confidence,
      source_type: 'uploaded_document',
      evidence: fact,
      metadata: {
        ...commonMetadata,
        extractionType: 'key_fact',
        explanation: extraction.summary,
      },
    })
  })

  extraction.risks.forEach((risk, index) => {
    rows.push({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      category: 'risks',
      title: fileNameTitle('Document risk', risk, index),
      finding_type: 'risk',
      confidence: extraction.confidence,
      source_type: 'uploaded_document',
      evidence: risk,
      metadata: {
        ...commonMetadata,
        extractionType: 'risk',
        explanation: extraction.summary,
      },
    })
  })

  extraction.missingFields.forEach((field, index) => {
    rows.push({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      category: 'missingEvidence',
      title: fileNameTitle('Missing field', field, index),
      finding_type: 'missing_evidence',
      confidence: extraction.confidence,
      source_type: 'uploaded_document',
      evidence: field,
      metadata: {
        ...commonMetadata,
        extractionType: 'missing_field',
        severity: 'important',
        explanation: extraction.summary,
      },
    })
  })

  extraction.questionsToAskSeller.forEach((question, index) => {
    rows.push({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      category: 'assumptions',
      title: fileNameTitle('Seller question', question, index),
      finding_type: 'assumption',
      confidence: extraction.confidence,
      source_type: 'uploaded_document',
      evidence: question,
      metadata: {
        ...commonMetadata,
        extractionType: 'seller_question',
        explanation: extraction.summary,
      },
    })
  })

  if (rows.length === 0) {
    rows.push({
      organization_id: input.organizationId,
      opportunity_id: input.opportunityId,
      category: findingTypeToCategory('fact'),
      title: `${input.file.name} analyzed`,
      finding_type: 'fact',
      confidence: extraction.confidence,
      source_type: 'uploaded_document',
      evidence: extraction.summary,
      metadata: {
        ...commonMetadata,
        extractionType: 'summary',
        explanation: extraction.summary,
      },
    })
  }

  return rows
}

export class DueDiligenceAssistantService {
  async listOpportunityFindings(organizationId: string, opportunityId: string): Promise<AiFinding[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('ai_findings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message ?? 'Failed to load due diligence findings.')
    }

    return (data ?? []) as AiFinding[]
  }

  deriveFallbackConfidence = deriveFallbackConfidence

  computeConfidenceFromFindings = computeConfidenceFromFindings

  async uploadAndAnalyze(
    input: DueDiligenceUploadInput,
    context?: { analysis?: InvestmentAnalysis | null },
  ): Promise<DueDiligenceUploadResult> {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Supabase is unavailable. Configure Supabase to use Due Diligence Assistant.')
    }

    const existing = await this.listOpportunityFindings(input.organizationId, input.opportunityId)
    const fallbackConfidence = deriveFallbackConfidence(context?.analysis)
    const beforeConfidence = computeConfidenceFromFindings(existing, fallbackConfidence)

    const upload = await storageService.uploadDocument(input.file, 'documents')
    if (upload.error || !upload.data) {
      throw new Error(upload.error?.message ?? 'Document upload failed.')
    }

    let rawText = ''
    try {
      rawText = await input.file.text()
    } catch {
      rawText = ''
    }

    const textForAi = rawText.trim().length > 0
      ? rawText.slice(0, 24_000)
      : (input.fallbackText?.trim().slice(0, 24_000) ?? '')

    const extraction = await documentAIService.analyzeDueDiligenceDocument(
      input.documentType,
      textForAi.length > 0
        ? textForAi
        : `File uploaded: ${input.file.name}. No text extraction was available. Use metadata and due diligence expectations for this document type.`,
    )

    const rows = createRowsFromExtraction(extraction, input, upload.data.path, upload.data.publicUrl)

    const insertResult = await client.from('ai_findings').insert(rows)
    if (insertResult.error) {
      throw new Error(insertResult.error.message ?? 'Failed to persist extracted due diligence findings.')
    }

    const afterConfidence = computeConfidenceFromFindings(
      [
        ...existing,
        ...rows.map((row, index) => ({
          id: `${Date.now()}-${index}`,
          organization_id: row.organization_id,
          opportunity_id: row.opportunity_id,
          category: row.category,
          title: row.title,
          finding_type: row.finding_type,
          confidence: row.confidence,
          source_type: row.source_type,
          evidence: row.evidence,
          metadata: row.metadata,
          created_at: new Date().toISOString(),
        } satisfies AiFinding)),
      ],
      fallbackConfidence,
    )

    return {
      extraction,
      beforeConfidence,
      afterConfidence,
      insertedCount: rows.length,
      uploadPath: upload.data.path,
      publicUrl: upload.data.publicUrl,
    }
  }
}

export const dueDiligenceAssistantService = new DueDiligenceAssistantService()
