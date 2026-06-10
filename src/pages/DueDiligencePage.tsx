import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  FileText,
  TrendUp,
  UploadSimple,
  Warning,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import type { AiFinding, InvestmentAnalysis } from '@/lib/types'
import {
  dueDiligenceAssistantService,
  type DueDiligenceDocumentType,
  type DueDiligenceUploadResult,
} from '@/services/ai'
import { opportunityWorkspaceService, type OpportunityWorkspaceDetail } from '@/services/supabase/opportunityWorkspace.service'

const DOCUMENT_TYPES: Array<{ value: DueDiligenceDocumentType; label: string; short: string }> = [
  { value: 'ownership_document', label: 'Ownership documents', short: 'Ownership' },
  { value: 'building_permit', label: 'Building permits', short: 'Permit' },
  { value: 'epc_certificate', label: 'EPC certificates', short: 'EPC' },
  { value: 'utility_bill', label: 'Utility bills', short: 'Utilities' },
  { value: 'floor_plan', label: 'Floor plans', short: 'Floor plan' },
  { value: 'renovation_quotation', label: 'Renovation quotations', short: 'Renovation quote' },
  { value: 'seller_disclosure', label: 'Seller disclosures', short: 'Seller disclosure' },
]

const docLabel = (type: DueDiligenceDocumentType): string => {
  const found = DOCUMENT_TYPES.find((item) => item.value === type)
  return found?.label ?? type
}

const readDocumentType = (finding: AiFinding): DueDiligenceDocumentType | null => {
  const value = (finding.metadata as Record<string, unknown> | null)?.documentType
  if (typeof value !== 'string') return null
  const matched = DOCUMENT_TYPES.find((item) => item.value === value)
  return matched?.value ?? null
}

const formatPercent = (value: number) => `${Math.max(0, Math.min(100, Math.round(value)))}%`

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-60" />
      <Skeleton className="h-72" />
    </div>
  )
}

const latestAnalysisFromItem = (item: OpportunityWorkspaceDetail | null): InvestmentAnalysis | null => {
  if (!item) return null
  return item.notes.find((note) => Boolean(note.parsedAnalysis))?.parsedAnalysis ?? item.analysis
}

