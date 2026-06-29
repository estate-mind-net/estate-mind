import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Compass, Plus, Target } from '@phosphor-icons/react'
import type { DecisionSummary, RecommendationLevel, OpportunityModuleType } from '../types'
import { normalizeRentListing } from '../normalizers/rentNormalizer'
import { scoreRentOpportunity } from '../scoring/rentScorer'
import { opportunityRepository } from '@/modules/rent/repositories/OpportunityRepository'
import { DEFAULT_RENT_PREFERENCES } from '@/modules/rent/types'
import { toRentModulePreferences } from '../configs/rentModuleConfig'
import type { RentalApartment } from '@/modules/rent/types'
import { useAuth } from '@/hooks/useAuth'

const MODULE_LABELS: Record<OpportunityModuleType, string> = {
  rent: 'Rent', invest: 'Invest', buy: 'Buy', build: 'Build', renovate: 'Renovate',
  airbnb: 'Airbnb', due_diligence: 'Due Diligence', energy: 'Energy', portfolio: 'Portfolio',
}

const recVariant: Record<RecommendationLevel, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Excellent Fit': 'default', 'Good Fit': 'secondary', 'Possible Fit': 'outline', 'Weak Fit': 'destructive', 'Reject': 'destructive',
}



function apartmentToDecision(a: RentalApartment): DecisionSummary {
  const norm = normalizeRentListing(a)
  const score = scoreRentOpportunity(norm, toRentModulePreferences(DEFAULT_RENT_PREFERENCES))
  return {
    id: a.id, moduleType: 'rent', title: a.title,
    location: [a.district, a.city].filter(Boolean).join(', '),
    priceLabel: `${a.currency} ${a.monthlyRent}/mo`,
    score: score.totalScore, recommendation: score.recommendation,
    confidenceScore: score.confidenceScore, status: a.status ?? 'new',
    missingDataCount: score.missingData.length,
    riskCount: score.missingData.filter(m => m.severity === 'required').length,
    sourceName: a.id.startsWith('rent-demo-') ? 'Demo' : 'User',
    workspaceUrl: `/rent/${a.id}`,
    createdAt: new Date().toISOString(), updatedAt: null,
  }
}

