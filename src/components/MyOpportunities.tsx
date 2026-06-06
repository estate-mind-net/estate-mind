import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Buildings, ChartLine, MapPin, Plus, Sparkle, TrendUp, Warning } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreGauge } from './ScoreGauge'
import { opportunityWorkspaceService, type OpportunityWorkspaceItem } from '@/services/supabase/opportunityWorkspace.service'
import { useAuth } from '@/hooks/useAuth'
import type { InvestmentAnalysis } from '@/lib/types'

interface MyOpportunitiesProps {
  onNavigate: (page: string, data?: unknown) => void
  onBack: () => void
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'new-opportunity': { label: 'New', variant: 'secondary' },
  'initial-analysis': { label: 'Analyzing', variant: 'outline' },
  watching: { label: 'Watching', variant: 'outline' },
  'due-diligence': { label: 'Due Diligence', variant: 'default' },
  negotiation: { label: 'Negotiation', variant: 'default' },
  acquired: { label: 'Acquired', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

const priorityLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  high: { label: 'High', variant: 'default' },
  medium: { label: 'Medium', variant: 'outline' },
  low: { label: 'Low', variant: 'secondary' },
}

const formatCurrency = (currency: string, value: number | null) => {
  if (value === null) return '—'
  return `${currency} ${Math.round(value).toLocaleString()}`
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value))

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <Card className="border-dashed border-border/70 bg-card/60 p-8 sm:p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <Buildings className="h-7 w-7" weight="duotone" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold">Analyze your first property opportunity</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
        Save an analyzed property to Supabase and it will appear here as a tracked investor opportunity with property facts, workflow data, and the latest AI snapshot.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button onClick={() => onNavigate('new-opportunity')} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="mr-2 h-4 w-4" />
          Create Opportunity
        </Button>
        <Button variant="outline" onClick={() => onNavigate('dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </Card>
  )
}

