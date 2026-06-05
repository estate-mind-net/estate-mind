import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Buildings, MapPin, Sparkle, TrendUp, Warning } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreGauge } from '@/components/ScoreGauge'
import { useAuth } from '@/hooks/useAuth'
import { opportunityWorkspaceService, type OpportunityWorkspaceDetail } from '@/services/supabase/opportunityWorkspace.service'

const statusLabels: Record<string, string> = {
  'new-opportunity': 'New',
  'initial-analysis': 'Analyzing',
  watching: 'Watching',
  'due-diligence': 'Due Diligence',
  negotiation: 'Negotiation',
  acquired: 'Acquired',
  rejected: 'Rejected',
}

const formatCurrency = (currency: string, value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return `${currency} ${Math.round(value).toLocaleString()}`
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[420px] xl:col-span-2" />
        <Skeleton className="h-[420px]" />
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  )
}

export function OpportunityDetailPage() {
  const navigate = useNavigate()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const { organization } = useAuth()
  const [item, setItem] = useState<OpportunityWorkspaceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!opportunityId) {
        setError('Missing opportunity id.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await opportunityWorkspaceService.getOpportunityById(opportunityId, {
          organizationId: organization?.id,
        })

        if (!data) {
          setError('Opportunity not found.')
          setItem(null)
        } else {
          setItem(data)
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load opportunity detail.')
        setItem(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [opportunityId, organization?.id])

  const latestAnalysis = useMemo(() => {
    if (!item) {
      return null
    }

    return item.notes.find((note) => Boolean(note.parsedAnalysis))?.parsedAnalysis ?? item.analysis
  }, [item])

  if (isLoading) {
    return <LoadingState />
  }

  if (error || !item) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <Warning className="h-6 w-6" weight="fill" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">Could not load opportunity detail</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Unknown error.'}</p>
            <Button className="mt-5" variant="outline" onClick={() => navigate('/opportunities')}>
              Back to Opportunities
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{item.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {item.city}, {item.country}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{statusLabels[item.stage] ?? item.stage}</Badge>
          <Badge variant="secondary">{item.priority}</Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border/70 bg-gradient-to-br from-card via-card to-accent/5 p-6">
          <div className="flex items-center gap-2">
            <Buildings className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="font-display text-xl font-bold">Property Facts</h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Asking Price" value={formatCurrency(item.currency, item.askingPrice)} />
            <InfoBlock label="Estimated Monthly Rent" value={formatCurrency(item.currency, latestAnalysis?.rentalYieldEstimate.monthly ?? item.expectedMonthlyRent)} />
            <InfoBlock label="Property Type" value={item.property.propertyType} />
            <InfoBlock label="Size" value={`${item.property.sizeSqm} m²`} />
            <InfoBlock label="Bedrooms" value={String(item.property.bedrooms)} />
            <InfoBlock label="Condition" value={item.property.condition.replace('-', ' ')} />
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{item.property.description}</p>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 p-6">
            <div className="flex items-center gap-2">
              <TrendUp className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-xl font-bold">AI Snapshot</h2>
            </div>

            {latestAnalysis ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Badge variant="outline" className="border-accent/40 text-accent">
                    {latestAnalysis.recommendation.toUpperCase()}
                  </Badge>
                  <ScoreGauge score={latestAnalysis.score.overall} size="sm" showLabel={false} />
                </div>

                <InfoBlock label="AI Score" value={`${latestAnalysis.score.overall}/100`} />
                <InfoBlock label="Estimated Monthly Rent" value={formatCurrency(item.currency, latestAnalysis.rentalYieldEstimate.monthly)} />
                <InfoBlock label="ROI Estimate" value={`${(latestAnalysis.rentalYieldEstimate.percentage + latestAnalysis.appreciationPotential.oneYear).toFixed(2)}%`} />
                <InfoBlock label="Rental Yield" value={`${latestAnalysis.rentalYieldEstimate.percentage}%`} />
                <InfoBlock label="Airbnb Yield" value={`${latestAnalysis.airbnbPotential.percentage}%`} />
                <InfoBlock label="Recommendation" value={latestAnalysis.recommendation.toUpperCase()} />
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">AI analysis is not available for this opportunity yet.</p>
            )}
          </Card>

          <Card className="border-border/70 p-6">
            <div className="flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-xl font-bold">AI Notes</h2>
            </div>

            <div className="mt-5 space-y-3">
              {item.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AI notes yet.</p>
              ) : (
                item.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/80">
                      {note.parsedAnalysis?.executiveSummary ?? note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
