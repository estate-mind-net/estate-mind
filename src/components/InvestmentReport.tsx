import { ArrowLeft, Buildings, ChartBar, MapPin, Printer, ShieldWarning, Sparkle, TrendUp, WarningCircle } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import type { InvestmentAnalysis } from '@/lib/types'
import { mockAnalyses } from '@/lib/mockData'
import { cn } from '@/lib/utils'

interface InvestmentReportProps {
  analysis?: InvestmentAnalysis
  onBack?: () => void
  title?: string
  location?: string
  askingPrice?: number | null
  currency?: string
  className?: string
  showHeaderActions?: boolean
}

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`
  }
}

const toTitleCase = (value: string) =>
  value
    .split('-')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')

const getRecommendationLabel = (recommendation: InvestmentAnalysis['recommendation']) => {
  if (recommendation === 'buy') return 'BUY'
  if (recommendation === 'watch') return 'WATCH'
  return 'AVOID'
}

const getRiskLevel = (analysis: InvestmentAnalysis): 'Low' | 'Medium' | 'High' => {
  if (analysis.recommendation === 'avoid' || analysis.score.overall < 50) {
    return 'High'
  }

  if (analysis.recommendation === 'watch' || analysis.score.overall < 70) {
    return 'Medium'
  }

  return 'Low'
}

export function InvestmentReport({ analysis, onBack, title, location, askingPrice, currency, className, showHeaderActions = true }: InvestmentReportProps) {
  const report = analysis || mockAnalyses[0]
  const {
    property,
    score,
    recommendation,
    executiveSummary,
    rentalYieldEstimate,
    airbnbPotential,
    appreciationPotential,
    risks,
    opportunities,
  } = report

  const reportCurrency = currency ?? property.currency
  const reportTitle = title ?? property.title
  const reportLocation = location ?? `${property.city}, ${property.country}`
  const reportAskingPrice = askingPrice ?? property.askingPrice
  const recommendationLabel = getRecommendationLabel(recommendation)

  const annualRent = rentalYieldEstimate.annual
  const roiEstimate = Number((rentalYieldEstimate.percentage + appreciationPotential.oneYear).toFixed(2))
  const estimatedExpenses = Math.round(rentalYieldEstimate.monthly * 0.35)
  const cashflowEstimate = rentalYieldEstimate.monthly - estimatedExpenses

  const strengths = [
    score.rentalYield >= 70 ? 'Strong long-term rental performance' : null,
    score.airbnbPotential >= 70 ? 'Competitive short-term rental profile' : null,
    score.appreciation >= 70 ? 'Solid medium-term appreciation outlook' : null,
    score.liquidity >= 70 ? 'Healthy exit and liquidity profile' : null,
  ].filter(Boolean) as string[]

  const demandOutlook =
    rentalYieldEstimate.percentage >= 6 || airbnbPotential.occupancy >= 68
      ? 'High demand driven by strong rental and occupancy assumptions.'
      : rentalYieldEstimate.percentage >= 4.5
        ? 'Balanced demand with moderate upside potential.'
        : 'Demand may be price-sensitive without clear rental momentum.'

  const supplyOutlook =
    appreciationPotential.oneYear >= 6
      ? 'Supply pressure appears manageable relative to expected demand growth.'
      : appreciationPotential.oneYear >= 3
        ? 'Supply and demand are likely in equilibrium in the near term.'
        : 'Supply pressure may limit near-term pricing power.'

  const riskLevel = getRiskLevel(report)
  const topReasonsToInvest = opportunities.slice(0, 3)
  const keyStrengths = (strengths.length > 0 ? strengths : opportunities).slice(0, 3)
  const keyRisks = risks.slice(0, 3)

  const recommendedAction =
    recommendation === 'buy'
      ? 'Proceed to due diligence, validate legal documentation, and prepare offer terms.'
      : recommendation === 'watch'
        ? 'Monitor pricing and micro-market indicators while collecting missing legal and tenancy data.'
        : 'Avoid commitment until risk drivers are mitigated and return assumptions materially improve.'

  return (
    <section className={cn('mx-auto max-w-6xl space-y-6 print:max-w-none print:space-y-4 print:text-black', className)}>
      <header className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-accent/10 p-6 print:border-slate-300 print:bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">AI Investment Report</h1>
            <p className="text-base font-semibold text-foreground/80">{reportTitle}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {reportLocation}
            </p>
          </div>

          {showHeaderActions ? (
            <div className="flex gap-2 print:hidden">
              {onBack ? (
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Report
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 print:border-slate-300 print:bg-white">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Asking Price</p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(reportAskingPrice, reportCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 print:border-slate-300 print:bg-white">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
            <p className="mt-2 text-xl font-semibold">{recommendationLabel}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 print:border-slate-300 print:bg-white">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Report Date</p>
            <p className="mt-2 text-xl font-semibold">{new Date(report.analyzedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 print:border-slate-300 print:bg-white">
            <p className="text-sm font-medium text-muted-foreground">Visual Score Card</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <ScoreGauge score={score.overall} size="md" showLabel={false} />
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Investment Score</p>
                <p className="mt-1 text-3xl font-bold">{score.overall}/100</p>
                <Badge className="mt-2 border-none bg-accent/15 text-accent">{recommendationLabel}</Badge>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border/60 bg-background/60 p-5 print:border-slate-300 print:bg-white">
            <h2 className="text-lg font-semibold">Overview</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Property Title</p>
                <p className="mt-1 font-medium">{reportTitle}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                <p className="mt-1 font-medium">{reportLocation}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Asking Price</p>
                <p className="mt-1 font-medium">{formatCurrency(reportAskingPrice, reportCurrency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Property Type</p>
                <p className="mt-1 font-medium">{toTitleCase(property.propertyType)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Size</p>
                <p className="mt-1 font-medium">{property.sizeSqm} m²</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bedrooms</p>
                <p className="mt-1 font-medium">{property.bedrooms}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Condition</p>
                <p className="mt-1 font-medium">{toTitleCase(property.condition)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-lg font-semibold">Financial Analysis</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Monthly Rent</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(rentalYieldEstimate.monthly, reportCurrency)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Annual Rent</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(annualRent, reportCurrency)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rental Yield</p>
              <p className="mt-1 text-lg font-semibold">{rentalYieldEstimate.percentage}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Airbnb Yield</p>
              <p className="mt-1 text-lg font-semibold">{airbnbPotential.percentage}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ROI Estimate</p>
              <p className="mt-1 text-lg font-semibold">{roiEstimate}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cashflow Estimate</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(cashflowEstimate, reportCurrency)}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-lg font-semibold">Investment Thesis</h2>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-medium">Top Reasons to Invest</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {topReasonsToInvest.map((reason) => (
                  <li key={reason} className="flex items-start gap-2">
                    <TrendUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-medium">Key Strengths</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {keyStrengths.map((strength) => (
                  <li key={strength} className="flex items-start gap-2">
                    <Buildings className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-medium">Key Risks</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {keyRisks.map((risk) => (
                  <li key={risk} className="flex items-start gap-2">
                    <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <TrendUp className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-lg font-semibold">Market Outlook</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Appreciation Estimate</p>
              <p className="mt-1 font-semibold">+{appreciationPotential.oneYear}% (1Y), +{appreciationPotential.threeYear}% (3Y), +{appreciationPotential.fiveYear}% (5Y)</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Demand Outlook</p>
              <p className="mt-1 text-muted-foreground">{demandOutlook}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Supply Outlook</p>
              <p className="mt-1 text-muted-foreground">{supplyOutlook}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <ShieldWarning className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-lg font-semibold">Risk Analysis</h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Level</p>
              <p className="mt-1 text-lg font-semibold">{riskLevel}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Explanation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {keyRisks.length > 0
                  ? keyRisks.join(' ')
                  : 'Current assumptions and documentation quality require additional validation during due diligence.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
        <div className="flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-accent" weight="duotone" />
          <h2 className="text-lg font-semibold">AI Summary</h2>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Executive Summary</p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{executiveSummary}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended Action</p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{recommendedAction}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
            <Badge className="mt-2 border-none bg-accent/15 text-accent">{recommendationLabel}</Badge>
          </div>
        </div>
      </Card>
    </section>
  )
}