function ErrorState({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5 p-8 sm:p-10">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <Warning className="h-6 w-6" weight="fill" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold">Could not load opportunities</h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">{message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onRetry} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Retry
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function OpportunityCard({ opportunity, onOpen }: { opportunity: OpportunityWorkspaceItem; onOpen: (item: OpportunityWorkspaceItem) => void }) {
  const analysisScore = opportunity.analysis?.score.overall

  return (
    <Card
      className="group cursor-pointer border-border/70 bg-gradient-to-br from-card via-card to-accent/5 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg"
      onClick={() => onOpen(opportunity)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold">{opportunity.title}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{opportunity.city}, {opportunity.country}</span>
          </div>
        </div>
        {analysisScore !== undefined && (
          <ScoreGauge score={analysisScore} size="sm" showLabel={false} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Asking Price</p>
          <p className="mt-1 font-semibold">{formatCurrency(opportunity.currency, opportunity.askingPrice)}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly Rent</p>
          <p className="mt-1 font-semibold">{formatCurrency(opportunity.currency, opportunity.expectedMonthlyRent)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge {...statusLabels[opportunity.stage]}>{statusLabels[opportunity.stage]?.label ?? opportunity.stage}</Badge>
        <Badge {...priorityLabels[opportunity.priority]}>{priorityLabels[opportunity.priority]?.label ?? opportunity.priority}</Badge>
        {opportunity.latestNote?.parsedAnalysis && (
          <Badge variant="outline" className="border-accent/40 text-accent">
            AI note available
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Created {formatDate(opportunity.createdAt)}</span>
        <span className="inline-flex items-center gap-1 text-accent opacity-0 transition-opacity group-hover:opacity-100">
          <Sparkle className="h-3.5 w-3.5" />
          Open detail
        </span>
      </div>
    </Card>
  )
}

function InfoBlock({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? 'rounded-xl border border-border/60 bg-background/60 p-3' : 'rounded-xl border border-border/60 bg-background/60 p-4'}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={compact ? 'mt-1 text-sm font-semibold' : 'mt-2 text-base font-semibold'}>{value}</p>
    </div>
  )
}

function WorkflowRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

function OpportunityDetail({
  opportunity,
  onBack,
  onOpenReport,
}: {
  opportunity: OpportunityWorkspaceItem
  onBack: () => void
  onOpenReport: (analysis: InvestmentAnalysis) => void
}) {
  const parsedAnalysis = opportunity.latestNote?.parsedAnalysis ?? opportunity.analysis

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">{opportunity.title}</h2>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {opportunity.city}, {opportunity.country}
            </p>
          </div>
        </div>
        {parsedAnalysis && (
          <Button onClick={() => onOpenReport(parsedAnalysis)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <ChartLine className="mr-2 h-4 w-4" />
            Open AI Analysis Report
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border/70 bg-gradient-to-br from-card via-card to-accent/5 p-6">
          <div className="flex items-center gap-2">
            <Buildings className="h-5 w-5 text-accent" weight="duotone" />
            <h3 className="font-display text-xl font-bold">Property Facts</h3>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Asking Price" value={formatCurrency(opportunity.currency, opportunity.askingPrice)} />
            <InfoBlock label="Monthly Rent" value={formatCurrency(opportunity.currency, opportunity.expectedMonthlyRent)} />
            <InfoBlock label="Property Type" value={opportunity.property.propertyType} />
            <InfoBlock label="Size" value={`${opportunity.property.sizeSqm} m²`} />
            <InfoBlock label="Bedrooms" value={String(opportunity.property.bedrooms)} />
            <InfoBlock label="Condition" value={opportunity.property.condition.replace('-', ' ')} />
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{opportunity.property.description}</p>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 p-6">
            <div className="flex items-center gap-2">
              <TrendUp className="h-5 w-5 text-accent" weight="duotone" />
              <h3 className="font-display text-xl font-bold">Workflow Data</h3>
            </div>

            <div className="mt-6 space-y-4">
              <WorkflowRow label="Stage" value={statusLabels[opportunity.stage]?.label ?? opportunity.stage} />
              <WorkflowRow label="Priority" value={priorityLabels[opportunity.priority]?.label ?? opportunity.priority} />
              <WorkflowRow label="Created" value={formatDate(opportunity.createdAt)} />
              <WorkflowRow label="Updated" value={formatDate(opportunity.updatedAt)} />
            </div>
          </Card>

          {parsedAnalysis ? (
            <Card className="border-border/70 p-6">
              <div className="flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-accent" weight="duotone" />
                <h3 className="font-display text-xl font-bold">Latest AI Analysis Note</h3>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Badge variant="outline" className="border-accent/40 text-accent">
                    {parsedAnalysis.recommendation.toUpperCase()}
                  </Badge>
                  <ScoreGauge score={parsedAnalysis.score.overall} size="sm" showLabel={false} />
                </div>

                <p className="text-sm leading-6 text-foreground/80">{parsedAnalysis.executiveSummary}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoBlock label="Long-Term Rent" value={formatCurrency(opportunity.currency, parsedAnalysis.rentalYieldEstimate.monthly)} compact />
                  <InfoBlock label="Rent Yield" value={`${parsedAnalysis.rentalYieldEstimate.percentage}%`} compact />
                  <InfoBlock label="Airbnb Yield" value={`${parsedAnalysis.airbnbPotential.percentage}%`} compact />
                  <InfoBlock label="Renovation ROI" value={`${parsedAnalysis.renovationROI.roi}%`} compact />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              No persisted AI analysis note is available for this opportunity yet.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export function MyOpportunities({ onNavigate, onBack }: MyOpportunitiesProps) {
  const { organization } = useAuth()
  const [items, setItems] = useState<OpportunityWorkspaceItem[] | null>(null)
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const loadItems = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await opportunityWorkspaceService.getMyOpportunities({
        organizationId: organization?.id,
      })
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
      setItems(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [organization?.id])

  const selectedOpportunity = useMemo(
    () => items?.find((item) => item.id === selectedOpportunityId) ?? null,
    [items, selectedOpportunityId],
  )

  const metrics = useMemo(() => {
    const opportunityCount = items?.length ?? 0
    const withAnalysis = items?.filter((item) => Boolean(item.latestNote?.parsedAnalysis)).length ?? 0
    const avgRent = items && items.length > 0
      ? items.reduce((sum, item) => sum + (item.expectedMonthlyRent ?? 0), 0) / items.length
      : 0
    const highPriority = items?.filter((item) => item.priority === 'high').length ?? 0
    const currency = items?.[0]?.currency ?? 'EUR'

    return { opportunityCount, withAnalysis, avgRent, highPriority, currency }
  }, [items])

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadItems} onBack={onBack} />
  }

  if (!items || items.length === 0) {
    return <EmptyState onNavigate={onNavigate} />
  }

  if (selectedOpportunity) {
    return (
      <OpportunityDetail
        opportunity={selectedOpportunity}
        onBack={() => setSelectedOpportunityId(null)}
        onOpenReport={(analysis) => onNavigate('report', analysis)}
      />
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkle className="h-3.5 w-3.5" weight="fill" />
            Live Supabase workflow
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">My Opportunities</h1>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-foreground/70">
              Track persisted Deal Analyzer results as investor workflow items with linked property facts, stage, priority, and the latest AI note.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => onNavigate('compare')}>
            <ChartLine className="mr-2 h-4 w-4" />
            Compare Properties
          </Button>
          <Button onClick={() => onNavigate('new-opportunity')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            Analyze Property
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Opportunities</p>
          <p className="mt-2 text-3xl font-bold">{metrics.opportunityCount}</p>
        </Card>
        <Card className="border-border/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">With AI Notes</p>
          <p className="mt-2 text-3xl font-bold">{metrics.withAnalysis}</p>
        </Card>
        <Card className="border-border/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">High Priority</p>
          <p className="mt-2 text-3xl font-bold">{metrics.highPriority}</p>
        </Card>
        <Card className="border-border/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Monthly Rent</p>
          <p className="mt-2 text-3xl font-bold">{formatCurrency('EUR', metrics.avgRent)}</p>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80 p-4 sm:p-6">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Workspace</h2>
              <p className="mt-1 text-sm text-muted-foreground">Switch between compact cards and a table layout.</p>
            </div>
            <TabsList>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cards" className="mt-0">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <OpportunityCard key={item.id} opportunity={item} onOpen={(opportunity) => setSelectedOpportunityId(opportunity.id)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/70 text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">City / Country</th>
                      <th className="px-4 py-3 font-medium">Asking Price</th>
                      <th className="px-4 py-3 font-medium">Expected Rent</th>
                      <th className="px-4 py-3 font-medium">Stage</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70 bg-card/70">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-accent/5"
                        onClick={() => setSelectedOpportunityId(item.id)}
                      >
                        <td className="px-4 py-4 font-medium">{item.title}</td>
                        <td className="px-4 py-4 text-muted-foreground">{item.city}, {item.country}</td>
                        <td className="px-4 py-4">{formatCurrency(item.currency, item.askingPrice)}</td>
                        <td className="px-4 py-4">{formatCurrency(item.currency, item.expectedMonthlyRent)}</td>
                        <td className="px-4 py-4">
                          <Badge {...statusLabels[item.stage]}>{statusLabels[item.stage]?.label ?? item.stage}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge {...priorityLabels[item.priority]}>{priorityLabels[item.priority]?.label ?? item.priority}</Badge>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}