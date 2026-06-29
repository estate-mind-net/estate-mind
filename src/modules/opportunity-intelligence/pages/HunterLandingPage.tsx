import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Bed, Factory, Hammer, HouseLine, Lightning, MagnifyingGlass, ShieldCheck, SolarPanel, TrendUp } from '@phosphor-icons/react'

interface ModuleCard {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  route: string
  enabled: boolean
}

const MODULE_CARDS: ModuleCard[] = [
  { id: 'rent', label: 'Rent', description: 'Find long-term rental opportunities', icon: <HouseLine className="h-6 w-6" />, route: '/rent/hunter', enabled: true },
  { id: 'invest', label: 'Invest', description: 'Discover investment properties with yield analysis', icon: <TrendUp className="h-6 w-6" />, route: '/invest', enabled: false },
  { id: 'buy', label: 'Buy', description: 'Source and evaluate buy-side acquisitions', icon: <MagnifyingGlass className="h-6 w-6" />, route: '/buy', enabled: false },
  { id: 'build', label: 'Build', description: 'Identify ground-up construction opportunities', icon: <Factory className="h-6 w-6" />, route: '/build', enabled: false },
  { id: 'renovate', label: 'Renovate', description: 'Find properties with renovation potential', icon: <Hammer className="h-6 w-6" />, route: '/renovate', enabled: false },
  { id: 'airbnb', label: 'Airbnb', description: 'Evaluate short-term rental opportunities', icon: <Bed className="h-6 w-6" />, route: '/airbnb', enabled: false },
  { id: 'due-diligence', label: 'Due Diligence', description: 'Run structured verification workflows', icon: <ShieldCheck className="h-6 w-6" />, route: '/due-diligence', enabled: false },
  { id: 'energy', label: 'Energy', description: 'Assess energy efficiency and compliance', icon: <SolarPanel className="h-6 w-6" />, route: '/energy', enabled: false },
  { id: 'portfolio', label: 'Portfolio', description: 'Monitor portfolio-wide performance', icon: <Lightning className="h-6 w-6" />, route: '/portfolio-intelligence', enabled: false },
]

export function HunterLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Hunter</h1>
        <p className="text-foreground/60 max-w-xl mx-auto">
          What are you looking for? Select a module to start discovering opportunities.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_CARDS.map((card) => (
          <Card
            key={card.id}
            className={`p-5 space-y-3 transition-colors ${
              card.enabled
                ? 'cursor-pointer hover:border-accent hover:bg-accent/5'
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() => card.enabled && navigate(card.route)}
            onKeyDown={(e) => { if (e.key === "Enter" && card.enabled) navigate(card.route) }}
            role="button"
            tabIndex={card.enabled ? 0 : -1}
          >
            <div className="flex items-center gap-3">
              <span className="text-foreground/70">{card.icon}</span>
              <div>
                <h3 className="font-display text-base font-semibold">{card.label}</h3>
                {!card.enabled && (
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground/60">{card.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
