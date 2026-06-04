import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Buildings, ChartLine, CheckCircle, Kanban, Sparkle, Target, TrendUp, Warning, Wallet } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScoreGauge } from './ScoreGauge'
import { cn } from '@/lib/utils'

interface PresentationPageProps {
  onExit: () => void
}

type Slide = {
  id: number
  title: string
  subtitle: string
  content: React.ReactNode
}

const analyzerSnapshot = {
  property: 'Belgrade Waterfront, 68m2, 2BR',
  score: 84,
  recommendation: 'Buy',
  annualRoi: '13.8%',
  rentalYield: '6.4%',
  airbnbYield: '9.1%',
}

const trackerPipeline = [
  { stage: 'Sourced', count: 28, color: 'bg-secondary text-secondary-foreground' },
  { stage: 'Analyzed', count: 19, color: 'bg-primary text-primary-foreground' },
  { stage: 'Due Diligence', count: 9, color: 'bg-warning/20 text-warning border border-warning/30' },
  { stage: 'Negotiation', count: 4, color: 'bg-accent/20 text-accent border border-accent/40' },
  { stage: 'Acquired', count: 2, color: 'bg-success/20 text-success border border-success/40' },
]

const reportSections = [
  'Long-term rental yield and vacancy stress test',
  'Airbnb seasonality and occupancy assumptions',
  'Renovation ROI with scenario sensitivity',
  'Legal risk heatmap and documentation checklist',
  'Energy efficiency upside and retrofit potential',
]

const pricingTiers = [
  { name: 'Starter', price: 'EUR59', note: 'Solo investors', highlight: false },
  { name: 'Pro', price: 'EUR149', note: 'Active deal flow', highlight: true },
  { name: 'Elite', price: 'EUR349', note: 'Power users + advanced analytics', highlight: false },
  { name: 'Agency', price: 'EUR699', note: 'Teams and white-label workflows', highlight: false },
]

const roadmapItems = [
  'Deal Analyzer',
  'Opportunity Tracker',
  'Investor Dashboard',
  'Market Intelligence',
  'ESG Scoring',
  'Off-Market Network',
]

