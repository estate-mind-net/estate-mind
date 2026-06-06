import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Buildings, ClockCounterClockwise, MapPin, Sparkle, TrendUp, Warning } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreGauge } from '@/components/ScoreGauge'
import { useAuth } from '@/hooks/useAuth'
import { opportunityStageLabels, opportunityStages, type OpportunityStage } from '@/lib/constants/opportunityStages'
import { opportunityWorkspaceService, type OpportunityWorkspaceDetail } from '@/services/supabase/opportunityWorkspace.service'
import { toast } from 'sonner'

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

const toRecommendationLabel = (value: 'buy' | 'watch' | 'avoid') => value.toUpperCase()

const takeShortSentence = (value: string | undefined) => {
  if (!value) return 'Not available.'
  const sentence = value.split(/[.!?]/)[0]?.trim() ?? value
  return sentence.length > 120 ? `${sentence.slice(0, 117)}...` : sentence
}

const safeNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const safeList = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

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

const formatStageLabel = (stage: OpportunityStage) => opportunityStageLabels[stage]

const formatStageTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export function OpportunityDetailPage() {
  const navigate = useNavigate()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const { organization } = useAuth()
  const [item, setItem] = useState<OpportunityWorkspaceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingStage, setIsUpdatingStage] = useState(false)

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

  const confidenceLevel = useMemo(() => {
    if (!latestAnalysis) {
      return null
    }

    const raw = (latestAnalysis as Record<string, unknown>).confidenceLevel
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw
    }

    const numeric = (latestAnalysis as Record<string, unknown>).confidence
    if (typeof numeric === 'number') {
      if (numeric >= 85) return 'High'
      if (numeric >= 65) return 'Medium'
      return 'Low'
    }

    return null
  }, [latestAnalysis])

  const snapshotDecision = useMemo(() => {
    if (!latestAnalysis) return null

    const recommendation = latestAnalysis.executiveDecision?.recommendation ?? toRecommendationLabel(latestAnalysis.recommendation ?? 'watch')
    const score = safeNumber(latestAnalysis.executiveDecision?.score, safeNumber(latestAnalysis.score?.overall, 0))
    const confidence = latestAnalysis.executiveDecision?.confidence ?? confidenceLevel ?? 'Medium'

    return { recommendation, score, confidence }
  }, [latestAnalysis, confidenceLevel])

  const snapshotScenarios = useMemo(() => {
    if (!latestAnalysis) return null

    const existingScenarios = latestAnalysis.scenarioAnalysis
    const hasExistingScenarios = Boolean(
      existingScenarios?.conservative &&
      existingScenarios?.base &&
      existingScenarios?.optimistic,
    )
    if (hasExistingScenarios) {
      return {
        conservative: {
          monthlyRent: safeNumber(existingScenarios?.conservative?.monthlyRent, 0),
          rentalYield: safeNumber(existingScenarios?.conservative?.rentalYield, 0),
          annualROI: safeNumber(existingScenarios?.conservative?.annualROI, 0),
          projectedRoi5Year: safeNumber(existingScenarios?.conservative?.projectedRoi5Year, 0),
          projectedPropertyValue5Year: safeNumber(existingScenarios?.conservative?.projectedPropertyValue5Year, 0),
        },
        base: {
          monthlyRent: safeNumber(existingScenarios?.base?.monthlyRent, 0),
          rentalYield: safeNumber(existingScenarios?.base?.rentalYield, 0),
          annualROI: safeNumber(existingScenarios?.base?.annualROI, 0),
          projectedRoi5Year: safeNumber(existingScenarios?.base?.projectedRoi5Year, 0),
          projectedPropertyValue5Year: safeNumber(existingScenarios?.base?.projectedPropertyValue5Year, 0),
        },
        optimistic: {
          monthlyRent: safeNumber(existingScenarios?.optimistic?.monthlyRent, 0),
          rentalYield: safeNumber(existingScenarios?.optimistic?.rentalYield, 0),
          annualROI: safeNumber(existingScenarios?.optimistic?.annualROI, 0),
          projectedRoi5Year: safeNumber(existingScenarios?.optimistic?.projectedRoi5Year, 0),
          projectedPropertyValue5Year: safeNumber(existingScenarios?.optimistic?.projectedPropertyValue5Year, 0),
        },
      }
    }

    const baseAskingPrice = item?.askingPrice ?? 0
    const baseMonthlyRent = safeNumber(latestAnalysis.rentalYieldEstimate?.monthly, item?.expectedMonthlyRent ?? 0)
    const baseRentalYield = safeNumber(latestAnalysis.rentalYieldEstimate?.percentage, 0)
    const oneYearAppreciation = safeNumber(latestAnalysis.appreciationPotential?.oneYear, 0)
    const fiveYearAppreciation = safeNumber(latestAnalysis.appreciationPotential?.fiveYear, 0)
    const baseAnnualRoi = Number((baseRentalYield + oneYearAppreciation).toFixed(1))

    return {
      conservative: {
        monthlyRent: Math.round(baseMonthlyRent * 0.9),
        rentalYield: Number((baseRentalYield * 0.9).toFixed(1)),
        annualROI: Number((baseAnnualRoi * 0.85).toFixed(1)),
        projectedRoi5Year: Number((baseAnnualRoi * 5 * 0.7).toFixed(1)),
        projectedPropertyValue5Year: Math.round(baseAskingPrice * 1.08),
      },
      base: {
        monthlyRent: baseMonthlyRent,
        rentalYield: baseRentalYield,
        annualROI: baseAnnualRoi,
        projectedRoi5Year: Number((baseAnnualRoi * 5 * 0.78).toFixed(1)),
        projectedPropertyValue5Year: Math.round(baseAskingPrice * (1 + fiveYearAppreciation / 100)),
      },
      optimistic: {
        monthlyRent: Math.round(baseMonthlyRent * 1.12),
        rentalYield: Number((baseRentalYield * 1.12).toFixed(1)),
        annualROI: Number((baseAnnualRoi * 1.15).toFixed(1)),
        projectedRoi5Year: Number((baseAnnualRoi * 5 * 0.9).toFixed(1)),
        projectedPropertyValue5Year: Math.round(baseAskingPrice * 1.2),
      },
    }
  }, [latestAnalysis, item?.askingPrice, item?.expectedMonthlyRent])

  const snapshotThesis = useMemo(() => {
    if (!latestAnalysis) return null

    const opportunities = safeList(latestAnalysis.opportunities)
    const risks = safeList(latestAnalysis.risks)

    return latestAnalysis.investmentThesisDetail ?? {
      reasonsToInvest: opportunities.slice(0, 3),
      risks: risks.slice(0, 3),
      upsideOpportunities: opportunities.slice(0, 3),
    }
  }, [latestAnalysis])

  const snapshotChecklist = useMemo(() => {
    if (!latestAnalysis) return []

    const checklist = safeList(latestAnalysis.dueDiligenceChecklist)
    if (checklist.length > 0) return checklist

    return [
      'Validate rental comps using nearby comparable listings.',
      'Perform legal review for title, liens, and permits.',
      'Confirm renovation estimate with contractor quotes.',
      'Validate taxes, acquisition fees, and operating costs.',
      'Review building condition report and deferred maintenance.',
      'Stress-test financing assumptions and debt service coverage.',
    ]
  }, [latestAnalysis])

  const handleStageChange = async (stage: OpportunityStage) => {
    if (!item || isUpdatingStage || stage === item.stage || !organization?.id) {
      return
    }

    setIsUpdatingStage(true)

    try {
      const result = await opportunityWorkspaceService.updateOpportunityStage(item.id, stage, {
        organizationId: organization.id,
        source: 'manual',
      })

      if (!result.saved) {
        throw new Error(result.warning ?? 'Failed to update stage.')
      }

      setItem((current) => {
        if (!current) return current

        const nextHistory = [
          ...current.stageHistory,
          {
            id: `${current.id}-${stage}-${Date.now()}`,
            fromStage: current.stage,
            toStage: stage,
            changedAt: new Date().toISOString(),
            source: 'manual' as const,
          },
        ]

        return {
          ...current,
          stage,
          updatedAt: new Date().toISOString(),
          stageHistory: nextHistory,
        }
      })

      toast.success(`Stage updated to ${formatStageLabel(stage)}`)
    } catch (stageError) {
      toast.error(stageError instanceof Error ? stageError.message : 'Failed to update stage.')
    } finally {
      setIsUpdatingStage(false)
    }
  }

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

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="outline">{formatStageLabel(item.stage)}</Badge>
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
              <ClockCounterClockwise className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-xl font-bold">CRM Stage</h2>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current stage</p>
                <Select value={item.stage} onValueChange={(value) => void handleStageChange(value as OpportunityStage)} disabled={isUpdatingStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunityStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {formatStageLabel(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Badge variant="outline" className="justify-center py-2">{formatStageLabel(item.stage)}</Badge>
                <Badge variant="secondary" className="justify-center py-2">{item.stageHistory.length} changes</Badge>
              </div>
            </div>
          </Card>

          <Card className="border-border/70 p-6">
            <div className="flex items-center gap-2">
              <TrendUp className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-xl font-bold">AI Snapshot</h2>
            </div>

            {latestAnalysis ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Badge variant="outline" className="border-accent/40 text-accent">
                      {snapshotDecision?.recommendation ?? toRecommendationLabel(latestAnalysis.recommendation)}
                    </Badge>
                    <ScoreGauge score={snapshotDecision?.score ?? latestAnalysis.score.overall} size="sm" showLabel={false} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <InfoBlock label="Recommendation" value={snapshotDecision?.recommendation ?? toRecommendationLabel(latestAnalysis.recommendation)} />
                    <InfoBlock label="Investment Score" value={`${snapshotDecision?.score ?? latestAnalysis.score.overall}/100`} />
                    <InfoBlock label="Confidence" value={snapshotDecision?.confidence ?? confidenceLevel ?? 'Medium'} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBlock label="Estimated Monthly Rent" value={formatCurrency(item.currency, latestAnalysis.rentalYieldEstimate?.monthly ?? item.expectedMonthlyRent)} />
                  <InfoBlock label="Rental Yield" value={`${safeNumber(latestAnalysis.rentalYieldEstimate?.percentage, 0)}%`} />
                  <InfoBlock label="ROI Estimate" value={`${(safeNumber(latestAnalysis.rentalYieldEstimate?.percentage, 0) + safeNumber(latestAnalysis.appreciationPotential?.oneYear, 0)).toFixed(2)}%`} />
                  <InfoBlock label="5Y Appreciation" value={`${safeNumber(latestAnalysis.appreciationPotential?.fiveYear, 0)}%`} />
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/60 p-3 text-sm">
                  <p className="mb-2 font-semibold">Scenario Analysis</p>
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="px-2 py-1">Scenario</th>
                        <th className="px-2 py-1">Rent</th>
                        <th className="px-2 py-1">Yield</th>
                        <th className="px-2 py-1">Annual ROI</th>
                        <th className="px-2 py-1">5Y ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotScenarios ? [
                        ['Conservative', snapshotScenarios.conservative],
                        ['Base', snapshotScenarios.base],
                        ['Optimistic', snapshotScenarios.optimistic],
                      ].map(([label, row]) => (
                        <tr key={label} className="border-b border-border/30">
                          <td className="px-2 py-1 font-medium">{label}</td>
                          <td className="px-2 py-1">{formatCurrency(item.currency, (row as typeof snapshotScenarios.base).monthlyRent)}</td>
                          <td className="px-2 py-1">{(row as typeof snapshotScenarios.base).rentalYield}%</td>
                          <td className="px-2 py-1">{(row as typeof snapshotScenarios.base).annualROI}%</td>
                          <td className="px-2 py-1">{(row as typeof snapshotScenarios.base).projectedRoi5Year}%</td>
                        </tr>
                      )) : null}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm">
                    <p className="font-semibold">Reasons to Invest</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {(snapshotThesis?.reasonsToInvest ?? latestAnalysis.opportunities).slice(0, 3).map((reason) => (
                        <li key={reason}>• {takeShortSentence(reason)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm">
                    <p className="font-semibold">Key Risks</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {(snapshotThesis?.risks ?? latestAnalysis.risks).slice(0, 3).map((risk) => (
                        <li key={risk}>• {takeShortSentence(risk)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm sm:col-span-2">
                    <p className="font-semibold">Upside Opportunities</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {(snapshotThesis?.upsideOpportunities ?? latestAnalysis.opportunities).slice(0, 3).map((upside) => (
                        <li key={upside}>• {takeShortSentence(upside)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm sm:col-span-2">
                    <p className="font-semibold">Due Diligence Checklist</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {snapshotChecklist.slice(0, 6).map((check) => (
                        <li key={check}>• {takeShortSentence(check)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => navigate(`/opportunities/${item.id}/report`)}>
                    View Full Investment Report
                  </Button>
                  <p className="text-xs text-muted-foreground">Full Investment Reports are part of the Pro workflow.</p>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">AI analysis is not available for this opportunity yet.</p>
            )}
          </Card>

          <Card className="border-border/70 p-6">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise className="h-5 w-5 text-accent" weight="duotone" />
              <h2 className="font-display text-xl font-bold">Stage History</h2>
            </div>

            <div className="mt-5 space-y-4">
              {item.stageHistory.map((event) => (
                <div key={event.id} className="relative rounded-xl border border-border/60 bg-background/60 p-4 pl-5">
                  <div className="absolute left-0 top-4 h-8 w-1 rounded-full bg-accent" />
                  <p className="text-xs text-muted-foreground">{formatStageTime(event.changedAt)}</p>
                  <p className="mt-2 text-sm font-semibold">
                    {event.fromStage ? `${formatStageLabel(event.fromStage)} → ` : ''}{formatStageLabel(event.toStage)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{event.source}</p>
                  {event.note ? <p className="mt-2 text-sm text-foreground/80">{event.note}</p> : null}
                </div>
              ))}
            </div>
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
