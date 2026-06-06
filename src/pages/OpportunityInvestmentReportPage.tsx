import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, DownloadSimple, Printer, Warning } from '@phosphor-icons/react'
import { InvestmentReport } from '@/components/InvestmentReport'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { opportunityWorkspaceService, type OpportunityWorkspaceDetail } from '@/services/supabase/opportunityWorkspace.service'

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-[620px]" />
    </div>
  )
}

export function OpportunityInvestmentReportPage() {
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
        setError(loadError instanceof Error ? loadError.message : 'Failed to load investment report.')
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
            <h1 className="font-display text-2xl font-bold">Could not load investment report</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Unknown error.'}</p>
            <Button className="mt-5" variant="outline" onClick={() => navigate('/opportunities')}>
              Back to Opportunities
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (!latestAnalysis) {
    return (
      <Card className="border-border/70 p-8">
        <h1 className="font-display text-2xl font-bold">Investment report unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI analysis is not available for this opportunity yet.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => navigate(`/opportunities/${item.id}`)}>
          Back to Opportunity
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold">Full AI Investment Report</h1>
          <p className="text-sm text-muted-foreground">{item.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/opportunities/${item.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunity
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button variant="outline" disabled>
            <DownloadSimple className="mr-2 h-4 w-4" />
            Export PDF (Soon)
          </Button>
        </div>
      </div>

      <InvestmentReport
        analysis={latestAnalysis}
        title={item.title}
        location={`${item.city}, ${item.country}`}
        askingPrice={item.askingPrice}
        currency={item.currency}
        showHeaderActions={false}
      />
    </div>
  )
}
