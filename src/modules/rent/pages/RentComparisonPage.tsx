import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { normalizeRentListing } from '@/modules/opportunity-intelligence/normalizers/rentNormalizer'
import { scoreRentOpportunity } from '@/modules/opportunity-intelligence/scoring/rentScorer'
import { toRentModulePreferences } from '@/modules/opportunity-intelligence/configs/rentModuleConfig'
import type { OpportunityScore, RecommendationLevel, NormalizedOpportunity } from '@/modules/opportunity-intelligence/types'
import { opportunityRepository } from '../repositories/OpportunityRepository'
import { DEFAULT_RENT_PREFERENCES, RENTAL_STATUS_LABELS } from '../types'
import type { RentalApartment, RentalStatus } from '../types'
import { useAuth } from '@/hooks/useAuth'


interface ScoredComparison {
  apartment: RentalApartment
  normalized: NormalizedOpportunity
  score: OpportunityScore
}

const recVariant: Record<RecommendationLevel, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Excellent Fit': 'default',
  'Good Fit': 'secondary',
  'Possible Fit': 'outline',
  'Weak Fit': 'destructive',
  'Reject': 'destructive',
}

const statusVariant: Record<RentalStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'outline',
  shortlisted: 'secondary',
  viewing_scheduled: 'secondary',
  viewed: 'outline',
  favorite: 'default',
  rejected: 'destructive',
}
export function RentComparisonPage() {
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  const [userApartments, setUserApartments] = useState<RentalApartment[]>([])
    const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      if (organization?.id && user?.id) {
        try {
          const result = await opportunityRepository.list({ organizationId: organization.id, userId: user.id })
          if (!cancelled && result.success && result.data && result.data.length > 0) { setUserApartments(result.data); setDataSource('cloud'); setLoading(false); return }
        } catch {}
      }
      if (!cancelled) { const local = []; setUserApartments(local); setDataSource(local.length > 0 ? 'local' : 'demo'); setLoading(false) }
    }
    load(); return () => { cancelled = true }
  }, [organization?.id, user?.id])

  const allApartments = useMemo(() => userApartments, [userApartments])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  const selectedScored = useMemo<ScoredComparison[]>(() => {
    const prefs = toRentModulePreferences(DEFAULT_RENT_PREFERENCES)
    return selectedIds
      .map((id) => allApartments.find((a) => a.id === id))
      .filter((a): a is RentalApartment => a !== undefined)
      .map((apartment) => {
        const normalized = normalizeRentListing(apartment)
        const score = scoreRentOpportunity(normalized, prefs)
        return { apartment, normalized, score }
      })
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
  }, [selectedIds, allApartments])
  const bestScore = useMemo(() => selectedScored.length > 0 ? Math.max(...selectedScored.map((s) => s.score.totalScore)) : 0, [selectedScored])
  const bestConfidence = useMemo(() => selectedScored.length > 0 ? Math.max(...selectedScored.map((s) => s.score.confidenceScore)) : 0, [selectedScored])

  if (loading) return <div className="mx-auto max-w-3xl"><Card className="p-10 text-center"><p className="text-muted-foreground">Loading...</p></Card></div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/rent')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Compare Opportunities</h1>
          <p className="text-sm text-muted-foreground">Evaluate rental opportunities side by side.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {dataSource === 'cloud' && <Badge variant="default" className="gap-1"><Cloud className="h-3 w-3" /> Cloud</Badge>}
        {dataSource === 'local' && <Badge variant="secondary" className="gap-1"><Database className="h-3 w-3" /> Local</Badge>}
        {dataSource === 'demo' && <Badge variant="secondary">Demo</Badge>}
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Select Opportunities</h2>
          <span className="text-sm text-muted-foreground">{selectedIds.length} / 5 selected</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allApartments.map((a) => (
            <label key={a.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedIds.includes(a.id) ? 'border-accent bg-accent/5' : 'hover:bg-muted/50'}`}>
              <Checkbox checked={selectedIds.includes(a.id)} onCheckedChange={() => toggleId(a.id)} disabled={!selectedIds.includes(a.id) && selectedIds.length >= 5} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.district} &middot; &euro;{a.monthlyRent}/mo</p>
              </div>
            </label>
          ))}
        </div>
      </Card>
      {selectedScored.length >= 2 ? (
        <Card className="p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-semibold text-muted-foreground whitespace-nowrap">Attribute</th>
                {selectedScored.map((s) => (
                  <th key={s.apartment.id} className="text-center py-3 px-3 min-w-[140px]">
                    <p className="font-display font-semibold truncate">{s.apartment.title}</p>
                    {s.apartment.id.startsWith('rent-demo-') && <Badge variant="secondary" className="mt-1 text-xs">Demo</Badge>}
                    <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs" onClick={() => navigate('/rent/' + s.apartment.id)}>Open</Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Score" items={selectedScored} best={bestScore} bestOf="score" render={(s) => <><span className="font-display text-2xl font-bold">{s.score.totalScore}</span><span className="text-muted-foreground text-xs"> / 100</span></>} />
              <CompareRow label="Recommendation" items={selectedScored} render={(s) => <Badge variant={recVariant[s.score.recommendation]}>{s.score.recommendation}</Badge>} />
              <CompareRow label="Confidence" items={selectedScored} best={bestConfidence} bestOf="confidence" render={(s) => <span className="font-semibold">{s.score.confidenceScore}%</span>} />
              <CompareRow label="Evidence" items={selectedScored} render={(s) => <><span className="font-semibold">{s.score.evidence.filter((e) => e.source === 'confirmed').length}</span><span className="text-muted-foreground text-xs"> confirmed</span></>} />
              <CompareRow label="Missing Data" items={selectedScored} render={(s) => s.score.missingData.length > 0 ? <span className="text-amber-600 font-semibold">{s.score.missingData.length} missing</span> : <span className="text-emerald-600 font-semibold">Complete</span>} />
              <CompareRow label="Price" items={selectedScored} render={(s) => <span className="font-semibold">{s.apartment.currency} {s.apartment.monthlyRent}/mo</span>} />
              <CompareRow label="Location" items={selectedScored} render={(s) => s.apartment.district} />
              <CompareRow label="Size" items={selectedScored} render={(s) => `${s.apartment.sizeM2} m2`} />
              <CompareRow label="Bedrooms" items={selectedScored} render={(s) => String(s.apartment.bedrooms)} />
              <CompareRow label="Floor" items={selectedScored} render={(s) => s.apartment.floor !== undefined ? String(s.apartment.floor) : '-'} />
              <CompareRow label="Furnished" items={selectedScored} render={(s) => s.apartment.furnished ? 'Yes' : 'No'} />
              <CompareRow label="Parking" items={selectedScored} render={(s) => s.apartment.parking ? 'Yes' : 'No'} />
              <CompareRow label="Balcony" items={selectedScored} render={(s) => s.apartment.balcony ? 'Yes' : 'No'} />
              <CompareRow label="Pets" items={selectedScored} render={(s) => s.apartment.petsAllowed ? 'Yes' : 'No'} />
              <CompareRow label="Status" items={selectedScored} render={(s) => <Badge variant={statusVariant[s.apartment.status ?? 'new']} className="text-xs">{RENTAL_STATUS_LABELS[s.apartment.status ?? 'new']}</Badge>} />
              <CompareRow label="Top Risks" items={selectedScored} render={(s) => { const r = s.score.missingData.filter((m) => m.severity === 'required').slice(0, 2); return r.length > 0 ? <>{r.map((x, i) => <p key={i} className="text-red-600">{x.label}</p>)}</> : <span className="text-emerald-600">None</span> }} />
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="border-dashed p-10 text-center">
          <p className="text-muted-foreground">Select at least 2 opportunities above to see the comparison table.</p>
        </Card>
      )}
    </div>
  )
}
function CompareRow({ label, items, render, best, bestOf }: {
  label: string
  items: ScoredComparison[]
  render: (s: ScoredComparison) => React.ReactNode
  best?: number
  bestOf?: 'score' | 'confidence'
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 font-semibold text-muted-foreground">{label}</td>
      {items.map((s) => {
        const isBest = best !== undefined && bestOf !== undefined && (
          bestOf === 'score' ? s.score.totalScore === best : s.score.confidenceScore === best
        )
        return (
          <td key={s.apartment.id} className={`text-center py-3 px-3 ${isBest ? 'bg-emerald-50' : ''}`}>
            {render(s)}
            {isBest && <p className="text-xs text-emerald-600 font-medium">Best</p>}
          </td>
        )
      })}
    </tr>
  )
}