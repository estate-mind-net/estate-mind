import { useEffect, useMemo, useState } from 'react'
import { Brain, TrendUp, Target, Buildings, Wallet } from '@phosphor-icons/react'
import { MetricCard } from './MetricCard'
import { ScoreGauge } from './ScoreGauge'
import { AIInsightCard } from './AIInsightCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { opportunityWorkspaceService, type OpportunityWorkspaceItem } from '@/services/supabase/opportunityWorkspace.service'
import { useAuth } from '@/hooks/useAuth'
import type { AIInsight, DashboardMetrics, OpportunityStatus } from '@/lib/types'

interface DashboardProps {
  onNavigate: (page: string, data?: unknown) => void
}

const statusConfig: Record<OpportunityStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'new-opportunity': { label: 'New', variant: 'secondary' },
  'initial-analysis': { label: 'Analyzing', variant: 'outline' },
  'watching': { label: 'Watching', variant: 'outline' },
  'due-diligence': { label: 'Due Diligence', variant: 'default' },
  'negotiation': { label: 'Negotiation', variant: 'default' },
  'acquired': { label: 'Acquired', variant: 'default' },
  'rejected': { label: 'Rejected', variant: 'destructive' }
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { organization } = useAuth()
  const [opportunities, setOpportunities] = useState<OpportunityWorkspaceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)

      try {
        const result = await opportunityWorkspaceService.getMyOpportunities({
          organizationId: organization?.id,
        })

        setOpportunities(result.items)
      } catch (error) {
        console.error('Failed to load dashboard opportunities', error)
        setOpportunities([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadDashboardData()
  }, [organization?.id])

  const metrics = useMemo<DashboardMetrics>(() => {
    if (opportunities.length === 0) {
      return {
        totalOpportunities: 0,
        averageScore: 0,
        bestYield: 0,
        portfolioValue: 0,
        activeDeals: 0,
        analyzedThisMonth: 0,
      }
    }

    const scored = opportunities.filter((item) => item.analysis)
    const averageScore = scored.length > 0
      ? Math.round(scored.reduce((sum, item) => sum + (item.analysis?.score.overall ?? 0), 0) / scored.length)
      : 0

    const bestYield = scored.length > 0
      ? Math.max(...scored.map((item) => item.analysis?.rentalYieldEstimate.percentage ?? 0))
      : 0

    const portfolioValue = opportunities.reduce((sum, item) => sum + item.askingPrice, 0)
    const activeDeals = opportunities.filter((item) => ['due-diligence', 'negotiation', 'watching'].includes(item.stage)).length
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const analyzedThisMonth = scored.filter((item) => {
      const analyzedAt = item.analysis?.analyzedAt
      return analyzedAt ? new Date(analyzedAt).getTime() >= thirtyDaysAgo : false
    }).length

    return {
      totalOpportunities: opportunities.length,
      averageScore,
      bestYield: Number(bestYield.toFixed(1)),
      portfolioValue,
      activeDeals,
      analyzedThisMonth,
    }
  }, [opportunities])

  const insights = useMemo<AIInsight[]>(() => {
    return opportunities
      .filter((item) => item.analysis)
      .slice(0, 3)
      .map((item) => ({
        id: `insight-${item.id}`,
        type: 'opportunity',
        priority: (item.analysis?.recommendation === 'buy' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        title: `${item.title} recommendation: ${(item.analysis?.recommendation ?? 'watch').toUpperCase()}`,
        description: item.analysis?.executiveSummary ?? 'AI analysis is available for this opportunity.',
        propertyId: item.propertyId,
        actionable: Boolean(item.analysis),
        createdAt: item.updatedAt,
      }))
  }, [opportunities])

  const recentOpportunities = useMemo(
    () => [...opportunities].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4),
    [opportunities],
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Investment Dashboard</h1>
          <p className="mt-2 text-sm sm:text-base text-foreground/70">AI-powered investment intelligence</p>
        </div>
        <div className="flex items-stretch sm:items-center">
          <Button onClick={() => onNavigate('new-opportunity')} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
            <Brain className="mr-2 h-5 w-5" />
            Analyze Property
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Opportunities"
          value={metrics.totalOpportunities}
          icon={<Buildings className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Average Score"
          value={metrics.averageScore}
          subtitle="/100"
          icon={<Target className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Best Yield"
          value={`${metrics.bestYield}%`}
          subtitle="Annual"
          icon={<TrendUp className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Portfolio Value"
          value={`€${(metrics.portfolioValue / 1000000).toFixed(1)}M`}
          icon={<Wallet className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <div className="mb-4 sm:mb-6 flex items-center">
            <h2 className="font-display text-xl sm:text-2xl font-bold">Recent Opportunities</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {recentOpportunities.length === 0 && !isLoading ? (
              <Card className="border-dashed p-6 text-center text-muted-foreground">
                Analyze your first property opportunity
              </Card>
            ) : null}

            {recentOpportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => {
                  if (opp.analysis) {
                    onNavigate('report', opp.analysis)
                  }
                }}
                className="flex cursor-pointer items-start gap-3 sm:gap-4 rounded-lg border border-border bg-card/50 p-3 sm:p-4 transition-all hover:border-accent/50 hover:bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{opp.property.title}</h3>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground truncate">
                        {opp.property.city}, {opp.property.country}
                      </p>
                    </div>
                    {opp.analysis && (
                      <div className="flex-shrink-0">
                        <ScoreGauge score={opp.analysis.score.overall} size="sm" showLabel={false} />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge {...statusConfig[opp.stage]}>{statusConfig[opp.stage].label}</Badge>
                    {((opp.analysis?.opportunities ?? []).slice(0, 2)).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {(opp.analysis?.opportunities?.length ?? 0) > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{(opp.analysis?.opportunities?.length ?? 0) - 2}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className="font-semibold whitespace-nowrap">
                      {opp.currency} {opp.askingPrice.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-muted-foreground whitespace-nowrap">{opp.property.sizeSqm}m²</span>
                    <span className="text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-muted-foreground whitespace-nowrap">{opp.property.bedrooms} bed</span>
                    {opp.analysis && (
                      <>
                        <span className="text-muted-foreground hidden sm:inline">•</span>
                        <span className="text-success font-medium whitespace-nowrap">
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

        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-lg sm:text-xl font-bold">AI Insights</h2>
            </div>
            <div className="space-y-3">
              {insights.map((insight) => (
                <AIInsightCard
                  key={insight.id}
                  insight={insight}
                  onClick={() => {
                    if (insight.propertyId) {
                      const opp = opportunities.find(o => o.propertyId === insight.propertyId)
                      if (opp?.analysis) {
                        onNavigate('report', opp.analysis)
                      }
                    }
                  }}
                />
              ))}
              {insights.length === 0 && !isLoading ? (
                <p className="text-sm text-muted-foreground">AI insights will appear after your first analyzed opportunity.</p>
              ) : null}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 font-display text-lg sm:text-xl font-bold">Active Deals</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Due Diligence</span>
                <span className="font-semibold">{opportunities.filter((item) => item.stage === 'due-diligence').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Offer Stage</span>
                <span className="font-semibold">{opportunities.filter((item) => item.stage === 'negotiation').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Watching</span>
                <span className="font-semibold">{opportunities.filter((item) => item.stage === 'watching').length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
