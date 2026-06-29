import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  Compass,
  Eye,
  Lightning,
  MagnifyingGlass,
  Plus,
  Target,
  TrendUp,
  Warning,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeRentListing } from '@/modules/opportunity-intelligence/normalizers/rentNormalizer'
import { scoreRentOpportunity } from '@/modules/opportunity-intelligence/scoring/rentScorer'
import { toRentModulePreferences } from '@/modules/opportunity-intelligence/configs/rentModuleConfig'
import type { RentModulePreferences } from '@/modules/opportunity-intelligence/configs/rentModuleConfig'
import type { OpportunityScore, RecommendationLevel } from '@/modules/opportunity-intelligence/types'
import { opportunityRepository } from '@/modules/rent/repositories/OpportunityRepository'
import type { RentalApartment } from '@/modules/rent/types'
import { DEFAULT_RENT_PREFERENCES } from '@/modules/rent/types'
import { useAuth } from '@/hooks/useAuth'

interface ScoredItem {
  apartment: RentalApartment
  score: OpportunityScore
}

const recVariant: Record<RecommendationLevel, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Excellent Fit': 'default',
  'Good Fit': 'secondary',
  'Possible Fit': 'outline',
  'Weak Fit': 'destructive',
  'Reject': 'destructive',
}

interface DashboardProps {
  onNavigate: (page: string, data?: unknown) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  const [apartments, setApartments] = useState<RentalApartment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (organization?.id && user?.id) {
        try {
          const r = await opportunityRepository.list({ organizationId: organization.id, userId: user.id })
          if (!cancelled && r.success && r.data && r.data.length > 0) { setApartments(r.data); setLoading(false); return }
        } catch {}
      }
      if (!cancelled) {
        setApartments([])
        setLoading(false)
      }
    }
    load(); return () => { cancelled = true }
  }, [organization?.id, user?.id])
  const scored = useMemo<ScoredItem[]>(() => {
    const prefs: RentModulePreferences = toRentModulePreferences(DEFAULT_RENT_PREFERENCES)
    return apartments.map((a) => ({
      apartment: a,
      score: scoreRentOpportunity(normalizeRentListing(a), prefs),
    })).sort((a, b) => b.score.totalScore - a.score.totalScore)
  }, [apartments])

  const kpis = useMemo(() => {
    const total = scored.length
    const highPriority = scored.filter((s) => s.score.recommendation === 'Excellent Fit' || s.score.recommendation === 'Good Fit').length
    const needsAttention = scored.filter((s) =>
      s.score.confidenceScore < 55 ||
      s.score.missingData.some((m) => m.severity === 'required') ||
      s.score.recommendation === 'Weak Fit'
    ).length
    const avgConfidence = total > 0 ? Math.round(scored.reduce((sum, s) => sum + s.score.confidenceScore, 0) / total) : 0
    return { total, highPriority, needsAttention, avgConfidence }
  }, [scored])

  const needsAttentionItems = useMemo(() => {
    return scored
      .filter((s) =>
        s.score.confidenceScore < 55 ||
        s.score.missingData.some((m) => m.severity === 'required') ||
        s.score.recommendation === 'Reject' ||
        s.score.recommendation === 'Weak Fit'
      )
      .slice(0, 5)
  }, [scored])

  const topOpportunities = useMemo(() => {
    return scored
      .filter((s) => s.score.recommendation === 'Excellent Fit' || s.score.recommendation === 'Good Fit')
      .slice(0, 5)
  }, [scored])

  const recentItems = useMemo(() => scored.slice(0, 5), [scored])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">EstateMind Dashboard</h1>
          <p className="text-sm text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  if (scored.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">EstateMind Dashboard</h1>
          <p className="text-sm text-muted-foreground">AI Opportunity Intelligence</p>
        </div>
        <Card className="border-dashed p-10 text-center space-y-4">
          <Target className="h-10 w-10 mx-auto text-foreground/30" />
          <div>
            <p className="font-display text-lg font-semibold">Welcome to EstateMind</p>
            <p className="text-sm text-muted-foreground mt-1">Run Hunter to discover your first opportunity.</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/hunter')}><Compass className="mr-2 h-4 w-4" />Run Hunter</Button>
            <Button variant="outline" onClick={() => navigate('/rent/new')}><Plus className="mr-2 h-4 w-4" />Create Opportunity</Button>
          </div>
        </Card>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">EstateMind Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your daily overview of opportunities, recommendations, evidence, confidence, and next actions.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Target className="h-4 w-4" />} label="Total Opportunities" value={kpis.total} />
        <KpiCard icon={<TrendUp className="h-4 w-4" />} label="High Priority" value={kpis.highPriority} color="text-emerald-600" />
        <KpiCard icon={<Warning className="h-4 w-4" />} label="Needs Attention" value={kpis.needsAttention} color="text-amber-600" />
        <KpiCard icon={<Brain className="h-4 w-4" />} label="Avg Confidence" value={`${kpis.avgConfidence}%`} />
      </div>

      {/* Today's Focus */}
      {topOpportunities.length > 0 && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-bold">Today&apos;s Focus</h2>
          </div>
          <div className="space-y-2">
            {topOpportunities.map((item) => (
              <OpportunityRow key={item.apartment.id} item={item} onOpen={() => navigate('/rent/' + item.apartment.id)} />
            ))}
          </div>
        </Card>
      )}

      {/* Needs Attention */}
      {needsAttentionItems.length > 0 && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Warning className="h-4 w-4 text-amber-600" />
            <h2 className="font-display text-lg font-bold">Needs Attention</h2>
          </div>
          <div className="space-y-2">
            {needsAttentionItems.map((item) => (
              <OpportunityRow key={item.apartment.id} item={item} onOpen={() => navigate('/rent/' + item.apartment.id)} />
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lightning className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-bold">Recent Activity</h2>
            </div>
            <div className="space-y-2">
              {recentItems.map((item) => (
                <OpportunityRow key={item.apartment.id} item={item} onOpen={() => navigate('/rent/' + item.apartment.id)} />
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">Quick Actions</h2>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/hunter')}>
              <Compass className="mr-2 h-4 w-4" />Run Hunter
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/rent/new')}>
              <Plus className="mr-2 h-4 w-4" />New Opportunity
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/decisions')}>
              <MagnifyingGlass className="mr-2 h-4 w-4" />My Opportunities
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/rent/compare')}>
              Compare Opportunities
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/reports')}>
              <Brain className="mr-2 h-4 w-4" />AI Reports
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number | string
  color?: string
}) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-display text-2xl font-bold ${color ?? ''}`}>{value}</p>
    </Card>
  )
}

function OpportunityRow({ item, onOpen }: { item: ScoredItem; onOpen: () => void }) {
  const { apartment: a, score: s } = item
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{a.title}</p>
        <p className="text-xs text-muted-foreground">{a.district}{a.city ? `, ${a.city}` : ''}</p>
      </div>
      <Badge variant={recVariant[s.recommendation]} className="text-xs shrink-0">{s.recommendation}</Badge>
      <span className="text-xs text-muted-foreground shrink-0">{s.confidenceScore}%</span>
      <span className="font-display text-sm font-bold shrink-0">{s.totalScore}</span>
      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs" onClick={onOpen}>
        Open
      </Button>
    </div>
  )
}