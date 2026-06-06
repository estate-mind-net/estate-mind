import { useRef, useState } from 'react'
import { ArrowLeft, ChartBar, CheckSquare, ClipboardText, DownloadSimple, MapPin, Printer, ShieldWarning, Sparkle, TrendUp, WarningCircle } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import type { InvestmentAnalysis } from '@/lib/types'
import { mockAnalyses } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { exportElementToA4Pdf } from '@/lib/utils/pdfExport'

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

const safeNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const safeList = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
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
  const reportRef = useRef<HTMLElement | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const report = analysis || mockAnalyses[0]
  const fallbackReport = mockAnalyses[0]
  const property = report.property ?? fallbackReport.property
  const score = report.score ?? fallbackReport.score
  const recommendation = report.recommendation ?? fallbackReport.recommendation
  const executiveSummary = report.executiveSummary ?? fallbackReport.executiveSummary
  const rentalYieldEstimate = report.rentalYieldEstimate ?? fallbackReport.rentalYieldEstimate
  const airbnbPotential = report.airbnbPotential ?? fallbackReport.airbnbPotential
  const appreciationPotential = report.appreciationPotential ?? fallbackReport.appreciationPotential
  const risks = safeList(report.risks)
  const opportunities = safeList(report.opportunities)

  const reportCurrency = currency ?? property.currency
  const reportTitle = title ?? property.title
  const reportLocation = location ?? `${property.city}, ${property.country}`
  const reportAskingPrice = askingPrice ?? property.askingPrice
  const recommendationLabel = getRecommendationLabel(recommendation)

  const executiveDecision = report.executiveDecision ?? {
    recommendation: recommendationLabel,
    score: safeNumber(score?.overall, 0),
    confidence: report.confidenceLevel ? `${report.confidenceLevel.charAt(0).toUpperCase()}${report.confidenceLevel.slice(1)}` as 'Low' | 'Medium' | 'High' : 'Medium',
    summary: report.reportText ?? executiveSummary,
  }

  const financialModel = report.financialModel ?? {
    askingPrice: reportAskingPrice,
    estimatedMonthlyRent: safeNumber(rentalYieldEstimate?.monthly, 0),
    annualRent: safeNumber(rentalYieldEstimate?.annual, safeNumber(rentalYieldEstimate?.monthly, 0) * 12),
    grossRentalYield: safeNumber(rentalYieldEstimate?.percentage, 0),
    airbnbYield: safeNumber(airbnbPotential?.percentage, 0),
    estimatedROI: Number((safeNumber(rentalYieldEstimate?.percentage, 0) + safeNumber(appreciationPotential?.oneYear, 0)).toFixed(2)),
    projectedValue5Year: Math.round(reportAskingPrice * (1 + safeNumber(appreciationPotential?.fiveYear, 0) / 100)),
    estimatedMonthlyCashflow: Math.round(safeNumber(rentalYieldEstimate?.monthly, 0) * 0.65),
  }

  const hasScenarioAnalysis = Boolean(
    report.scenarioAnalysis?.conservative &&
    report.scenarioAnalysis?.base &&
    report.scenarioAnalysis?.optimistic,
  )

  const scenarioAnalysis = hasScenarioAnalysis ? {
    conservative: {
      monthlyRent: safeNumber(report.scenarioAnalysis?.conservative?.monthlyRent, 0),
      rentalYield: safeNumber(report.scenarioAnalysis?.conservative?.rentalYield, 0),
      annualROI: safeNumber(report.scenarioAnalysis?.conservative?.annualROI, 0),
      projectedRoi5Year: safeNumber(report.scenarioAnalysis?.conservative?.projectedRoi5Year, 0),
      projectedPropertyValue5Year: safeNumber(report.scenarioAnalysis?.conservative?.projectedPropertyValue5Year, 0),
    },
    base: {
      monthlyRent: safeNumber(report.scenarioAnalysis?.base?.monthlyRent, 0),
      rentalYield: safeNumber(report.scenarioAnalysis?.base?.rentalYield, 0),
      annualROI: safeNumber(report.scenarioAnalysis?.base?.annualROI, 0),
      projectedRoi5Year: safeNumber(report.scenarioAnalysis?.base?.projectedRoi5Year, 0),
      projectedPropertyValue5Year: safeNumber(report.scenarioAnalysis?.base?.projectedPropertyValue5Year, 0),
    },
    optimistic: {
      monthlyRent: safeNumber(report.scenarioAnalysis?.optimistic?.monthlyRent, 0),
      rentalYield: safeNumber(report.scenarioAnalysis?.optimistic?.rentalYield, 0),
      annualROI: safeNumber(report.scenarioAnalysis?.optimistic?.annualROI, 0),
      projectedRoi5Year: safeNumber(report.scenarioAnalysis?.optimistic?.projectedRoi5Year, 0),
      projectedPropertyValue5Year: safeNumber(report.scenarioAnalysis?.optimistic?.projectedPropertyValue5Year, 0),
    },
  } : {
    conservative: {
      monthlyRent: Math.round(financialModel.estimatedMonthlyRent * 0.9),
      rentalYield: Number((financialModel.grossRentalYield * 0.9).toFixed(1)),
      annualROI: Number((financialModel.estimatedROI * 0.85).toFixed(1)),
      projectedRoi5Year: Number((financialModel.estimatedROI * 5 * 0.7).toFixed(1)),
      projectedPropertyValue5Year: Math.round(financialModel.projectedValue5Year * 0.92),
    },
    base: {
      monthlyRent: financialModel.estimatedMonthlyRent,
      rentalYield: financialModel.grossRentalYield,
      annualROI: financialModel.estimatedROI,
      projectedRoi5Year: Number((financialModel.estimatedROI * 5 * 0.78).toFixed(1)),
      projectedPropertyValue5Year: financialModel.projectedValue5Year,
    },
    optimistic: {
      monthlyRent: Math.round(financialModel.estimatedMonthlyRent * 1.12),
      rentalYield: Number((financialModel.grossRentalYield * 1.12).toFixed(1)),
      annualROI: Number((financialModel.estimatedROI * 1.15).toFixed(1)),
      projectedRoi5Year: Number((financialModel.estimatedROI * 5 * 0.9).toFixed(1)),
      projectedPropertyValue5Year: Math.round(financialModel.projectedValue5Year * 1.08),
    },
  }

  const investmentThesis = {
    reasonsToInvest: safeList(report.investmentThesisDetail?.reasonsToInvest, opportunities).slice(0, 3),
    risks: safeList(report.investmentThesisDetail?.risks, risks).slice(0, 3),
    upsideOpportunities: safeList(report.investmentThesisDetail?.upsideOpportunities, opportunities).slice(0, 3),
  }

  const dueDiligenceChecklist = safeList(report.dueDiligenceChecklist)
  const dueDiligenceFallback = [
    'Validate rental comps with at least three nearby properties.',
    'Complete legal review for title, zoning, and permits.',
    'Collect contractor-backed renovation estimate with contingency.',
    'Model total taxes and closing/operating fees.',
    'Commission building condition assessment.',
    'Stress-test financing assumptions and debt coverage.',
  ]

  const dataQuality = {
    usedLiveMarketData: Boolean(report.dataQuality?.usedLiveMarketData),
    usedDeterministicFallback: report.dataQuality?.usedDeterministicFallback ?? true,
    confidenceLevel: report.dataQuality?.confidenceLevel ?? executiveDecision.confidence,
    missingData: safeList(report.dataQuality?.missingData, safeList(report.missingData)),
  }

  const riskLevel = getRiskLevel(report)
  const keyRisks = investmentThesis.risks.slice(0, 3)

  const recommendedAction =
    recommendation === 'buy'
      ? 'Proceed to due diligence, validate legal documentation, and prepare offer terms.'
      : recommendation === 'watch'
        ? 'Monitor pricing and micro-market indicators while collecting missing legal and tenancy data.'
        : 'Avoid commitment until risk drivers are mitigated and return assumptions materially improve.'

  const handleExportPdf = async () => {
    if (!reportRef.current || isExportingPdf) {
      return
    }

    setIsExportingPdf(true)

    try {
      await exportElementToA4Pdf({
        element: reportRef.current,
        propertyTitle: reportTitle,
      })
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <section ref={reportRef} className={cn('mx-auto max-w-6xl space-y-6 print:max-w-none print:space-y-4 print:text-black', className)}>
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
              <Button variant="outline" onClick={handleExportPdf} disabled={isExportingPdf}>
                <DownloadSimple className="mr-2 h-4 w-4" />
                {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
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
            <p className="mt-2 text-xl font-semibold">{executiveDecision.recommendation}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 print:border-slate-300 print:bg-white">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Report Date</p>
            <p className="mt-2 text-xl font-semibold">{new Date(report.analyzedAt ?? new Date().toISOString()).toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-5 print:border-slate-300 print:bg-white">
            <p className="text-sm font-medium text-muted-foreground">Executive Decision</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <ScoreGauge score={executiveDecision.score} size="md" showLabel={false} />
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Investment Score</p>
                <p className="mt-1 text-3xl font-bold">{executiveDecision.score}/100</p>
                <Badge className="mt-2 border-none bg-accent/15 text-accent">{executiveDecision.recommendation}</Badge>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Confidence: <span className="font-semibold text-foreground">{executiveDecision.confidence}</span></p>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border/60 bg-background/60 p-5 print:border-slate-300 print:bg-white">
            <h2 className="text-lg font-semibold">Executive Summary</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/80">{executiveDecision.summary}</p>
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
            <h2 className="text-lg font-semibold">Financial Model</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Asking Price</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(financialModel.askingPrice, reportCurrency)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Monthly Rent</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(financialModel.estimatedMonthlyRent, reportCurrency)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Annual Rent</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(financialModel.annualRent, reportCurrency)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross Rental Yield</p>
              <p className="mt-1 text-lg font-semibold">{financialModel.grossRentalYield}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Airbnb Yield</p>
              <p className="mt-1 text-lg font-semibold">{financialModel.airbnbYield}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated ROI</p>
              <p className="mt-1 text-lg font-semibold">{financialModel.estimatedROI}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">5-Year Projected Value</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(financialModel.projectedValue5Year, reportCurrency)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 sm:col-span-2 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Monthly Cashflow</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(financialModel.estimatedMonthlyCashflow, reportCurrency)}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <ClipboardText className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-lg font-semibold">Scenario Analysis</h2>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 print:border-slate-300">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-background/60">
                <tr>
                  <th className="px-3 py-2 font-semibold">Scenario</th>
                  <th className="px-3 py-2 font-semibold">Monthly Rent</th>
                  <th className="px-3 py-2 font-semibold">Yield</th>
                  <th className="px-3 py-2 font-semibold">Annual ROI</th>
                  <th className="px-3 py-2 font-semibold">5Y ROI</th>
                  <th className="px-3 py-2 font-semibold">5Y Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Conservative', scenarioAnalysis.conservative],
                  ['Base', scenarioAnalysis.base],
                  ['Optimistic', scenarioAnalysis.optimistic],
                ].map(([label, row]) => (
                  <tr key={label} className="border-t border-border/50">
                    <td className="px-3 py-2 font-medium">{label}</td>
                    <td className="px-3 py-2">{formatCurrency((row as typeof scenarioAnalysis.base).monthlyRent, reportCurrency)}</td>
                    <td className="px-3 py-2">{(row as typeof scenarioAnalysis.base).rentalYield}%</td>
                    <td className="px-3 py-2">{(row as typeof scenarioAnalysis.base).annualROI}%</td>
                    <td className="px-3 py-2">{(row as typeof scenarioAnalysis.base).projectedRoi5Year}%</td>
                    <td className="px-3 py-2">{formatCurrency((row as typeof scenarioAnalysis.base).projectedPropertyValue5Year, reportCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 p-5 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <TrendUp className="h-5 w-5 text-success" weight="duotone" />
            <h2 className="text-base font-semibold">3 Reasons to Invest</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {investmentThesis.reasonsToInvest.slice(0, 3).map((reason) => (
              <li key={reason} className="flex items-start gap-2"><span>•</span><span>{reason}</span></li>
            ))}
          </ul>
        </Card>

        <Card className="border-border/70 p-5 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <WarningCircle className="h-5 w-5 text-warning" weight="duotone" />
            <h2 className="text-base font-semibold">3 Risks</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {investmentThesis.risks.slice(0, 3).map((risk) => (
              <li key={risk} className="flex items-start gap-2"><span>•</span><span>{risk}</span></li>
            ))}
          </ul>
        </Card>

        <Card className="border-border/70 p-5 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-base font-semibold">3 Upside Opportunities</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {investmentThesis.upsideOpportunities.slice(0, 3).map((upside) => (
              <li key={upside} className="flex items-start gap-2"><span>•</span><span>{upside}</span></li>
            ))}
          </ul>
        </Card>

        <Card className="border-border/70 p-5 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-base font-semibold">Due Diligence Checklist</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {(dueDiligenceChecklist.length > 0 ? dueDiligenceChecklist : dueDiligenceFallback).map((item) => (
              <li key={item} className="flex items-start gap-2"><span>•</span><span>{item}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 p-6 print:border-slate-300 print:shadow-none">
          <div className="flex items-center gap-2">
            <ShieldWarning className="h-5 w-5 text-accent" weight="duotone" />
            <h2 className="text-lg font-semibold">Data Quality</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Market Data</p>
              <p className="mt-1 font-semibold">{dataQuality.usedLiveMarketData ? 'Used' : 'Not Used'}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Deterministic Fallback</p>
              <p className="mt-1 text-muted-foreground">{dataQuality.usedDeterministicFallback ? 'Applied' : 'Not Applied'}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence Level</p>
              <p className="mt-1 text-muted-foreground">{dataQuality.confidenceLevel}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing Data</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {dataQuality.missingData.slice(0, 4).map((item) => (
                  <li key={item} className="flex items-start gap-2"><span>•</span><span>{item}</span></li>
                ))}
              </ul>
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
            <p className="mt-2 text-sm leading-6 text-foreground/80">{report.reportText ?? executiveDecision.summary}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended Action</p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{recommendedAction}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3 print:border-slate-300">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
            <Badge className="mt-2 border-none bg-accent/15 text-accent">{executiveDecision.recommendation}</Badge>
          </div>
        </div>
      </Card>
    </section>
  )
}