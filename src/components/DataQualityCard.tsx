import { Info } from '@phosphor-icons/react'
import type { InvestmentAnalysis, AnalysisFindingItem } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type QualityRow = {
  label: 'Property Facts' | 'Rental Estimate' | 'Financial Model' | 'Market Data' | 'Legal Data' | 'Overall Confidence'
  percentage: number
  explanation: string
}

interface DataQualityCardProps {
  analysis: InvestmentAnalysis
  className?: string
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const averageConfidence = (items: AnalysisFindingItem[]): number | null => {
  const values = items
    .map((item) => item.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

const toConfidenceBadge = (value: number): { label: 'High' | 'Medium' | 'Low'; className: string } => {
  if (value >= 80) {
    return {
      label: 'High',
      className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    }
  }

  if (value >= 60) {
    return {
      label: 'Medium',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    }
  }

  return {
    label: 'Low',
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  }
}

const toRows = (analysis: InvestmentAnalysis): QualityRow[] => {
  const findings = analysis.findings

  const facts = findings?.facts ?? []
  const estimates = findings?.estimates ?? []
  const assumptions = findings?.assumptions ?? []
  const risks = findings?.risks ?? []
  const opportunities = findings?.opportunities ?? []

  const marketFacts = facts.filter((item) => item.sourceType === 'market_api')
  const legalSignals = [...facts, ...risks, ...opportunities].filter((item) =>
    /(legal|title|zoning|permit|compliance|lien|ownership|lawyer)/i.test(`${item.title} ${item.value} ${item.explanation}`),
  )
  const rentalSignals = estimates.filter((item) =>
    /(rent|rental|yield|airbnb|adr|occupancy)/i.test(`${item.title} ${item.value} ${item.explanation}`),
  )

  const propertyFactsScore = averageConfidence(facts) ?? 60
  const rentalEstimateScore = averageConfidence(rentalSignals.length > 0 ? rentalSignals : estimates) ?? 58
  const financialModelScore = averageConfidence([...estimates, ...assumptions]) ?? averageConfidence(estimates) ?? 56
  const marketDataScore = averageConfidence(marketFacts) ?? (analysis.dataQuality?.usedLiveMarketData ? 62 : 34)
  const legalDataScore = averageConfidence(legalSignals) ?? clamp(Math.round((analysis.score?.legal ?? 55) * 0.9), 0, 100)
  const overallScore = clamp(
    analysis.recommendationConfidence?.confidence
      ?? Math.round((propertyFactsScore + rentalEstimateScore + financialModelScore + marketDataScore + legalDataScore) / 5),
    0,
    100,
  )

  return [
    {
      label: 'Property Facts',
      percentage: propertyFactsScore,
      explanation: facts[0]?.explanation ?? 'Confidence is based on factual listing and user-provided property attributes.',
    },
    {
      label: 'Rental Estimate',
      percentage: rentalEstimateScore,
      explanation: rentalSignals[0]?.explanation ?? estimates[0]?.explanation ?? 'Confidence reflects rental and yield estimate evidence quality.',
    },
    {
      label: 'Financial Model',
      percentage: financialModelScore,
      explanation: assumptions[0]?.explanation ?? 'Confidence reflects model assumptions and estimate consistency.',
    },
    {
      label: 'Market Data',
      percentage: marketDataScore,
      explanation: marketFacts[0]?.explanation
        ?? (analysis.dataQuality?.usedLiveMarketData
          ? 'Confidence benefits from provider-supplied market API evidence.'
          : 'Live market API evidence is limited or unavailable; deterministic assumptions were used.'),
    },
    {
      label: 'Legal Data',
      percentage: legalDataScore,
      explanation: legalSignals[0]?.explanation ?? 'Confidence reflects legal/title/zoning evidence coverage in the current analysis.',
    },
    {
      label: 'Overall Confidence',
      percentage: overallScore,
      explanation:
        analysis.executiveDecision?.summary
        ?? `Composite confidence based on data completeness, evidence strength, and source quality (${overallScore}%).`,
    },
  ]
}

export function DataQualityCard({ analysis, className }: DataQualityCardProps) {
  const rows = toRows(analysis)

  return (
    <Card className={cn('border-border/70 p-6 print:border-slate-300 print:shadow-none', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Data Quality</h2>
        <Badge variant="outline" className="border-border/60">Explainable confidence</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => {
          const badge = toConfidenceBadge(row.percentage)

          return (
            <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{row.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`${row.label} explanation`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="max-w-xs leading-5">
                    {row.explanation}
                  </TooltipContent>
                </Tooltip>
              </div>

              <span className="text-sm font-semibold tabular-nums">{row.percentage}%</span>

              <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
