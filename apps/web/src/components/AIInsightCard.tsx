import { Brain, TrendUp, Warning, Lightbulb } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AIInsight } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AIInsightCardProps {
  insight: AIInsight
  onClick?: () => void
}

const typeConfig = {
  opportunity: {
    icon: Lightbulb,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20'
  },
  risk: {
    icon: Warning,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20'
  },
  market: {
    icon: TrendUp,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/20'
  },
  financial: {
    icon: Brain,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20'
  }
}

const priorityConfig = {
  high: { label: 'High Priority', variant: 'destructive' as const },
  medium: { label: 'Medium', variant: 'secondary' as const },
  low: { label: 'Low', variant: 'outline' as const }
}

export function AIInsightCard({ insight, onClick }: AIInsightCardProps) {
  const config = typeConfig[insight.type]
  const Icon = config.icon
  const priority = priorityConfig[insight.priority]

  return (
    <Card 
      className={cn(
        "p-4 transition-all hover:shadow-md border-l-4",
        config.borderColor,
        onClick && "cursor-pointer hover:border-l-8"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.bgColor)}>
          <Icon className={cn("h-5 w-5", config.color)} weight="duotone" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold">{insight.title}</h4>
            {insight.priority !== 'low' && (
              <Badge variant={priority.variant} className="text-xs px-1.5 py-0">
                {priority.label}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {insight.description}
          </p>
          
          {insight.actionable && (
            <p className="text-xs text-accent mt-2 font-medium">
              Action available →
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
