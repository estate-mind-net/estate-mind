import { Brain } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import type { NormalizedOpportunity, OpportunityScore } from '../types'

interface AISummaryPanelProps {
  opportunity: NormalizedOpportunity
  score: OpportunityScore
}

export function AISummaryPanel({ opportunity, score }: AISummaryPanelProps) {
  const summary = buildSummary(opportunity, score)

  return (
    <Card className="p-5 space-y-3 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
          AI Summary
        </h3>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
    </Card>
  )
}

function buildSummary(opportunity: NormalizedOpportunity, score: OpportunityScore): string {
  const parts: string[] = []

  const confirmedCount = score.evidence.filter((e) => e.source === 'confirmed').length
  const requiredMissing = score.missingData.filter((m) => m.severity === 'required')

  parts.push(
    `"${opportunity.title}" in ${[opportunity.district, opportunity.city].filter(Boolean).join(", ") || "unknown location"} scores ${score.totalScore}/100 (${score.recommendation}).`,
  )

  if (confirmedCount > 0) {
    parts.push(`The listing provides ${confirmedCount} confirmed data points.`)
  }

  const topDimension = [...score.scoreBreakdown].sort((a, b) => b.weightedScore - a.weightedScore)[0]
  if (topDimension) {
    parts.push(`Strongest area: ${topDimension.label} (${topDimension.weightedScore}pts).`)
  }

  if (requiredMissing.length > 0) {
    parts.push(`${requiredMissing.length} required field(s) are missing, which limits scoring accuracy.`)
  }

  parts.push(`Overall recommendation: ${score.recommendation}.`)

  return parts.join(' ')
}
