import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Brain, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HunterMatchCard, type MatchWithRaw } from '@/modules/shared/hunter'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { triggerDiscoveryRun } from '@/services/api/discovery.service'
import { rentSupabaseAdapter } from '@/modules/rent/services/rentSupabaseAdapter'
import type { InvestmentSearchBrief, OpportunitySource } from '@/lib/types/opportunityHunter'
import type { RentalApartment } from '@/modules/rent/types'

type RentBrief = InvestmentSearchBrief & {
  module_type?: string
  module_data?: {
    furnished_required?: boolean
    parking_required?: boolean
    balcony_required?: boolean
    elevator_required?: boolean
    pets_allowed_required?: boolean
    remote_work_important?: boolean
    quiet_important?: boolean
    max_floor?: number | null
    preferred_districts?: string[]
    bedrooms?: number | null
  }
}


export function RentHunterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, organization } = useAuth()

  const [brief, setBrief] = useState<RentBrief | null>(null)
  const [matches, setMatches] = useState<MatchWithRaw[]>([])
  const [assignedSources, setAssignedSources] = useState<OpportunitySource[]>([])
  const [availableSources, setAvailableSources] = useState<OpportunitySource[]>([])
  const [showAddSource, setShowAddSource] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !organization?.id) { setIsLoading(false); return }

    let cancelled = false

    async function load() {
      try {
        const [briefData, matchData, briefSources, allSources] = await Promise.all([
          opportunityHunterService.getBrief(organization!.id, id!),
          opportunityHunterService.listBriefMatches(organization!.id, id!),
          opportunityHunterService.listBriefSources(id!),
          opportunityHunterService.listSources(organization!.id, 'rent'),
        ])
        if (cancelled) return

        if (!briefData) {
          toast.error('Brief not found.')
          navigate('/rent/hunter')
          return
        }

        setBrief(briefData as RentBrief)
        setMatches(matchData as MatchWithRaw[])
        setAssignedSources(briefSources)

        // Available = all rent sources not yet assigned
        const assignedIds = new Set(briefSources.map((s) => s.id))
        setAvailableSources(allSources.filter((s) => !assignedIds.has(s.id)))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load brief.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [id, organization?.id, navigate])

  const handleRunDiscovery = async () => {
    if (!organization?.id || !id) return
    setIsRunning(true)
    try {
      // Per-brief discovery: only this brief, only its assigned sources
      const result = await triggerDiscoveryRun({ briefId: id, organizationId: organization.id })
      toast.success(result.message ?? `Discovery complete: ${result.matchesFound ?? 0} matches.`)

      // Reload matches
      const matchData = await opportunityHunterService.listBriefMatches(organization.id, id)
      setMatches(matchData as MatchWithRaw[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discovery run failed.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleAssignSource = async (sourceId: string) => {
    if (!id) return
    try {
      await opportunityHunterService.assignSourceToBrief(id, sourceId)
      const source = availableSources.find((s) => s.id === sourceId)
      if (source) {
        setAssignedSources((prev) => [...prev, source])
        setAvailableSources((prev) => prev.filter((s) => s.id !== sourceId))
      }
      toast.success('Source assigned to brief.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign source.')
    }
  }

  const handleRemoveSource = async (sourceId: string) => {
    if (!id) return
    try {
      await opportunityHunterService.removeSourceFromBrief(id, sourceId)
      const source = assignedSources.find((s) => s.id === sourceId)
      if (source) {
        setAssignedSources((prev) => prev.filter((s) => s.id !== sourceId))
        setAvailableSources((prev) => [...prev, source])
      }
      toast.success('Source removed from brief.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove source.')
    }
  }

  const handleSaveToRent = async (match: MatchWithRaw) => {
    if (!match.raw || !organization?.id || !user?.id) {
      toast.error('Cannot save: missing data.')
      return
    }

    setSavingMatchId(match.id)

    try {
      const raw = match.raw
      const rawData = (raw.raw_payload ?? raw.normalized_payload ?? {}) as Record<string, unknown>
      const moduleData = (brief?.module_data ?? {}) as Record<string, unknown>

      const apartment: Omit<RentalApartment, 'id'> = {
        title: raw.title || 'Untitled listing',
        city: raw.city || brief?.cities?.[0] || 'Novi Sad',
        district: raw.district || '',
        monthlyRent: raw.price ?? (rawData.monthlyRent as number) ?? 0,
        currency: raw.currency || brief?.currency || 'EUR',
        sizeM2: raw.size_m2 ?? (rawData.sizeM2 as number) ?? 0,
        bedrooms: raw.bedrooms ?? (rawData.bedrooms as number) ?? 0,
        furnished: (rawData.furnished as boolean) ?? false,
        parking: (rawData.parking as boolean) ?? false,
        balcony: (rawData.balcony as boolean) ?? false,
        elevator: (rawData.elevator as boolean) ?? false,
        petsAllowed: (rawData.petsAllowed as boolean) ?? (rawData.pets_allowed as boolean) ?? false,
        floor: (rawData.floor as number) ?? undefined,
        listingUrl: raw.source_url ?? undefined,
        contactName: (rawData.contactName as string) ?? undefined,
        contactPhone: (rawData.contactPhone as string) ?? undefined,
        status: 'new',
      }

      const result = await rentSupabaseAdapter.createRentApartment(apartment, {
        organizationId: organization.id,
        userId: user.id,
      })

      if (result.success && result.data) {
        toast.success('Saved to Rent.')
        navigate(`/rent/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to save apartment.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save apartment.')
    } finally {
      setSavingMatchId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent/hunter')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent Hunter
        </Button>
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Loading brief...</p>
        </Card>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent/hunter')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent Hunter
        </Button>
        <Card className="border-dashed p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Brief not found</h1>
          <p className="mt-3 text-muted-foreground">This brief may have been removed or the link is invalid.</p>
        </Card>
      </div>
    )
  }

  const moduleData = brief.module_data ?? {}
  const districts = (moduleData.preferred_districts ?? brief.districts ?? []).join(', ')

  const sortedMatches = [...matches].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Button variant="ghost" onClick={() => navigate('/rent/hunter')} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Rent Hunter
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-3xl font-bold tracking-tight">{brief.title}</h1>
          <Badge variant={brief.is_active ? 'default' : 'secondary'}>
            {brief.is_active ? 'Active' : 'Paused'}
          </Badge>
        </div>
      </div>

      {/* Criteria Summary */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold">Search Criteria</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">City</p>
            <p className="font-semibold">{brief.cities.join(', ') || 'Any'}</p>
          </div>
          {districts && (
            <div>
              <p className="text-muted-foreground">Districts</p>
              <p className="font-semibold">{districts}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Max Rent</p>
            <p className="font-semibold">{brief.currency ?? 'EUR'} {brief.max_price ?? '—'}</p>
          </div>
          {brief.min_price && (
            <div>
              <p className="text-muted-foreground">Min Rent</p>
              <p className="font-semibold">{brief.currency ?? 'EUR'} {brief.min_price}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Size Range</p>
            <p className="font-semibold">{brief.min_size_m2 ?? '—'} – {brief.max_size_m2 ?? '—'} m²</p>
          </div>
          {moduleData.bedrooms != null && (
            <div>
              <p className="text-muted-foreground">Bedrooms</p>
              <p className="font-semibold">{moduleData.bedrooms}</p>
            </div>
          )}
          {moduleData.max_floor != null && (
            <div>
              <p className="text-muted-foreground">Max Floor</p>
              <p className="font-semibold">{moduleData.max_floor}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {moduleData.furnished_required && <Badge variant="secondary">Furnished Required</Badge>}
          {moduleData.parking_required && <Badge variant="secondary">Parking Required</Badge>}
          {moduleData.balcony_required && <Badge variant="secondary">Balcony Preferred</Badge>}
          {moduleData.elevator_required && <Badge variant="secondary">Elevator Preferred</Badge>}
          {moduleData.pets_allowed_required && <Badge variant="secondary">Pets Required</Badge>}
          {moduleData.remote_work_important && <Badge variant="secondary">Remote Work</Badge>}
          {moduleData.quiet_important && <Badge variant="secondary">Quiet Area</Badge>}
        </div>

        {brief.notes && (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap pt-2">{brief.notes}</p>
        )}
      </Card>

      {/* Sources for this Brief */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Sources</h2>
          {!showAddSource && availableSources.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAddSource(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Add Source
            </Button>
          )}
        </div>

        {assignedSources.length === 0 && !showAddSource && (
          <p className="text-sm text-muted-foreground">
            No sources assigned. Discovery will use all enabled rent sources as fallback.
            Assign specific sources to this brief for targeted discovery.
          </p>
        )}

        {assignedSources.length > 0 && (
          <div className="space-y-2">
            {assignedSources.map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${source.is_enabled ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground">{source.type}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveSource(source.id)} className="shrink-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAddSource && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">Select a source to assign:</p>
            {availableSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">All rent sources are already assigned.</p>
            ) : (
              <div className="space-y-1">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    className="flex items-center gap-3 w-full rounded-md border p-2 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => { handleAssignSource(source.id); setShowAddSource(false) }}
                  >
                    <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowAddSource(false)} className="mt-1">
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {/* Run Discovery */}
      <div className="flex justify-center">
        <Button onClick={handleRunDiscovery} disabled={isRunning}>
          <MagnifyingGlass className="mr-2 h-4 w-4" />
          {isRunning ? 'Running Discovery...' : 'Run Rent Discovery'}
        </Button>
      </div>

      {/* Matches */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold">
          Matches {sortedMatches.length > 0 && `(${sortedMatches.length})`}
        </h2>

        {sortedMatches.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-bold">No matches yet</h3>
            <p className="mt-2 text-muted-foreground">
              Run Rent Discovery to find apartments matching your criteria.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
          {sortedMatches.map((match) => (
              <HunterMatchCard
                key={match.id}
                match={match}
                saveLabel="Save to Rent"
                isSaving={savingMatchId === match.id}
                onSave={handleSaveToRent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}