export function DueDiligencePage() {
  const navigate = useNavigate()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const { organization } = useAuth()

  const [item, setItem] = useState<OpportunityWorkspaceDetail | null>(null)
  const [findings, setFindings] = useState<AiFinding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<DueDiligenceDocumentType>('ownership_document')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentNotes, setDocumentNotes] = useState('')
  const [lastResult, setLastResult] = useState<DueDiligenceUploadResult | null>(null)

  const latestAnalysis = useMemo(() => latestAnalysisFromItem(item), [item])

  const loadData = async () => {
    if (!opportunityId || !organization?.id) {
      setError('Missing organization or opportunity context.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [loadedItem, loadedFindings] = await Promise.all([
        opportunityWorkspaceService.getOpportunityById(opportunityId, { organizationId: organization.id }),
        dueDiligenceAssistantService.listOpportunityFindings(organization.id, opportunityId),
      ])

      if (!loadedItem) {
        throw new Error('Opportunity not found.')
      }

      setItem(loadedItem)
      setFindings(loadedFindings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load due diligence workspace.')
      setItem(null)
      setFindings([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [opportunityId, organization?.id])

  const baselineConfidence = useMemo(() => {
    return dueDiligenceAssistantService.computeConfidenceFromFindings(
      findings,
      dueDiligenceAssistantService.deriveFallbackConfidence(latestAnalysis),
    )
  }, [findings, latestAnalysis])

  const uploadedByType = useMemo(() => {
    const map = new Map<DueDiligenceDocumentType, number>()
    findings.forEach((finding) => {
      if (finding.source_type !== 'uploaded_document') return
      const type = readDocumentType(finding)
      if (!type) return
      map.set(type, (map.get(type) ?? 0) + 1)
    })
    return map
  }, [findings])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!organization?.id || !opportunityId) {
      toast.error('Missing organization or opportunity context.')
      return
    }

    if (!selectedFile) {
      toast.error('Please choose a file before uploading.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await dueDiligenceAssistantService.uploadAndAnalyze(
        {
          organizationId: organization.id,
          opportunityId,
          documentType: selectedType,
          file: selectedFile,
          fallbackText: documentNotes,
        },
        { analysis: latestAnalysis },
      )

      setLastResult(result)
      setSelectedFile(null)
      setDocumentNotes('')

      const refreshed = await dueDiligenceAssistantService.listOpportunityFindings(organization.id, opportunityId)
      setFindings(refreshed)

      toast.success(`${docLabel(selectedType)} processed. ${result.insertedCount} findings saved.`)
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to process document.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (error || !item) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <Warning className="h-6 w-6" weight="fill" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">Could not load Due Diligence</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Unknown error.'}</p>
            <Button className="mt-5" variant="outline" onClick={() => navigate('/opportunities')}>
              Back to Opportunities
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(`/opportunities/${item.id}`)} className="-ml-2 mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunity
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight">Due Diligence</h1>
          <p className="mt-2 text-sm text-muted-foreground">{item.title}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall Confidence</p>
          <p className="mt-1 text-2xl font-bold">{formatPercent(lastResult?.afterConfidence.confidence ?? baselineConfidence.confidence)}</p>
        </div>
      </div>

      <Card className="border-border/70 p-6">
        <div className="flex items-center gap-2">
          <TrendUp className="h-5 w-5 text-accent" weight="duotone" />
          <h2 className="font-display text-xl font-bold">Confidence Improvement</h2>
        </div>

        {lastResult ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Before upload</p>
              <p className="mt-2 text-2xl font-semibold">{formatPercent(lastResult.beforeConfidence.confidence)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">After upload</p>
              <p className="mt-2 text-2xl font-semibold">{formatPercent(lastResult.afterConfidence.confidence)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Delta</p>
              <p className="mt-2 text-2xl font-semibold">
                {lastResult.afterConfidence.confidence - lastResult.beforeConfidence.confidence >= 0 ? '+' : ''}
                {lastResult.afterConfidence.confidence - lastResult.beforeConfidence.confidence}%
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Findings saved</p>
              <p className="mt-2 text-2xl font-semibold">{lastResult.insertedCount}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
            Upload a document to see before/after confidence.
            Example: Before 52% and after ownership document 67%.
          </div>
        )}
      </Card>

      <Card className="border-border/70 p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" weight="duotone" />
          <h2 className="font-display text-xl font-bold">Upload Supporting Document</h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document type</Label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as DueDiligenceDocumentType)}>
                <SelectTrigger id="doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((docType) => (
                    <SelectItem key={docType.value} value={docType.value}>{docType.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">File</Label>
              <Input
                id="doc-file"
                type="file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null
                  setSelectedFile(nextFile)
                }}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-notes">Document notes or extracted text (optional)</Label>
            <Textarea
              id="doc-notes"
              value={documentNotes}
              onChange={(event) => setDocumentNotes(event.target.value)}
              rows={4}
              placeholder="Paste text from the document to improve extraction quality if the file is scanned or non-text."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadSimple className="mr-2 h-4 w-4" />
                  Upload and Analyze
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">Supported: ownership, permits, EPC, utility bills, floor plans, renovation quotations, seller disclosures.</p>
          </div>
        </form>
      </Card>

      <Card className="border-border/70 p-6">
        <h2 className="font-display text-xl font-bold">Document Coverage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_TYPES.map((docType) => {
            const count = uploadedByType.get(docType.value) ?? 0
            const uploaded = count > 0
            return (
              <div key={docType.value} className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{docType.label}</p>
                  {uploaded ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                      Uploaded
                    </Badge>
                  ) : (
                    <Badge variant="outline">Missing</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Findings from this type: {count}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {lastResult ? (
        <Card className="border-border/70 p-6">
          <h2 className="font-display text-xl font-bold">Latest AI Extraction</h2>
          <p className="mt-2 text-sm text-muted-foreground">{lastResult.extraction.summary}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-semibold">Key Facts</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {lastResult.extraction.keyFacts.length > 0 ? lastResult.extraction.keyFacts.map((fact) => (
                  <li key={fact}>- {fact}</li>
                )) : <li>- No key facts extracted.</li>}
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-semibold">Risks</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {lastResult.extraction.risks.length > 0 ? lastResult.extraction.risks.map((risk) => (
                  <li key={risk}>- {risk}</li>
                )) : <li>- No risks extracted.</li>}
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-semibold">Missing Fields</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {lastResult.extraction.missingFields.length > 0 ? lastResult.extraction.missingFields.map((field) => (
                  <li key={field}>- {field}</li>
                )) : <li>- No missing fields extracted.</li>}
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-semibold">Questions to Ask Seller</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {lastResult.extraction.questionsToAskSeller.length > 0 ? lastResult.extraction.questionsToAskSeller.map((question) => (
                  <li key={question}>- {question}</li>
                )) : <li>- No questions generated.</li>}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
