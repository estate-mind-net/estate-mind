import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AnalysisFindingItem, InvestmentAnalysis } from '@/lib/types'
import {
  calculateConfidence,
  calculateDataCompleteness,
  calculateSourceQuality,
  type ConfidenceResult,
} from '@/services/ai/confidenceEngine.service'

type EvidenceTopic =
  | 'investment_score'
  | 'rental_estimate'
  | 'yield'
  | 'roi'
  | 'recommendation'

interface EvidenceExplorerProps {
  analysis: InvestmentAnalysis
  topic: EvidenceTopic
  label: string
  valueText: string
}

const scoreBadge = (value: number): 'High' | 'Medium' | 'Low' => {
  if (value >= 80) return 'High'
  if (value >= 60) return 'Medium'
  return 'Low'
}

const sourceLabel = (sourceType: AnalysisFindingItem['sourceType']) => {
  if (sourceType === 'user_input') return 'User Input'
  if (sourceType === 'listing') return 'Listing'
  if (sourceType === 'uploaded_document') return 'Uploaded Document'
  if (sourceType === 'portal') return 'Portal'
  if (sourceType === 'market_api') return 'Market API'
  return 'AI Inference'
}

const getTopicRegex = (topic: EvidenceTopic): RegExp => {
  if (topic === 'rental_estimate') return /(rent|rental|lease|monthly)/i
  if (topic === 'yield') return /(yield|airbnb|occupancy|adr)/i
  if (topic === 'roi') return /(roi|return|appreciation|cashflow)/i
  if (topic === 'recommendation') return /(recommend|decision|score|invest)/i
  return /(score|invest|yield|roi|risk|opportunit)/i
}

const averageConfidence = (items: AnalysisFindingItem[]): number | null => {
  const values = items
    .map((item) => item.confidence)
    .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))

  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

const deriveConfidence = (
  analysis: InvestmentAnalysis,
  relevantFacts: AnalysisFindingItem[],
  relevantEstimates: AnalysisFindingItem[],
): ConfidenceResult => {
  const missingEvidenceCount = analysis.findings?.missingEvidence?.length ?? analysis.missingData.length
  const dataCompleteness = calculateDataCompleteness({
    missingEvidenceCount,
    totalExpectedEvidence: 8,
  })

  const evidenceStrength = averageConfidence([...relevantFacts, ...relevantEstimates])
    ?? averageConfidence(analysis.findings?.estimates ?? [])
    ?? 55

  const sourceTypes = [...relevantFacts, ...relevantEstimates].map((item) => item.sourceType)
  const sourceQuality = calculateSourceQuality({
    sourceTypes: sourceTypes.length > 0 ? sourceTypes : ['ai_inference'],
  })

  return calculateConfidence({
    dataCompleteness,
    evidenceStrength,
    sourceQuality,
  })
}

export function EvidenceExplorer({ analysis, topic, label, valueText }: EvidenceExplorerProps) {
  const [open, setOpen] = useState(false)

  const model = useMemo(() => {
    const findings = analysis.findings
    const facts = findings?.facts ?? []
    const estimates = findings?.estimates ?? []
    const assumptions = findings?.assumptions ?? []
    const missingEvidence = findings?.missingEvidence ?? analysis.missingData.map((item) => ({
      title: item,
      value: item,
      confidence: 35,
      sourceType: 'ai_inference' as const,
      explanation: item,
    }))

    const topicRegex = getTopicRegex(topic)
    const relevantFacts = facts.filter((item) => topicRegex.test(`${item.title} ${item.value} ${item.explanation}`))
    const relevantEstimates = estimates.filter((item) => topicRegex.test(`${item.title} ${item.value} ${item.explanation}`))

    const confidence = topic === 'recommendation' && analysis.recommendationConfidence
      ? analysis.recommendationConfidence
      : deriveConfidence(analysis, relevantFacts, relevantEstimates)

    const evidenceSources = [...new Set([...relevantFacts, ...relevantEstimates].map((item) => sourceLabel(item.sourceType)))]

    return {
      relevantFacts,
      relevantEstimates,
      assumptions,
      missingEvidence,
      confidence,
      evidenceSources,
    }
  }, [analysis, topic])

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        Why?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{valueText}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <section className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidence Sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {model.evidenceSources.length > 0 ? model.evidenceSources.map((source) => (
                  <Badge key={source} variant="outline">{source}</Badge>
                )) : <span className="text-muted-foreground">No direct source evidence available.</span>}
              </div>
            </section>

            <section className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Facts Used</p>
              <ul className="mt-2 space-y-1 text-foreground/85">
                {model.relevantFacts.length > 0 ? model.relevantFacts.map((item) => (
                  <li key={`${item.title}-${item.value}`}>- {item.value}</li>
                )) : <li className="text-muted-foreground">- No direct fact match was detected for this metric.</li>}
              </ul>
            </section>

            <section className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assumptions Used</p>
              <ul className="mt-2 space-y-1 text-foreground/85">
                {model.assumptions.length > 0 ? model.assumptions.slice(0, 4).map((item) => (
                  <li key={`${item.title}-${item.value}`}>- {item.value}</li>
                )) : <li className="text-muted-foreground">- No explicit assumptions were captured.</li>}
              </ul>
            </section>

            <section className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing Evidence</p>
              <ul className="mt-2 space-y-1 text-foreground/85">
                {model.missingEvidence.length > 0 ? model.missingEvidence.slice(0, 4).map((item) => (
                  <li key={`${item.title}-${item.value}`}>- {item.value}</li>
                )) : <li className="text-muted-foreground">- No missing evidence was flagged.</li>}
              </ul>
            </section>

            <section className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence Breakdown</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Overall</p>
                  <p className="text-base font-semibold">{model.confidence.confidence}%</p>
                  <Badge variant="outline" className="mt-1">{scoreBadge(model.confidence.confidence)}</Badge>
                </div>
                <div className="rounded border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Data Completeness</p>
                  <p className="text-base font-semibold">{model.confidence.dataCompleteness}%</p>
                </div>
                <div className="rounded border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Evidence Strength</p>
                  <p className="text-base font-semibold">{model.confidence.evidenceStrength}%</p>
                </div>
                <div className="rounded border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Source Quality</p>
                  <p className="text-base font-semibold">{model.confidence.sourceQuality}%</p>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
