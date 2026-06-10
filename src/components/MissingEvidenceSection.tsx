import type { InvestmentAnalysis, MissingEvidenceSeverity } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Row = {
  title: string
  value: string
  severity: MissingEvidenceSeverity
}

const severityRank: Record<MissingEvidenceSeverity, number> = {
  critical: 0,
  important: 1,
  optional: 2,
}

const severityLabel: Record<MissingEvidenceSeverity, string> = {
  critical: 'Critical',
  important: 'Important',
  optional: 'Optional',
}

const severityStyle: Record<MissingEvidenceSeverity, string> = {
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  important: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  optional: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

const normalizeSeverity = (value: unknown): MissingEvidenceSeverity => {
  if (value === 'critical' || value === 'important' || value === 'optional') return value
  return 'important'
}

const deriveRows = (analysis: InvestmentAnalysis): Row[] => {
  const findings = analysis.findings?.missingEvidence ?? []

  if (findings.length === 0) {
    return analysis.missingData.map((item) => ({
      title: item,
      value: item,
      severity: 'important' as const,
    }))
  }

  return findings
    .map((item) => ({
      title: item.title,
      value: item.value,
      severity: normalizeSeverity(item.severity),
    }))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}

export function MissingEvidenceSection({ analysis, className }: { analysis: InvestmentAnalysis; className?: string }) {
  const rows = deriveRows(analysis)

  return (
    <Card className={`border-border/70 p-6 print:border-slate-300 print:shadow-none ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Missing Evidence</h2>
        <Badge variant="outline" className="border-border/60">Sorted by severity</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No missing evidence flagged.</p>
        ) : rows.map((row) => (
          <div key={`${row.title}-${row.value}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.value}</p>
            </div>
            <Badge variant="outline" className={severityStyle[row.severity]}>
              {severityLabel[row.severity]}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}