export function MyDecisionsPage() {
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  const [apartments, setApartments] = useState<RentalApartment[]>([])
  const [loading, setLoading] = useState(true)

  // Module filter
  const [moduleFilter, setModuleFilter] = useState<'all' | OpportunityModuleType>('all')
  const [recFilter, setRecFilter] = useState<'all' | RecommendationLevel>('all')
  const [confFilter, setConfFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'confidence' | 'newest'>('score')

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
        const local = loadUserApartments()
        setApartments([])
        setLoading(false)
      }
    }
    load(); return () => { cancelled = true }
  }, [organization?.id, user?.id])
  const decisions = useMemo(() => apartments.map(apartmentToDecision), [apartments])

  const filtered = useMemo(() => {
    let result = decisions
    if (moduleFilter !== 'all') result = result.filter(d => d.moduleType === moduleFilter)
    if (recFilter !== 'all') result = result.filter(d => d.recommendation === recFilter)
    if (confFilter === 'high') result = result.filter(d => d.confidenceScore >= 75)
    else if (confFilter === 'medium') result = result.filter(d => d.confidenceScore >= 55 && d.confidenceScore < 75)
    else if (confFilter === 'low') result = result.filter(d => d.confidenceScore < 55)
    return result.sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'confidence') return b.confidenceScore - a.confidenceScore
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [decisions, moduleFilter, recFilter, confFilter, sortBy])

  const kpis = useMemo(() => ({
    total: decisions.length,
    excellentGood: decisions.filter(d => d.recommendation === 'Excellent Fit' || d.recommendation === 'Good Fit').length,
    lowConfidence: decisions.filter(d => d.confidenceScore < 55).length,
    missingData: decisions.filter(d => d.missingDataCount > 0).length,
    active: decisions.filter(d => d.status !== 'rejected' && d.status !== 'archived').length,
  }), [decisions])

  if (loading) return <div className="mx-auto max-w-6xl"><Card className="p-10 text-center"><p className="text-muted-foreground">Loading decisions...</p></Card></div>

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">My Opportunities</h1>
        <p className="text-sm text-foreground/60 max-w-2xl">
          Track and manage every opportunity you have discovered.
          Use evidence, confidence, and AI recommendations to decide what to do next.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/hunter')}>
          <Compass className="mr-1.5 h-3.5 w-3.5" />Run Hunter
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/rent/new')}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />New Opportunity
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/rent/compare')}>
          Compare
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Total Opportunities" value={kpis.total} />
        <KpiCard label="Excellent / Good" value={kpis.excellentGood} color="text-emerald-600" />
        <KpiCard label="Low Confidence" value={kpis.lowConfidence} color="text-amber-600" />
        <KpiCard label="Missing Data" value={kpis.missingData} color="text-amber-600" />
        <KpiCard label="Active" value={kpis.active} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as typeof moduleFilter)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={recFilter} onValueChange={(v) => setRecFilter(v as typeof recFilter)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Recommendation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recommendations</SelectItem>
            {(['Excellent Fit', 'Good Fit', 'Possible Fit', 'Weak Fit', 'Reject'] as RecommendationLevel[]).map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={confFilter} onValueChange={(v) => setConfFilter(v as typeof confFilter)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Confidence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="high">High (75%+)</SelectItem>
            <SelectItem value="medium">Medium (55-74%)</SelectItem>
            <SelectItem value="low">Low (&lt;55%)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Best Score</SelectItem>
            <SelectItem value="confidence">Highest Confidence</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Opportunity cards */}
      {filtered.length === 0 ? (
        <Card className="border-dashed p-10 text-center space-y-4">
          <Target className="h-8 w-8 mx-auto text-foreground/30" />
          <div>
            <p className="font-display font-semibold">No opportunities yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start by running a Hunter or adding an opportunity manually.</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/hunter')}><Compass className="mr-2 h-4 w-4" />Run Hunter</Button>
            <Button onClick={() => navigate('/rent/new')}><Plus className="mr-2 h-4 w-4" />Add Opportunity</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DecisionCard key={d.id} decision={d} onOpen={() => navigate(d.workspaceUrl)} />
          ))}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card className="p-4 space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`font-display text-2xl font-bold ${color ?? ''}`}>{value}</p>
    </Card>
  )
}

function DecisionCard({ decision, onOpen }: { decision: DecisionSummary; onOpen: () => void }) {
  const d = decision
  return (
    <Card className="p-5 space-y-3 cursor-pointer hover:border-accent/50 transition-colors" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen() }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{MODULE_LABELS[d.moduleType]}</Badge>
            {d.sourceName === 'Demo' && <Badge variant="outline" className="text-xs">Demo</Badge>}
          </div>
          <h3 className="font-display text-base font-semibold truncate">{d.title}</h3>
          <p className="text-xs text-muted-foreground">{d.location}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-xl font-bold">{d.score}</div>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">{d.priceLabel}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant={recVariant[d.recommendation]} className="text-xs">{d.recommendation}</Badge>
        <Badge variant="outline" className="text-xs">Confidence: {d.confidenceScore}%</Badge>
        {d.status !== 'new' && d.status !== 'rejected' && (
          <Badge variant="secondary" className="text-xs">{d.status}</Badge>
        )}
        {d.status === 'rejected' && <Badge variant="destructive" className="text-xs">Rejected</Badge>}
        {d.missingDataCount > 0 && <Badge variant="outline" className="text-xs text-amber-600">{d.missingDataCount} missing</Badge>}
        {d.riskCount > 0 && <Badge variant="outline" className="text-xs text-red-600">{d.riskCount} risk{d.riskCount > 1 ? 's' : ''}</Badge>}
      </div>

      <p className="text-xs text-center text-accent font-medium">Open Decision Workspace</p>
    </Card>
  )
}