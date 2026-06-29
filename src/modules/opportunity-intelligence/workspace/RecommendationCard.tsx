import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { RecommendationLevel, OpportunityScore } from '../types'

const recommendationConfig: Record<RecommendationLevel, {
  color: string
  bg: string
  border: string
  description: string
}> = {
  'Excellent Fit': {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Strongly aligns with your preferences. Recommended for immediate action.',
  },
  'Good Fit': {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Solid match with minor gaps. A viewing is recommended.',
  },
  'Possible Fit': {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Has potential but several mismatches. Worth monitoring.',
  },
  'Weak Fit': {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    description: 'Significant gaps with your requirements. Consider alternatives.',
  },
  'Reject': {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    description: 'Does not meet key requirements. Not recommended.',
  },
}

interface RecommendationCardProps {
  score: OpportunityScore
}

export function RecommendationCard({ score }: RecommendationCardProps) {
  const config = recommendationConfig[score.recommendation]
  const confirmedCount = score.evidence.filter((e) => e.source === 'confirmed').length
  const totalPreferences = score.scoreBreakdown.length
  const satisfiedCount = score.scoreBreakdown.filter((b) => b.score >= 70).length

  return (
    <Card className={`p-6 ${config.bg} ${config.border} border`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <Badge variant="outline" className={`${config.color} ${config.border} text-xs font-medium`}>
            RECOMMENDATION
          </Badge>
          <h2 className={`font-display text-2xl font-bold tracking-tight ${config.color}`}>
            {score.recommendation}
          </h2>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-lg">
            This opportunity satisfies {satisfiedCount} of {totalPreferences} scoring dimensions
            based on {confirmedCount} confirmed facts. {config.description}
          </p>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className="font-display text-4xl font-bold tracking-tight">{score.totalScore}</div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">/ 100</p>
        </div>
      </div>
    </Card>
  )
}
