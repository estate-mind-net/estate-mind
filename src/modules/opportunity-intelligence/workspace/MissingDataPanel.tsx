import { Card } from '@/components/ui/card'
import type { MissingDataItem, MissingDataSeverity } from '../types'

const severityConfig: Record<MissingDataSeverity, { label: string; color: string; bg: string }> = {
  required: { label: 'High', color: 'text-red-600', bg: 'bg-red-50' },
  recommended: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50' },
  optional: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted' },
}

interface MissingDataPanelProps {
  missingData: MissingDataItem[]
}

export function MissingDataPanel({ missingData }: MissingDataPanelProps) {
  if (missingData.length === 0) return null

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Missing Data
      </h3>
      <div className="space-y-2">
        {missingData.map((item, i) => {
          const config = severityConfig[item.severity]
          return (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${config.color} ${config.bg}`}>
                {config.label}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-foreground/60">{item.impact}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
