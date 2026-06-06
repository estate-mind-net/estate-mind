import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChartBar, CheckCircle, CrownSimple, TrendUp } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { InvestmentAnalysis } from '@/lib/types'
import { opportunityWorkspaceService, type OpportunityWorkspaceItem } from '@/services/supabase/opportunityWorkspace.service'

type ComparisonMetric = {
  key: string
  label: string
  getValue: (item: OpportunityWorkspaceItem) => number | null
  formatValue: (value: number | null, item: OpportunityWorkspaceItem) => string
  higherIsBetter: boolean
}

const formatCurrency = (currency: string, value: number | null) => {
  if (value === null) {
    return '—'
  }

  return `${currency} ${Math.round(value).toLocaleString()}`
}

const formatPercent = (value: number | null) => {
  if (value === null) {
    return '—'
  }

  return `${value.toFixed(2)}%`
}

const getAnalysis = (item: OpportunityWorkspaceItem): InvestmentAnalysis | null => {
  return item.latestNote?.parsedAnalysis ?? item.analysis
}

const estimateRoi = (analysis: InvestmentAnalysis | null): number | null => {
  if (!analysis) {
    return null
  }

  const appreciation = analysis.appreciationPotential?.oneYear
  const rentalYield = analysis.rentalYieldEstimate?.percentage
  if (typeof appreciation === 'number' && Number.isFinite(appreciation) && typeof rentalYield === 'number' && Number.isFinite(rentalYield)) {
    return Number((appreciation + rentalYield).toFixed(2))
  }

  const renovationRoi = analysis.renovationROI?.roi
  return typeof renovationRoi === 'number' && Number.isFinite(renovationRoi) ? renovationRoi : null
}

const recommendationWeight = (analysis: InvestmentAnalysis | null): number | null => {
  if (!analysis) {
    return null
  }

  if (analysis.recommendation === 'buy') {
    return 3
  }
  if (analysis.recommendation === 'watch') {
    return 2
  }
  if (analysis.recommendation === 'avoid') {
    return 1
  }

  return null
}

