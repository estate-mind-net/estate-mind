import { Card } from '@/components/ui/card'
import type { NormalizedOpportunity } from '../types'

interface TimelineEvent {
  label: string
  date: string
  type: 'created' | 'status' | 'action'
}

function buildTimelineEvents(opportunity: NormalizedOpportunity): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    label: 'Opportunity discovered',
    date: opportunity.capturedAt,
    type: 'created',
  })

  // Module-specific: rent status events from moduleData
  const md = opportunity.moduleData
  if (md.status && typeof md.status === 'string' && md.status !== 'new') {
    events.push({
      label: `Status: ${md.status}`,
      date: opportunity.capturedAt,
      type: 'status',
    })
  }

  if (md.viewedAt && typeof md.viewedAt === 'string') {
    events.push({
      label: 'Viewed',
      date: md.viewedAt,
      type: 'action',
    })
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

interface TimelinePanelProps {
  opportunity: NormalizedOpportunity
}

export function TimelinePanel({ opportunity }: TimelinePanelProps) {
  const events = buildTimelineEvents(opportunity)

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Timeline
      </h3>
      <div className="relative pl-4 space-y-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
        {events.map((event, i) => (
          <div key={i} className="relative flex items-start gap-3">
            <span className="absolute left-[-13px] top-1.5 h-2 w-2 rounded-full bg-foreground/30 border border-background" />
            <div className="min-w-0">
              <p className="text-sm text-foreground/80">{event.label}</p>
              <p className="text-xs text-foreground/40">
                {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
