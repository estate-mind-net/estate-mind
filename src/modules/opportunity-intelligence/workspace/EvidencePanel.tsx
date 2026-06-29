import { Card } from '@/components/ui/card'
import type { EvidenceItem } from '../types'

function formatValue(value: unknown): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'string') return value
  return String(value ?? '-')
}

interface EvidencePanelProps {
  evidence: EvidenceItem[]
}

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  const confirmed = evidence.filter((e) => e.source === 'confirmed')
  const inferred = evidence.filter((e) => e.source === 'inferred')
  const sourced = evidence.filter((e) => e.source === 'source')

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Evidence
      </h3>

      {confirmed.length > 0 && (
        <EvidenceSection
          title="Confirmed Facts"
          items={confirmed}
          dotColor="bg-emerald-500"
        />
      )}

      {inferred.length > 0 && (
        <EvidenceSection
          title="Inferred"
          items={inferred}
          dotColor="bg-amber-500"
        />
      )}

      {sourced.length > 0 && (
        <EvidenceSection
          title="From Source"
          items={sourced}
          dotColor="bg-blue-500"
        />
      )}
    </Card>
  )
}

function EvidenceSection({
  title,
  items,
  dotColor,
}: {
  title: string
  items: EvidenceItem[]
  dotColor: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground/60 uppercase tracking-wide">{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
              <span className="text-sm text-foreground/80 truncate">{item.label}</span>
            </div>
            <span className="text-sm font-medium text-foreground shrink-0">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
