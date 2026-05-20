import { Check, Brain } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PricingPageProps {
  onNavigate: (page: string) => void
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const tiers = [
    {
      name: 'Free Trial',
      price: '0',
      period: '14 days',
      description: 'Try EstateMind risk-free',
      features: [
        '3 property analyses',
        'Basic ROI calculations',
        'Investment scores',
        'Email support'
      ],
      cta: 'Start Free Trial',
      highlighted: false
    },
    {
      name: 'Investor Starter',
      price: '49',
      period: 'per month',
      description: 'For individual investors',
      features: [
        '25 property analyses/month',
        'Advanced ROI & yield analysis',
        'Airbnb potential estimates',
        'Renovation ROI calculator',
        'Opportunity tracker',
        'Priority email support'
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Investor Pro',
      price: '149',
      period: 'per month',
      description: 'For active investors',
      features: [
        'Unlimited property analyses',
        'All Starter features',
        'Property comparison tool',
        'Portfolio analytics',
        'Market trend insights',
        'Export reports (PDF)',
        'API access',
        'Priority chat support'
      ],
      cta: 'Go Pro',
      highlighted: true
    },
    {
      name: 'Investor Elite',
      price: '399',
      period: 'per month',
      description: 'For investment firms',
      features: [
        'Everything in Pro',
        'Team collaboration (up to 10 users)',
        'Custom analysis models',
        'White-label reports',
        'Dedicated account manager',
        'Advanced API integration',
        'Custom data sources',
        'Priority phone support'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                <Brain className="h-6 w-6 text-accent" weight="duotone" />
              </div>
              <span className="font-display text-2xl font-bold">EstateMind</span>
            </button>
            <div className="flex items-center gap-6">
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl font-bold tracking-tight">
            Invest Smarter With AI
          </h1>
          <p className="mt-6 text-lg text-foreground/80">
            Choose the plan that fits your investment strategy. All plans include AI-powered analysis and institutional-grade insights.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col p-8 transition-all ${
                tier.highlighted
                  ? 'border-2 border-accent shadow-lg shadow-accent/20'
                  : 'hover:border-accent/50'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-display text-2xl font-bold">{tier.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                <div className="mt-6">
                  <span className="font-display text-5xl font-bold">${tier.price}</span>
                  <span className="ml-2 text-muted-foreground">/{tier.period}</span>
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-success" weight="bold" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-8 w-full ${
                  tier.highlighted
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : ''
                }`}
                variant={tier.highlighted ? 'default' : 'outline'}
                onClick={() => onNavigate('dashboard')}
              >
                {tier.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include 14-day money-back guarantee. Need a custom plan?{' '}
            <button className="font-medium text-accent hover:underline">
              Contact us
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
