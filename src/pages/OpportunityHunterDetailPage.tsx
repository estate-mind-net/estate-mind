import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { triggerDiscoveryRun } from '@/services/api/discovery.service'
import { opportunityWorkspaceService } from '@/services/supabase/opportunityWorkspace.service'
import type { InvestmentSearchBrief, OpportunityMatch, RawOpportunity } from '@/lib/types/opportunityHunter'
import type { Property } from '@/lib/types'

const propertyFromRaw = (raw: RawOpportunity): Property => ({
  id: raw.id ?? `raw-${Date.now()}`,
  title: raw.title,
  country: raw.country ?? 'Unknown',
  city: raw.city ?? 'Unknown',
  district: raw.district ?? '',
  propertyType: (raw.property_type as Property['propertyType']) || 'apartment',
  askingPrice: raw.price ?? 0,
  currency: raw.currency ?? 'EUR',
  sizeSqm: raw.size_m2 ?? 0,
  bedrooms: Math.round(raw.bedrooms ?? 0),
  condition: 'good',
  listingUrl: raw.source_url ?? undefined,
  description: raw.description ?? 'Imported by Opportunity Hunter',
  createdAt: raw.created_at ?? new Date().toISOString(),
})

const toCreateOpportunityInput = (raw: RawOpportunity) => {
  const property = propertyFromRaw(raw)
  return {
    title: property.title,
    country: property.country,
    city: property.city,
    district: property.district,
    propertyType: property.propertyType,
    askingPrice: property.askingPrice,
    currency: property.currency,
    sizeSqm: property.sizeSqm,
    bedrooms: property.bedrooms,
    condition: property.condition,
    listingUrl: property.listingUrl ?? '',
    description: property.description,
  }
}

export function OpportunityHunterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organization, user, profile } = useAuth()

  const [brief, setBrief] = useState<InvestmentSearchBrief | null>(null)
  const [matches, setMatches] = useState<Array<OpportunityMatch & { raw: RawOpportunity | null }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const load = async () => {
    if (!organization?.id || !id) return

    setIsLoading(true)
    try {
      const [briefData, matchData] = await Promise.all([
        opportunityHunterService.getBrief(organization.id, id),
        opportunityHunterService.listBriefMatches(organization.id, id),
      ])
      setBrief(briefData)
      setMatches(matchData)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load brief detail.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [organization?.id, id])

  const ranked = useMemo(() => [...matches].sort((a, b) => b.rank_score - a.rank_score), [matches])

  const handleRunDiscovery = async () => {
    if (!organization?.id) return

    setIsRunning(true)
    try {
      const result = await triggerDiscoveryRun('manual', organization.id)
      toast.success(result.message ?? `Discovery rerun complete: ${result.matchesFound ?? 0} matches.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discovery rerun failed.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleSaveToOpportunities = async (matchId: string, raw: RawOpportunity | null) => {
    if (!organization?.id || !user?.id || !raw) {
      toast.error('Missing organization or opportunity payload.')
      return
    }

    setSavingId(matchId)
    try {
      const created = await opportunityWorkspaceService.createOpportunity(toCreateOpportunityInput(raw), {
        organizationId: organization.id,
        userId: user.id,
        profileId: profile?.id,
      })

      toast.success('Saved to opportunities workspace.')
      navigate(`/opportunities/${created.opportunityId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save to opportunities.')
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading brief detail...</p>
  }

  if (!brief) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Brief not found.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/opportunity-hunter')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunDiscovery} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Discovery'}
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/opportunity-hunter/${brief.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-3">
        <h1 className="font-display text-2xl font-bold">{brief.title}</h1>
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <p><span className="text-muted-foreground">Countries:</span> {brief.countries.join(', ') || 'Any'}</p>
          <p><span className="text-muted-foreground">Cities:</span> {brief.cities.join(', ') || 'Any'}</p>
          <p><span className="text-muted-foreground">Districts:</span> {brief.districts.join(', ') || 'Any'}</p>
          <p><span className="text-muted-foreground">Property types:</span> {brief.property_types.join(', ') || 'Any'}</p>
          <p><span className="text-muted-foreground">Price:</span> {brief.min_price ?? '-'} to {brief.max_price ?? '-'} {brief.currency ?? ''}</p>
          <p><span className="text-muted-foreground">Size:</span> {brief.min_size_m2 ?? '-'} to {brief.max_size_m2 ?? '-'} m2</p>
          <p><span className="text-muted-foreground">Rental strategy:</span> {brief.rental_strategy}</p>
          <p><span className="text-muted-foreground">Target yield:</span> {brief.target_yield ?? '-'}%</p>
          <p><span className="text-muted-foreground">Risk tolerance:</span> {brief.risk_tolerance}</p>
          <p><span className="text-muted-foreground">Renovation preference:</span> {brief.renovation_preference}</p>
        </div>
        {brief.notes && <p className="text-sm text-muted-foreground">{brief.notes}</p>}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Matched Opportunities</h2>

        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches yet. Run discovery to populate opportunities.</p>
        ) : (
          <div className="space-y-3">
            {ranked.map((match) => (
              <div key={match.id} className="rounded border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{match.raw?.title ?? 'Untitled opportunity'}</p>
                    <p className="text-xs text-muted-foreground">{match.raw?.city ?? 'Unknown city'} · {match.raw?.price ?? 'n/a'} {match.raw?.currency ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{match.match_score}/100</Badge>
                    <Badge variant="outline">AI {match.ai_investment_score ?? 'n/a'}</Badge>
                  </div>
                </div>

                <p className="text-sm"><span className="text-muted-foreground">Recommendation:</span> {match.recommendation ?? 'pending'}</p>
                <p className="text-sm"><span className="text-muted-foreground">Suggested next step:</span> {match.suggested_next_step ?? 'Review manually'}</p>

                <div className="text-xs text-muted-foreground">
                  <p>Match reasons: {match.match_reasons.join(' | ') || 'n/a'}</p>
                  <p>Missing data: {match.missing_data.join(' | ') || 'none'}</p>
                  <p>Mismatches: {match.mismatch_reasons.join(' | ') || 'none'}</p>
                </div>

                <div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveToOpportunities(match.id, match.raw)}
                    disabled={savingId === match.id || !match.raw}
                  >
                    {savingId === match.id ? 'Saving...' : 'Save to Opportunities'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
