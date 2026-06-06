import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DotsSixVertical, Eye, MapPin } from '@phosphor-icons/react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { ScoreGauge } from './ScoreGauge'
import { useKV } from '@github/spark/hooks'
import { mockOpportunities } from '@/lib/mockData'
import { opportunityStageColors, opportunityStageLabels } from '@/lib/constants/opportunityStages'

interface InvestmentPipelineProps {
  onBack: () => void
  onViewOpportunity: (opportunity: Opportunity) => void
}

const columns: { id: OpportunityStatus; label: string; color: string }[] = [
  { id: 'lead', label: opportunityStageLabels.lead, color: opportunityStageColors.lead },
  { id: 'interested', label: opportunityStageLabels.interested, color: opportunityStageColors.interested },
  { id: 'negotiating', label: opportunityStageLabels.negotiating, color: opportunityStageColors.negotiating },
  { id: 'offer-made', label: opportunityStageLabels['offer-made'], color: opportunityStageColors['offer-made'] },
  { id: 'due-diligence', label: opportunityStageLabels['due-diligence'], color: opportunityStageColors['due-diligence'] },
  { id: 'purchased', label: opportunityStageLabels.purchased, color: opportunityStageColors.purchased },
  { id: 'sold', label: opportunityStageLabels.sold, color: opportunityStageColors.sold },
  { id: 'rejected', label: 'Rejected', color: 'oklch(0.60 0.22 25)' }
]

export function InvestmentPipeline({ onBack, onViewOpportunity }: InvestmentPipelineProps) {
  const [opportunities, setOpportunities] = useKV<Opportunity[]>('opportunities', mockOpportunities)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    setDraggedItem(oppId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: OpportunityStatus) => {
    e.preventDefault()
    if (!draggedItem) return

    setOpportunities((current) => 
      (current || []).map((opp) =>
        opp.id === draggedItem
          ? { ...opp, status: newStatus, updatedAt: new Date().toISOString() }
          : opp
      )
    )
    setDraggedItem(null)
  }

  const getOpportunitiesByStatus = (status: OpportunityStatus) => {
    return opportunities?.filter((opp) => opp.status === status) || []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Investment Pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag and drop opportunities through your investment workflow
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {columns.map((column) => {
          const columnOpps = getOpportunitiesByStatus(column.id)
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-semibold">{column.label}</h3>
                </div>
                <Badge variant="secondary">{columnOpps.length}</Badge>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {columnOpps.map((opp) => (
                  <Card
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    className="p-4 cursor-move hover:shadow-md transition-all border-l-4"
                    style={{ borderLeftColor: column.color }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm line-clamp-2">
                          {opp.property.title}
                        </h4>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">
                            {opp.property.city}, {opp.property.country}
                          </span>
                        </div>
                      </div>
                      <DotsSixVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-bold text-base">
                          {opp.property.currency === 'EUR' ? '€' : '$'}
                          {(opp.property.askingPrice / 1000).toFixed(0)}k
                        </span>
                        {opp.analysis && (
                          <span className="text-muted-foreground ml-2">
                            • {opp.analysis.rentalYieldEstimate.percentage.toFixed(1)}% yield
                          </span>
                        )}
                      </div>
                      {opp.analysis && (
                        <ScoreGauge score={opp.analysis.score.overall} size="sm" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onViewOpportunity(opp)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </div>
                  </Card>
                ))}

                {columnOpps.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
                    Drop opportunities here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
