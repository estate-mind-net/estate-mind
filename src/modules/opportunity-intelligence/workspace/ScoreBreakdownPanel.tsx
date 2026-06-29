import { Card } from '@/components/ui/card'
import type { ScoreBreakdownItem } from '../types'

interface ScoreBreakdownPanelProps {
  breakdown: ScoreBreakdownItem[]
}

export function ScoreBreakdownPanel({ breakdown }: ScoreBreakdownPanelProps) {
  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Score Breakdown
      </h3>
      <div className="space-y-3">
        {breakdown.map((item) => (
          <BreakdownRow key={item.dimension} item={item} />
        ))}
      </div>
    </Card>
  )
}

function BreakdownRow({ item }: { item: ScoreBreakdownItem }) {
  const pct = Math.round(item.weight * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/80">{item.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{pct}%</span>
          <span className="font-semibold tabular-nums w-8 text-right">{item.weightedScore}</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all bg-foreground/30"
          style={{ width: `${item.score}%` }}
        />
      </div>
      <p className="text-xs text-foreground/50">{item.explanation}</p>
    </div>
  )
}
