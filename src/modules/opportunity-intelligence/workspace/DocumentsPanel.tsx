import { FileText, Plus } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DocumentsPanelProps {
  sourceUrl?: string | null
}

export function DocumentsPanel({ sourceUrl }: DocumentsPanelProps) {
  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Documents
      </h3>
      <div className="space-y-2">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-1.5 text-sm text-accent hover:underline"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Original Listing</span>
          </a>
        )}
        <Button variant="ghost" size="sm" disabled className="w-full justify-start text-xs text-foreground/40 h-7">
          <Plus className="mr-1.5 h-3 w-3" />
          Upload document (coming soon)
        </Button>
      </div>
    </Card>
  )
}
