import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Buildings, Eye, Trash } from '@phosphor-icons/react'
import { DeleteOpportunityDialog } from './DeleteOpportunityDialog'

interface OpportunityItem {
  id: string
  title: string
  moduleType: string
  status: string
  recommendation: string
  workspaceUrl: string
}

interface OpportunitiesPanelProps {
  opportunities: OpportunityItem[]
  onDelete?: (id: string) => void
}

const recVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Excellent Fit': 'default', 'Good Fit': 'secondary', 'Possible Fit': 'outline', 'Weak Fit': 'destructive', 'Reject': 'destructive',
}

export function OpportunitiesPanel({ opportunities, onDelete }: OpportunitiesPanelProps) {
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<OpportunityItem | null>(null)

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Buildings className="h-4 w-4 text-accent" />Opportunities
        </h2>
        <Badge variant="secondary">{opportunities.length}</Badge>
      </div>
      {opportunities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No opportunities yet. Import a search or add manually.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {opportunities.map((opp) => (
            <div key={opp.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{opp.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{opp.moduleType}</Badge>
                  <Badge variant={recVariant[opp.recommendation] ?? 'outline'} className="text-xs">{opp.recommendation}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate(opp.workspaceUrl)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {onDelete && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(opp)}>
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {deleteTarget && onDelete && (
        <DeleteOpportunityDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} opportunityTitle={deleteTarget.title} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null) }} />
      )}
    </Card>
  )
}
