import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Compass, Trash, ArrowClockwise } from '@phosphor-icons/react'

interface SearchSourceItem {
  id: string
  name: string
  portal: string
  listingCount: number
  monitoringEnabled: boolean
  lastUpdate: string | null
}

interface SearchSourcesPanelProps {
  sources: SearchSourceItem[]
  onDelete?: (source: SearchSourceItem) => void
  onUpdate?: (source: SearchSourceItem) => void
}

export function SearchSourcesPanel({ sources, onDelete, onUpdate }: SearchSourcesPanelProps) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Compass className="h-4 w-4 text-accent" />Search Sources
        </h2>
        <Badge variant="secondary">{sources.length}</Badge>
      </div>
      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">No search sources imported yet. Use Hunter to import a search.</p>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center gap-4 py-3 border-b last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{source.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{source.portal}</Badge>
                  <span className="text-xs text-muted-foreground">{source.listingCount} opportunities</span>
                  {source.lastUpdate && <span className="text-xs text-muted-foreground">Updated {source.lastUpdate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onUpdate && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onUpdate(source)}>
                    <ArrowClockwise className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => onDelete(source)}>
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
