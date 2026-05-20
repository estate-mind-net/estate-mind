import { Brain, TrendUp, ChartLine, Target, Buildings, Wallet } from '@phosphor-icons/react'
import { MetricCard } from './MetricCard'
import { ScoreGauge } from './ScoreGauge'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockDashboardMetrics, mockOpportunities } from '@/lib/mockData'
import type { OpportunityStatus } from '@/lib/types'

interface DashboardProps {
  onNavigate: (page: string, data?: unknown) => void
}

const statusConfig: Record<OpportunityStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'new': { label: 'New', variant: 'secondary' },
  'watching': { label: 'Watching', variant: 'outline' },
  'due-diligence': { label: 'Due Diligence', variant: 'default' },
  'offer': { label: 'Offer', variant: 'default' },
  'negotiation': { label: 'Negotiation', variant: 'default' },
  'acquired': { label: 'Acquired', variant: 'default' },
  'rejected': { label: 'Rejected', variant: 'destructive' }
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const metrics = mockDashboardMetrics

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Investment Dashboard</h1>
          <p className="mt-2 text-foreground/70">Track your real estate investment pipeline</p>
        </div>
        <Button onClick={() => onNavigate('analyzer')} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Brain className="mr-2 h-5 w-5" />
          Analyze Property
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Opportunities"
          value={metrics.totalOpportunities}
          icon={<Buildings className="h-6 w-6" weight="duotone" />}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Average Score"
          value={metrics.averageScore}
          subtitle="/100"
          icon={<Target className="h-6 w-6" weight="duotone" />}
        />
        <MetricCard
          title="Best Yield"
          value={`${metrics.bestYield}%`}
          subtitle="Annual"
          icon={<TrendUp className="h-6 w-6" weight="duotone" />}
          trend={{ value: 0.8, isPositive: true }}
        />
        <MetricCard
          title="Portfolio Value"
          value={`€${(metrics.portfolioValue / 1000000).toFixed(1)}M`}
          icon={<Wallet className="h-6 w-6" weight="duotone" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Recent Opportunities</h2>
            <Button variant="outline" size="sm" onClick={() => onNavigate('opportunities')}>
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {mockOpportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => onNavigate('report', opp.analysis)}
                className="flex cursor-pointer items-start gap-4 rounded-lg border border-border bg-card/50 p-4 transition-all hover:border-accent/50 hover:bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{opp.property.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {opp.property.city}, {opp.property.country}
                      </p>
                    </div>
                    {opp.analysis && (
                      <ScoreGauge score={opp.analysis.score.overall} size="sm" showLabel={false} />
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge {...statusConfig[opp.status]}>{statusConfig[opp.status].label}</Badge>
                    {opp.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="font-semibold">
                      {opp.property.currency} {opp.property.askingPrice.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{opp.property.sizeSqm}m²</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{opp.property.bedrooms} bed</span>
                    {opp.analysis && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-success font-medium">
                          {opp.analysis.rentalYieldEstimate.percentage}% yield
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ChartLine className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-xl font-bold">AI Insights</h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                <p className="text-sm font-medium text-success">Strong Buy Signal</p>
                <p className="mt-1 text-xs text-foreground/70">
                  Lisbon city center properties showing 15% YoY appreciation
                </p>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="text-sm font-medium text-warning">Market Watch</p>
                <p className="mt-1 text-xs text-foreground/70">
                  Athens coastal villas entering high season pricing
                </p>
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-3">
                <p className="text-sm font-medium text-accent">New Opportunity</p>
                <p className="mt-1 text-xs text-foreground/70">
                  3 new properties match your investment criteria
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Active Deals</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due Diligence</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Offer Stage</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Watching</span>
                <span className="font-semibold">1</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