const comparisonMetrics: ComparisonMetric[] = [
  {
    key: 'asking-price',
    label: 'Asking Price',
    getValue: (item) => item.askingPrice ?? null,
    formatValue: (value, item) => formatCurrency(item.currency, value),
    higherIsBetter: false,
  },
  {
    key: 'estimated-rent',
    label: 'Estimated Rent',
    getValue: (item) => item.expectedMonthlyRent ?? getAnalysis(item)?.rentalYieldEstimate.monthly ?? null,
    formatValue: (value, item) => formatCurrency(item.currency, value),
    higherIsBetter: true,
  },
  {
    key: 'rental-yield',
    label: 'Rental Yield',
    getValue: (item) => getAnalysis(item)?.rentalYieldEstimate.percentage ?? null,
    formatValue: (value) => formatPercent(value),
    higherIsBetter: true,
  },
  {
    key: 'airbnb-yield',
    label: 'Airbnb Yield',
    getValue: (item) => getAnalysis(item)?.airbnbPotential.percentage ?? null,
    formatValue: (value) => formatPercent(value),
    higherIsBetter: true,
  },
  {
    key: 'roi',
    label: 'ROI',
    getValue: (item) => estimateRoi(getAnalysis(item)),
    formatValue: (value) => formatPercent(value),
    higherIsBetter: true,
  },
  {
    key: 'investment-score',
    label: 'Investment Score',
    getValue: (item) => getAnalysis(item)?.score.overall ?? null,
    formatValue: (value) => (value === null ? '—' : `${value}/100`),
    higherIsBetter: true,
  },
  {
    key: 'recommendation',
    label: 'Recommendation',
    getValue: (item) => recommendationWeight(getAnalysis(item)),
    formatValue: (_, item) => {
      const recommendation = getAnalysis(item)?.recommendation
      return recommendation ? recommendation.toUpperCase() : '—'
    },
    higherIsBetter: true,
  },
]

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-full max-w-3xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PropertyComparisonPage() {
  const navigate = useNavigate()
  const { organization } = useAuth()

  const [items, setItems] = useState<OpportunityWorkspaceItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await opportunityWorkspaceService.getMyOpportunities({
          organizationId: organization?.id,
        })

        setItems(result.items)
        setSelectedIds((current) => current.filter((id) => result.items.some((item) => item.id === id)).slice(0, 5))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load opportunities')
        setItems([])
        setSelectedIds([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadItems()
  }, [organization?.id])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  )

  const ranking = useMemo(() => {
    return [...selectedItems]
      .sort((a, b) => {
        const scoreA = getAnalysis(a)?.score.overall ?? Number.NEGATIVE_INFINITY
        const scoreB = getAnalysis(b)?.score.overall ?? Number.NEGATIVE_INFINITY
        if (scoreB !== scoreA) {
          return scoreB - scoreA
        }

        return a.title.localeCompare(b.title)
      })
      .map((item, index) => ({
        id: item.id,
        rank: index + 1,
        score: getAnalysis(item)?.score.overall ?? null,
      }))
  }, [selectedItems])

  const rankById = useMemo(() => {
    return new Map(ranking.map((entry) => [entry.id, entry.rank]))
  }, [ranking])

  const bestValueByMetric = useMemo(() => {
    const best = new Map<string, number | null>()

    comparisonMetrics.forEach((metric) => {
      const values = selectedItems
        .map((item) => metric.getValue(item))
        .filter((value): value is number => value !== null)

      if (values.length === 0) {
        best.set(metric.key, null)
        return
      }

      best.set(metric.key, metric.higherIsBetter ? Math.max(...values) : Math.min(...values))
    })

    return best
  }, [selectedItems])

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id)
      }

      if (current.length >= 5) {
        return current
      }

      return [...current, id]
    })
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-8 sm:p-10">
        <h1 className="font-display text-3xl font-bold">Comparison unavailable</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">{error}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Button>
          <Button onClick={() => window.location.reload()} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <ChartBar className="h-3.5 w-3.5" weight="fill" />
            Opportunity benchmark workspace
          </div>
          <div>
            <Button variant="ghost" onClick={() => navigate('/opportunities')} className="mb-2 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Opportunities
            </Button>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Property Comparison</h1>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-foreground/70">
              Select 2 to 5 opportunities and compare pricing, yield, ROI, score, and recommendation side-by-side.
            </p>
          </div>
        </div>

        <Badge variant={selectedIds.length >= 2 ? 'default' : 'outline'} className="h-fit px-3 py-1.5 text-xs sm:text-sm">
          {selectedIds.length}/5 selected{selectedIds.length < 2 ? ' (pick at least 2)' : ''}
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed border-border/70 p-8 sm:p-10 text-center">
          <h2 className="font-display text-2xl font-bold">No opportunities available</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
            Create opportunities first, then return here to compare investment performance.
          </p>
          <Button className="mt-6" onClick={() => navigate('/opportunities/new')}>
            Add Opportunity
          </Button>
        </Card>
      ) : (
        <>
          <Card className="border-border/70 p-4 sm:p-6">
            <h2 className="font-display text-2xl font-bold">Select Opportunities</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose between 2 and 5 opportunities to compare.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const selected = selectedIds.includes(item.id)
                const selectionDisabled = !selected && selectedIds.length >= 5
                const score = getAnalysis(item)?.score.overall
                const recommendation = getAnalysis(item)?.recommendation

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={selectionDisabled}
                    onClick={() => toggleSelection(item.id)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border/70 bg-card hover:border-accent/40 hover:bg-accent/5',
                      selectionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.city}, {item.country}</p>
                      </div>
                      {selected ? <CheckCircle className="h-5 w-5 text-accent" weight="fill" /> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{formatCurrency(item.currency, item.askingPrice)}</Badge>
                      <Badge variant="outline">Score: {score ?? '—'}</Badge>
                      {recommendation ? <Badge>{recommendation.toUpperCase()}</Badge> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {selectedItems.length >= 2 ? (
            <>
              <Card className="border-border/70 p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CrownSimple className="h-5 w-5 text-accent" weight="duotone" />
                  <h2 className="font-display text-2xl font-bold">Score Ranking</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {ranking.map((entry) => {
                    const item = selectedItems.find((selected) => selected.id === entry.id)
                    if (!item) {
                      return null
                    }

                    return (
                      <div key={entry.id} className="rounded-xl border border-border/70 bg-card p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant={entry.rank === 1 ? 'default' : 'outline'}>#{entry.rank}</Badge>
                          <span className="text-xs text-muted-foreground">Investment Score</span>
                        </div>
                        <p className="mt-2 line-clamp-2 font-semibold">{item.title}</p>
                        <p className="mt-2 text-2xl font-bold">{entry.score === null ? '—' : `${entry.score}/100`}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="border-border/70 p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <TrendUp className="h-5 w-5 text-accent" weight="duotone" />
                  <h2 className="font-display text-2xl font-bold">Side-by-Side Comparison</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[860px] divide-y divide-border/70 text-left text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Metric</th>
                        {selectedItems.map((item) => (
                          <th key={item.id} className="px-4 py-3 font-medium">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{item.title}</p>
                              <p className="normal-case text-muted-foreground">Rank #{rankById.get(item.id) ?? '—'}</p>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 bg-card/70">
                      {comparisonMetrics.map((metric) => {
                        const bestValue = bestValueByMetric.get(metric.key)

                        return (
                          <tr key={metric.key}>
                            <td className="px-4 py-4 font-medium">{metric.label}</td>
                            {selectedItems.map((item) => {
                              const rawValue = metric.getValue(item)
                              const isBest = bestValue !== null && rawValue !== null && rawValue === bestValue

                              return (
                                <td key={`${metric.key}-${item.id}`} className="px-4 py-4">
                                  <div
                                    className={cn(
                                      'inline-flex min-w-[130px] items-center justify-between gap-2 rounded-lg border px-3 py-2',
                                      isBest
                                        ? 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                        : 'border-border/70 bg-background/70',
                                    )}
                                  >
                                    <span>{metric.formatValue(rawValue, item)}</span>
                                    {isBest ? <Badge variant="outline" className="border-emerald-400/60">Best</Badge> : null}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
              Select at least two opportunities to unlock ranking and full metric comparison.
            </Card>
          )}
        </>
      )}
    </div>
  )
}
