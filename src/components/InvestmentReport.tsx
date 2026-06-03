import { useEffect } from 'react'
import { ScoreGauge } from './ScoreGauge'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {  ArrowLeft, TrendUp, TrendDown, Warning, CheckCircle, X } from '@phosphor-icons/react'
import type { InvestmentAnalysis } from '@/lib/types'
import { mockAnalyses } from '@/lib/mockData'

interface InvestmentReportProps {
  analysis?: InvestmentAnalysis
  onBack: () => void
}

export function InvestmentReport({ analysis, onBack }: InvestmentReportProps) {
  const report = analysis || mockAnalyses[0]
  const { property, score, recommendation, executiveSummary, rentalYieldEstimate, airbnbPotential, renovationROI, appreciationPotential, risks, opportunities, assumptions, missingData } = report

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    console.debug('[deal-analysis-ui] final report score fields', {
      usingProvidedAnalysis: Boolean(analysis),
      usingMockFallback: !analysis,
      score,
      overallScore: (report as InvestmentAnalysis & Record<string, unknown>).overallScore,
      investmentScore: (report as InvestmentAnalysis & Record<string, unknown>).investmentScore,
      metrics: (report as InvestmentAnalysis & Record<string, unknown>).metrics,
      confidence: (report as InvestmentAnalysis & Record<string, unknown>).confidence,
      confidenceLevel: (report as InvestmentAnalysis & Record<string, unknown>).confidenceLevel,
      renderedOverallScore: score?.overall,
    })
  }, [analysis, report, score])

  const recommendationConfig = {
    buy: { label: 'Strong Buy', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success' },
    watch: { label: 'Watch', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning' },
    avoid: { label: 'Avoid', color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive' }
  }

  const config = recommendationConfig[recommendation]

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-4xl font-bold tracking-tight">Investment Analysis</h1>
          <p className="mt-2 text-foreground/70">{property.title}</p>
        </div>
      </div>

      <Card className={`border-2 ${config.borderColor} ${config.bgColor} p-8`}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col items-center justify-center text-center lg:border-r lg:border-border">
            <ScoreGauge score={score.overall} size="lg" showLabel={false} />
            <p className="mt-4 font-display text-2xl font-bold">Overall Score</p>
            <p className="mt-1 text-sm text-muted-foreground">Investment Quality</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center lg:border-r lg:border-border">
            <div className={`rounded-full p-4 ${config.bgColor}`}>
              {recommendation === 'buy' && <CheckCircle className={`h-12 w-12 ${config.color}`} weight="fill" />}
              {recommendation === 'watch' && <Warning className={`h-12 w-12 ${config.color}`} weight="fill" />}
              {recommendation === 'avoid' && <X className={`h-12 w-12 ${config.color}`} weight="fill" />}
            </div>
            <p className={`mt-4 font-display text-2xl font-bold ${config.color}`}>{config.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">AI Recommendation</p>
          </div>

          <div className="flex flex-col justify-center">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{property.city}, {property.country}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asking Price</p>
                <p className="font-semibold">{property.currency} {property.askingPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price per m²</p>
                <p className="font-semibold">{property.currency} {Math.round(property.askingPrice / property.sizeSqm).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-2xl font-bold">Executive Summary</h2>
        <p className="mt-4 leading-relaxed text-foreground/80">{executiveSummary}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold">Long-Term Rental</h3>
          <div className="mt-6 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-display text-3xl font-bold">{property.currency} {rentalYieldEstimate.monthly.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Annual Yield</p>
                <p className="text-2xl font-bold text-success">{rentalYieldEstimate.percentage}%</p>
              </div>
            </div>
            <Progress value={score.rentalYield} className="h-2" />
            <p className="text-sm text-muted-foreground">Score: {score.rentalYield}/100</p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-xl font-bold">Airbnb Potential</h3>
          <div className="mt-6 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="font-display text-3xl font-bold">{property.currency} {airbnbPotential.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Annual Yield</p>
                <p className="text-2xl font-bold text-success">{airbnbPotential.percentage}%</p>
              </div>
            </div>
            <Progress value={score.airbnbPotential} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {airbnbPotential.occupancy}% occupancy @ {property.currency}{airbnbPotential.dailyRate}/night
            </p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="metrics" className="flex-1">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="risks" className="flex-1">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Renovation ROI</p>
              <p className="mt-2 font-display text-2xl font-bold">{renovationROI.roi}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {property.currency}{(renovationROI.estimatedCost / 1000).toFixed(0)}k cost → {property.currency}{(renovationROI.valueIncrease / 1000).toFixed(0)}k value
              </p>
              <Progress value={score.renovation} className="mt-3 h-1.5" />
            </Card>

            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">5-Year Appreciation</p>
              <p className="mt-2 font-display text-2xl font-bold text-success">+{appreciationPotential.fiveYear}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                1Y: +{appreciationPotential.oneYear}% | 3Y: +{appreciationPotential.threeYear}%
              </p>
              <Progress value={score.appreciation} className="mt-3 h-1.5" />
            </Card>

            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Legal & Compliance</p>
              <p className="mt-2 font-display text-2xl font-bold">{score.legal}/100</p>
              <p className="mt-1 text-xs text-muted-foreground">Documentation & permits</p>
              <Progress value={score.legal} className="mt-3 h-1.5" />
            </Card>

            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Liquidity Score</p>
              <p className="mt-2 font-display text-2xl font-bold">{score.liquidity}/100</p>
              <p className="mt-1 text-xs text-muted-foreground">Exit potential</p>
              <Progress value={score.liquidity} className="mt-3 h-1.5" />
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-display text-xl font-bold">Key Opportunities</h3>
            <ul className="mt-4 space-y-3">
              {opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-3">
                  <TrendUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" weight="bold" />
                  <span className="text-sm text-foreground/80">{opp}</span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display text-xl font-bold">Risk Factors</h3>
            <ul className="mt-4 space-y-3">
              {risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Warning className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" weight="fill" />
                  <span className="text-sm text-foreground/80">{risk}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-display text-xl font-bold">Assumptions</h3>
              <ul className="mt-4 space-y-2">
                {assumptions.map((assumption, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="font-display text-xl font-bold">Missing Data</h3>
              <ul className="mt-4 space-y-2">
                {missingData.map((data, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <TrendDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span>{data}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className={`border-2 ${config.borderColor} p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold">Next Steps</h3>
            <p className="mt-2 text-foreground/70">
              {recommendation === 'buy' && 'This property shows strong investment potential. Consider proceeding with due diligence and making an offer.'}
              {recommendation === 'watch' && 'This property has potential but requires monitoring. Watch for price changes or additional information.'}
              {recommendation === 'avoid' && 'This property presents significant risks or poor returns. Consider looking for better opportunities.'}
            </p>
          </div>
          <Badge className={`${config.bgColor} ${config.color} whitespace-nowrap border-none px-4 py-2`}>
            {config.label}
          </Badge>
        </div>
      </Card>
    </div>
  )
}
