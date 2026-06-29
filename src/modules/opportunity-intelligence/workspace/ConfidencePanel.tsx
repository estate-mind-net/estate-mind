import { Card } from '@/components/ui/card'
import type { OpportunityScore } from '../types'

function getConfidenceLevel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Very High', color: 'text-emerald-600' }
  if (score >= 75) return { label: 'High', color: 'text-blue-600' }
  if (score >= 55) return { label: 'Medium', color: 'text-amber-600' }
  if (score >= 35) return { label: 'Low', color: 'text-orange-600' }
  return { label: 'Very Low', color: 'text-red-600' }
}

interface ConfidencePanelProps {
  score: OpportunityScore
}

export function ConfidencePanel({ score }: ConfidencePanelProps) {
  const level = getConfidenceLevel(score.confidenceScore)
  const confirmed = score.evidence.filter((e) => e.source === 'confirmed')
  const missing = score.missingData

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
          Confidence
        </h3>
        <div className="text-right">
          <span className={`font-display text-xl font-bold ${level.color}`}>
            {score.confidenceScore}%
          </span>
          <span className={`ml-2 text-xs font-medium ${level.color}`}>
            {level.label}
          </span>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all bg-foreground/30"
          style={{ width: `${score.confidenceScore}%` }}
        />
      </div>

      {confirmed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Confirmed</p>
          <div className="flex flex-wrap gap-1">
            {confirmed.map((e, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-foreground/70 bg-emerald-50 rounded px-1.5 py-0.5">
                <span className="text-emerald-500">&#10003;</span>
                {e.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Missing</p>
          <div className="flex flex-wrap gap-1">
            {missing.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-foreground/70 bg-amber-50 rounded px-1.5 py-0.5">
                <span className="text-amber-500">&#10007;</span>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
