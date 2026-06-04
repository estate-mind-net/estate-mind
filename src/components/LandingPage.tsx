import { Brain, TrendUp, Buildings, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface LandingPageProps {
  onNavigate: (page: string) => void
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="bg-background">

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-primary/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(139, 218, 255, 0.03) 35px, rgba(139, 218, 255, 0.03) 70px)'
        }} />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-medium text-accent">
              <Sparkle className="h-3 w-3 sm:h-4 sm:w-4" weight="fill" />
              AI-Powered Investment Intelligence
            </div>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
              AI Investment Intelligence for Real Estate
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-foreground/80 px-4 sm:px-0">
              Analyze property opportunities like an institutional investor. Make smarter investment decisions with AI-powered insights, ROI analysis, and risk scoring.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => onNavigate('new-opportunity')}
                className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
              >
                <Brain className="mr-2 h-5 w-5" />
                Analyze a Property
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto"
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Make Better Investment Decisions
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-foreground/80">
              EstateMind combines AI analysis with real estate expertise to give you institutional-grade investment intelligence
            </p>
          </div>

          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5 sm:p-6 transition-all hover:border-accent/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <Brain className="h-6 w-6 text-accent" weight="duotone" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold">AI Deal Analyzer</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Submit property details and get comprehensive AI-powered investment analysis with scores, recommendations, and risk assessment
              </p>
            </Card>

            <Card className="p-5 sm:p-6 transition-all hover:border-accent/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success/20">
                <TrendUp className="h-6 w-6 text-success" weight="duotone" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold">ROI & Yield Analysis</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Estimate rental yields, Airbnb potential, appreciation forecasts, and renovation ROI with data-driven projections
              </p>
            </Card>

            <Card className="p-5 sm:p-6 transition-all hover:border-accent/50 sm:col-span-2 lg:col-span-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-warning/20">
                <Buildings className="h-6 w-6 text-warning" weight="duotone" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold">Portfolio Intelligence</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Track opportunities, compare investments side-by-side, manage due diligence, and organize your deal pipeline
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Ready to invest smarter?
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-foreground/80">
              Start analyzing properties with AI-powered intelligence today
            </p>
            <div className="mt-8 sm:mt-10 px-4 sm:px-0">
              <Button
                size="lg"
                onClick={() => onNavigate('new-opportunity')}
                className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
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
