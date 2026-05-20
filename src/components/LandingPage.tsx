import { Brain, TrendUp, Buildings, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface LandingPageProps {
  onNavigate: (page: string) => void
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                <Brain className="h-6 w-6 text-accent" weight="duotone" />
              </div>
              <span className="font-display text-2xl font-bold">EstateMind</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => onNavigate('pricing')}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                Pricing
              </button>
              <Button onClick={() => onNavigate('dashboard')} variant="default">
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-primary/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(139, 218, 255, 0.03) 35px, rgba(139, 218, 255, 0.03) 70px)'
        }} />
        
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
              <Sparkle className="h-4 w-4" weight="fill" />
              AI-Powered Investment Intelligence
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
              AI Investment Intelligence for Real Estate
            </h1>
            <p className="mt-6 text-lg leading-8 text-foreground/80">
              Analyze property opportunities like an institutional investor. Make smarter investment decisions with AI-powered insights, ROI analysis, and risk scoring.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('analyzer')}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Brain className="mr-2 h-5 w-5" />
                Analyze a Property
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('dashboard')}
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Make Better Investment Decisions
            </h2>
            <p className="mt-4 text-lg text-foreground/80">
              EstateMind combines AI analysis with real estate expertise to give you institutional-grade investment intelligence
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 transition-all hover:border-accent/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <Brain className="h-6 w-6 text-accent" weight="duotone" />
              </div>
              <h3 className="font-display text-xl font-bold">AI Deal Analyzer</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Submit property details and get comprehensive AI-powered investment analysis with scores, recommendations, and risk assessment
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-accent/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success/20">
                <TrendUp className="h-6 w-6 text-success" weight="duotone" />
              </div>
              <h3 className="font-display text-xl font-bold">ROI & Yield Analysis</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Estimate rental yields, Airbnb potential, appreciation forecasts, and renovation ROI with data-driven projections
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-accent/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-warning/20">
                <Buildings className="h-6 w-6 text-warning" weight="duotone" />
              </div>
              <h3 className="font-display text-xl font-bold">Portfolio Intelligence</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Track opportunities, compare investments side-by-side, manage due diligence, and organize your deal pipeline
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to invest smarter?
            </h2>
            <p className="mt-4 text-lg text-foreground/80">
              Start analyzing properties with AI-powered intelligence today
            </p>
            <div className="mt-10">
              <Button
                size="lg"
                onClick={() => onNavigate('analyzer')}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Brain className="mr-2 h-5 w-5" />
                Analyze Your First Property
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
