import { Card } from '@/components/ui/card'
import { Database } from '@phosphor-icons/react'
import type { StorageSummary } from './resetService'

interface StorageSummaryPanelProps {
  summary: StorageSummary
}

export function StorageSummaryPanel({ summary }: StorageSummaryPanelProps) {
  const rows = [
    { label: 'Opportunities', value: summary.opportunities > 0 ? String(summary.opportunities) : 'Not configured' },
    { label: 'Search Sources', value: summary.searchSources > 0 ? String(summary.searchSources) : 'Not configured' },
    { label: 'AI Reports', value: summary.aiReports > 0 ? String(summary.aiReports) : 'Not configured' },
    { label: 'Last Import', value: summary.lastImport ?? 'Never' },
  ]
  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-accent" />Storage Summary</h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}