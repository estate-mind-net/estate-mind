import { ArrowLeft, PencilSimple, Export, ShareNetwork } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NormalizedOpportunity, OpportunityScore, OpportunityModuleType } from '../types'

const MODULE_LABELS: Record<OpportunityModuleType, string> = {
  rent: 'Rent',
  invest: 'Invest',
  buy: 'Buy',
  build: 'Build',
  renovate: 'Renovate',
  airbnb: 'Airbnb',
  due_diligence: 'Due Diligence',
  energy: 'Energy',
  portfolio: 'Portfolio',
}

interface WorkspaceHeaderProps {
  opportunity: NormalizedOpportunity
  score: OpportunityScore
  onBack: () => void
  onEdit?: () => void
}

export function WorkspaceHeader({ opportunity, score, onBack, onEdit }: WorkspaceHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="-ml-2 shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <PencilSimple className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm" disabled title="Export coming soon">
            <Export className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" disabled title="Share coming soon">
            <ShareNetwork className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {opportunity.title}
          </h1>
          <Badge variant="secondary" className="text-xs">
            {MODULE_LABELS[opportunity.moduleType] ?? opportunity.moduleType}
          </Badge>
        </div>
        <p className="text-sm text-foreground/60">
          {opportunity.district}{opportunity.city ? `, ${opportunity.city}` : ''}
          {opportunity.address ? ` \u2014 ${opportunity.address}` : ''}
        </p>
      </div>
    </div>
  )
}