export function PresentationPage({ onExit }: PresentationPageProps) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [presentMode, setPresentMode] = useState(true)

  const slides = useMemo<Slide[]>(
    () => [
      {
        id: 1,
        title: 'Vision',
        subtitle: 'AI Investment Intelligence Platform for Balkan Real Estate',
        content: (
          <div className="space-y-8 text-center">
            <Badge className="mx-auto border-accent/30 bg-accent/15 text-accent">
              <Sparkle className="h-3.5 w-3.5" weight="fill" />
              Product Vision
            </Badge>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
              AI Investment Intelligence Platform for Balkan Real Estate
            </h1>
            <p className="mx-auto max-w-3xl text-base text-foreground/75 sm:text-xl">
              EstateMind helps investors discover, score, compare, and decide on opportunities across Serbia, Croatia, Montenegro, Bosnia and Herzegovina, North Macedonia, Albania, and Greece.
            </p>
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
              <Card className="p-5 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                <p className="mt-2 font-display text-2xl font-bold">7 Markets</p>
              </Card>
              <Card className="p-5 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Analysis Speed</p>
                <p className="mt-2 font-display text-2xl font-bold">Under 60 sec</p>
              </Card>
              <Card className="p-5 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Decision Signal</p>
                <p className="mt-2 font-display text-2xl font-bold">Buy / Watch / Avoid</p>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: 2,
        title: 'Problem',
        subtitle: 'Investor workflows are fragmented and slow',
        content: (
          <div className="space-y-8">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">
              Investors juggle agents, portals, WhatsApp, Excel, and intuition.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Agents', detail: 'Phone calls and ad-hoc updates' },
                { label: 'Listing Portals', detail: 'Inconsistent data and duplicates' },
                { label: 'WhatsApp', detail: 'Scattered media and notes' },
                { label: 'Excel', detail: 'Manual scoring with stale assumptions' },
                { label: 'Intuition', detail: 'High bias, low repeatability' },
              ].map((item) => (
                <Card key={item.label} className="p-5">
                  <p className="font-display text-xl font-bold">{item.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                </Card>
              ))}
            </div>
            <Card className="border-warning/40 bg-warning/10 p-5">
              <div className="flex items-start gap-3">
                <Warning className="mt-0.5 h-5 w-5 text-warning" weight="fill" />
                <p className="text-sm text-foreground/80 sm:text-base">
                  Result: missed opportunities, inconsistent due diligence, and slow decision cycles that cost both time and returns.
                </p>
              </div>
            </Card>
          </div>
        ),
      },
      {
        id: 3,
        title: 'Solution',
        subtitle: 'EstateMind turns raw listings into confident investment decisions',
        content: (
          <div className="space-y-8">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">
              Analyze property opportunities and receive actionable recommendations.
            </h2>
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                  <Brain className="h-6 w-6 text-accent" weight="duotone" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold">Intake</h3>
                <p className="mt-2 text-sm text-foreground/75">Capture listing data, agent notes, and assumptions in one structured workflow.</p>
              </Card>
              <Card className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/20">
                  <Target className="h-6 w-6 text-success" weight="duotone" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold">Scoring</h3>
                <p className="mt-2 text-sm text-foreground/75">Generate transparent scores across yield, risk, legal readiness, and liquidity.</p>
              </Card>
              <Card className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                  <TrendUp className="h-6 w-6 text-primary" weight="duotone" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold">Decisioning</h3>
                <p className="mt-2 text-sm text-foreground/75">Receive Buy/Watch/Avoid recommendations and next-step guidance for the deal team.</p>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: 4,
        title: 'AI Deal Analyzer',
        subtitle: 'Instant recommendation with score, signals, and returns',
        content: (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Live Demo Snapshot</p>
                  <h3 className="mt-1 font-display text-2xl font-bold">{analyzerSnapshot.property}</h3>
                </div>
                <Badge className="border-success/40 bg-success/15 text-success">{analyzerSnapshot.recommendation}</Badge>
              </div>
              <div className="mt-6 flex items-center justify-center rounded-xl border border-border/70 bg-background/60 py-6">
                <ScoreGauge score={analyzerSnapshot.score} size="lg" showLabel />
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Card className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Annual ROI</p>
                <p className="mt-2 font-display text-3xl font-bold">{analyzerSnapshot.annualRoi}</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Rental Yield</p>
                <p className="mt-2 font-display text-3xl font-bold">{analyzerSnapshot.rentalYield}</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Airbnb Yield</p>
                <p className="mt-2 font-display text-3xl font-bold">{analyzerSnapshot.airbnbYield}</p>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: 5,
        title: 'Opportunity Tracker',
        subtitle: 'Pipeline visibility from sourcing to acquisition',
        content: (
          <div className="space-y-8">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Saved opportunities, prioritized and stage-tracked.</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {trackerPipeline.map((item) => (
                <Card key={item.stage} className="p-5">
                  <Badge className={cn('mb-4', item.color)}>{item.stage}</Badge>
                  <p className="font-display text-4xl font-bold">{item.count}</p>
                  <p className="mt-1 text-sm text-muted-foreground">active deals</p>
                </Card>
              ))}
            </div>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <Kanban className="h-5 w-5 text-accent" />
                <p className="text-sm text-foreground/80 sm:text-base">
                  Teams can move opportunities across stages, preserve context, and open full AI analysis from each card.
                </p>
              </div>
            </Card>
          </div>
        ),
      },
      {
        id: 6,
        title: 'Investor Report',
        subtitle: 'Comprehensive decision brief for every opportunity',
        content: (
          <div className="space-y-8">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">One report, all critical investment dimensions.</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {reportSections.map((section) => (
                <Card key={section} className="p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 text-success" weight="fill" />
                    <p className="text-sm text-foreground/80 sm:text-base">{section}</p>
                  </div>
                </Card>
              ))}
            </div>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <ChartLine className="h-5 w-5 text-primary" weight="duotone" />
                <p className="text-sm text-foreground/80 sm:text-base">Export-ready format for partners, IC meetings, and lender conversations.</p>
              </div>
            </Card>
          </div>
        ),
      },
      {
        id: 7,
        title: 'Business Model',
        subtitle: 'Tiered SaaS plans for every investor profile',
        content: (
          <div className="space-y-8">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Clear monetization from solo investor to agency scale.</h2>
            <div className="grid gap-5 lg:grid-cols-4">
              {pricingTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={cn('p-6 transition-all', tier.highlight ? 'border-accent shadow-lg shadow-accent/10' : 'border-border/70')}
                >
                  {tier.highlight && <Badge className="mb-4 bg-accent text-accent-foreground">Most Popular</Badge>}
                  <p className="font-display text-2xl font-bold">{tier.name}</p>
                  <p className="mt-2 font-display text-3xl font-bold">{tier.price}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{tier.note}</p>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross Margin Potential</p>
                <p className="mt-2 font-display text-3xl font-bold">85%+</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Expansion Revenue</p>
                <p className="mt-2 font-display text-3xl font-bold">Seats + API</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Enterprise Upsell</p>
                <p className="mt-2 font-display text-3xl font-bold">White-label</p>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: 8,
        title: 'Roadmap',
        subtitle: 'Product expansion path from analysis to network effects',
        content: (
          <div className="space-y-8">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Execution roadmap toward a regional intelligence network.</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roadmapItems.map((item, index) => (
                <Card key={item} className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Phase {index + 1}</p>
                  <p className="mt-2 font-display text-2xl font-bold">{item}</p>
                </Card>
              ))}
            </div>
            <Card className="border-success/40 bg-success/10 p-5">
              <div className="flex items-start gap-3">
                <Wallet className="h-5 w-5 text-success" weight="duotone" />
                <p className="text-sm text-foreground/80 sm:text-base">
                  End state: EstateMind becomes the operating system for real estate investors in the Balkans.
                </p>
              </div>
            </Card>
          </div>
        ),
      },
    ],
    []
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setActiveSlide((prev) => Math.min(prev + 1, slides.length - 1))
      }

      if (event.key === 'ArrowLeft') {
        setActiveSlide((prev) => Math.max(prev - 1, 0))
      }

      if (event.key.toLowerCase() === 'f') {
        setPresentMode((prev) => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slides.length])

  const progressValue = ((activeSlide + 1) / slides.length) * 100

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,218,255,0.08),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(126,253,184,0.08),transparent_44%)]" />

      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="font-display text-lg font-bold sm:text-xl">EstateMind Product Presentation</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Slide {activeSlide + 1} of {slides.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPresentMode((prev) => !prev)}>
              {presentMode ? 'Exit Present Mode' : 'Enter Present Mode'}
            </Button>
            <Button variant="outline" onClick={onExit}>Exit</Button>
          </div>
        </div>
        <Progress value={progressValue} className="h-1 rounded-none" />
      </header>

      <main className="relative mx-auto w-full max-w-7xl p-4 sm:p-6">
        <div
          className={cn(
            'min-h-[calc(100vh-10rem)] rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm transition-all sm:p-10',
            presentMode && 'bg-card/90 sm:p-12'
          )}
        >
          <div className="flex min-h-[calc(100vh-15rem)] items-center">
            <div className={cn('w-full', presentMode && 'scale-[1.01]')}>
              <div className="mb-6">
                <Badge variant="outline" className="border-accent/40 text-accent">{slides[activeSlide].title}</Badge>
                <p className="mt-3 text-sm text-muted-foreground sm:text-base">{slides[activeSlide].subtitle}</p>
              </div>
              {slides[activeSlide].content}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={cn('h-2.5 w-8 rounded-full transition-all', index === activeSlide ? 'bg-accent' : 'bg-border hover:bg-border/70')}
                aria-label={`Go to slide ${slide.id}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveSlide((prev) => Math.max(prev - 1, 0))}
              disabled={activeSlide === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={() => setActiveSlide((prev) => Math.min(prev + 1, slides.length - 1))}
              disabled={activeSlide === slides.length - 1}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground sm:text-sm">
          Keyboard: Left/Right arrows navigate slides, F toggles present mode.
        </p>
      </main>
    </div>
  )
}
