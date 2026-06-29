import { Card } from '@/components/ui/card'
import type { OpportunityScore, NormalizedOpportunity } from '../types'

interface Risk {
  title: string
  severity: 'high' | 'medium' | 'low'
  explanation: string
}

function deriveRisks(opportunity: NormalizedOpportunity, score: OpportunityScore): Risk[] {
  const risks: Risk[] = []

  // Low confidence risk
  if (score.confidenceScore < 50) {
    risks.push({
      title: 'Low data confidence',
      severity: 'high',
      explanation: `Only ${score.confidenceScore}% of expected data is available. Scoring accuracy is limited.`,
    })
  }

  // Required fields missing
  const requiredMissing = score.missingData.filter((m) => m.severity === 'required')
  if (requiredMissing.length > 0) {
    risks.push({
      title: `${requiredMissing.length} required field(s) missing`,
      severity: 'high',
      explanation: requiredMissing.map((m) => m.label).join(', ') + '. Scoring may be unreliable.',
    })
  }

  // Low score risk
  if (score.totalScore < 50) {
    risks.push({
      title: 'Below minimum threshold',
      severity: 'high',
      explanation: `Score of ${score.totalScore}/100 suggests this opportunity does not meet your requirements.`,
    })
  }

  // No source URL
  if (!opportunity.sourceUrl) {
    risks.push({
      title: 'No source link',
      severity: 'medium',
      explanation: 'Cannot verify the original listing. Information accuracy is unconfirmed.',
    })
  }

  // Budget risk for rent
  if (opportunity.moduleType === 'rent') {
    const budgetBreakdown = score.scoreBreakdown.find((b) => b.dimension === 'budgetFit')
    if (budgetBreakdown && budgetBreakdown.score < 50) {
      risks.push({
        title: 'Price above budget',
        severity: 'high',
        explanation: 'Monthly rent exceeds your stated budget significantly.',
      })
    }
  }

  return risks
}

const severityStyles = {
  high: 'border-l-red-400 bg-red-50/50',
  medium: 'border-l-amber-400 bg-amber-50/50',
  low: 'border-l-blue-400 bg-blue-50/50',
}

const severityLabel = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-blue-600',
}

interface RisksPanelProps {
  opportunity: NormalizedOpportunity
  score: OpportunityScore
}

export function RisksPanel({ opportunity, score }: RisksPanelProps) {
  const risks = deriveRisks(opportunity, score)

  if (risks.length === 0) return null

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Risks
      </h3>
      <div className="space-y-2">
        {risks.map((risk, i) => (
          <div key={i} className={`border-l-2 pl-3 py-2 ${severityStyles[risk.severity]}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium uppercase tracking-wide ${severityLabel[risk.severity]}`}>
                {risk.severity}
              </span>
              <span className="text-sm font-medium text-foreground">{risk.title}</span>
            </div>
            <p className="text-xs text-foreground/60 mt-0.5">{risk.explanation}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
