import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Brain, MagnifyingGlass, Plus, Rocket, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HunterMatchCard, type MatchWithRaw } from '@/modules/shared/hunter'
import { HunterSourceDialog, type SourceType, type SourceForm, emptySource, sourceToForm, buildSourcePayload } from '@/modules/shared/hunter/components/HunterSourceDialog'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { triggerDiscoveryRun } from '@/services/api/discovery.service'
import { rentSupabaseAdapter } from '@/modules/rent/services/rentSupabaseAdapter'
import type { InvestmentSearchBrief, OpportunitySource } from '@/lib/types/opportunityHunter'
import type { RentalApartment } from '@/modules/rent/types'

const RENT_SOURCE_TYPES: SourceType[] = ['manual_url', 'rent_demo', 'saved_search', 'web_search', 'rent_web_search', 'portal_search', 'live_scraper']

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
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false)
  const [sourceForm, setSourceForm] = useState<SourceForm>({ ...emptySource, type: 'saved_search' })
  const [isSavingSource, setIsSavingSource] = useState(false)
  const [lastRunDiagnostics, setLastRunDiagnostics] = useState<Record<string, unknown> | null>(null)
  const [convertingSourceId, setConvertingSourceId] = useState<string | null>(null)

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

        // Load last run diagnostics
        if (briefSources.length > 0) {
          const { getSupabaseClient } = await import('@/services/supabase/client')
          const supabase = getSupabaseClient()
          if (supabase) {
            const sourceIds = briefSources.map((s: OpportunitySource) => s.id)
            const { data: runRows } = await supabase
              .from('source_connector_runs')
              .select('metadata, status, error_message, opportunities_fetched, opportunities_inserted, opportunities_matched')
              .eq('organization_id', organization!.id)
              .in('source_id', sourceIds)
              .order('started_at', { ascending: false })
              .limit(1)
            const rows = runRows as Array<{
              metadata: Record<string, unknown>
              status: string
              error_message: string | null
              opportunities_fetched: number
              opportunities_inserted: number
              opportunities_matched: number
            }> | null
            if (rows && rows.length > 0) {
              setLastRunDiagnostics({
                ...rows[0].metadata,
                run_status: rows[0].status,
                error_message: rows[0].error_message,
                opportunities_fetched: rows[0].opportunities_fetched,
                opportunities_inserted: rows[0].opportunities_inserted,
                opportunities_matched: rows[0].opportunities_matched,
              })
            }
          }
        }

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

  const handleConvertToLiveScraper = async (source: OpportunitySource) => {
    if (!organization?.id || !id) return
    setConvertingSourceId(source.id)
    try {
      const config = (source.connector_config ?? {}) as Record<string, unknown>
      const portal = typeof config.portal === 'string' ? config.portal : '4zida'
      const city = typeof config.city === 'string' ? config.city : brief?.cities?.[0] ?? 'Novi Sad'

      // Create new live_scraper source with same criteria
      const newSource = await opportunityHunterService.createSource(organization.id, {
        name: source.name.replace(/portal.?search/i, 'Live Scraper').trim() || `${source.name} (Live)`,
        type: 'live_scraper',
        source_url: null,
        seed_urls: [],
        connector_config: {
          portal: portal.toLowerCase() === 'halo oglasi' ? 'halooglasi' : portal.toLowerCase() === '4zida' ? '4zida' : '4zida',
          city,
          districts: Array.isArray(config.districts) ? config.districts : brief?.districts ?? [],
          maxPages: 2,
        },
        terms_checked: true,
        allowed_use_notes: 'Converted from portal_search',
        rate_limit_per_hour: source.rate_limit_per_hour ?? 24,
        contact_email: null,
        is_enabled: true,
        module_type: 'rent',
      })

      // Assign new source to brief
      if (id) {
        await opportunityHunterService.assignSourceToBrief(id, newSource.id)
        setAssignedSources((prev) => [...prev, newSource])
      }

      // Remove old source from brief
      await opportunityHunterService.removeSourceFromBrief(id, source.id)
      setAssignedSources((prev) => prev.filter((s) => s.id !== source.id))

      toast.success('Converted to Live Scraper. Update Opportunities to test.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert source.')
    } finally {
      setConvertingSourceId(null)
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Sources</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSourceForm({ ...emptySource, type: 'saved_search' }); setIsSourceDialogOpen(true) }}>
              <Plus className="mr-1 h-3 w-3" />
              New Source
            </Button>
            {!showAddSource && availableSources.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowAddSource(true)}>
                Add Existing
              </Button>
            )}
          </div>
        </div>

        {assignedSources.length === 0 && !showAddSource && (
          <p className="text-sm text-muted-foreground">
            No sources assigned. Discovery will use all enabled rent sources as fallback.
            Assign specific sources to this brief for targeted discovery.
          </p>
        )}

        {assignedSources.length > 0 && (
          <div className="space-y-2">
            {assignedSources.map((source) => {
              const config = source.connector_config && typeof source.connector_config === 'object'
                ? source.connector_config as Record<string, unknown>
                : null
              const searchUrl = config && typeof config.searchUrl === 'string' ? config.searchUrl : null
              const portal = config && typeof config.portal === 'string' ? config.portal : null
              const notes = config && typeof config.notes === 'string' ? config.notes : null

              return (
                <div key={source.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${source.is_enabled ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {portal ? `${portal} · ${source.type}` : source.type}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSource(source.id)} className="shrink-0">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {notes && <p className="text-xs text-muted-foreground pl-5">{notes}</p>}

                  {/* Portal search warning */}
                  {source.type === 'portal_search' && (
                    <div className="pl-5 space-y-1">
                      <p className="text-xs text-amber-600">
                        Portal search requires a configured search provider. Use live_scraper for direct portal discovery.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleConvertToLiveScraper(source)}
                        disabled={convertingSourceId === source.id}
                      >
                        {convertingSourceId === source.id ? 'Converting...' : 'Convert to Live Scraper'}
                      </Button>
                    </div>
                  )}

                  {source.type === 'saved_search' && (
                    <div className="flex gap-2 pl-5">
                      {searchUrl && (
                        <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                          <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                            Open Search
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate('/rent/hunter/import-url')}>
                        Import Listing URL
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* Discovery Callout */}
      {matches.length === 0 && assignedSources.length > 0 && (
        <Card className="border-accent/50 bg-accent/5 p-4 flex items-start gap-3">
          <Rocket className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">
              Run discovery to search for apartments matching your {brief.cities[0] ?? 'Novi Sad'} criteria.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {assignedSources.length} source{assignedSources.length !== 1 ? 's' : ''} configured — click below to start discovering.
            </p>
          </div>
        </Card>
      )}

      {/* Update Opportunities */}
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

            {/* Last Run Diagnostics */}
            {lastRunDiagnostics && (
              <div className="mt-6 text-left">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Last Run Diagnostics</p>
                <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1.5 font-mono">
                  {/* Source info */}
                  {lastRunDiagnostics.source_name && (
                    <p>Source: <span className="font-semibold">{String(lastRunDiagnostics.source_name)}</span> ({String(lastRunDiagnostics.source_type ?? 'unknown')})</p>
                  )}
                  {lastRunDiagnostics.error_message && (
                    <p className="text-destructive">Error: {String(lastRunDiagnostics.error_message)}</p>
                  )}
                  <p>Status: <span className="font-semibold">{String(lastRunDiagnostics.run_status ?? 'unknown')}</span></p>
                  <p>Fetched: <span className="font-semibold">{String(lastRunDiagnostics.opportunities_fetched ?? 0)}</span> | Inserted: {String(lastRunDiagnostics.opportunities_inserted ?? 0)} | Matched: {String(lastRunDiagnostics.opportunities_matched ?? 0)}</p>

                  {/* Provider info */}
                  {lastRunDiagnostics.providerConfigured === false && (
                    <p className="text-destructive font-semibold">
                      ⚠ Search provider not configured. Add WEB_SEARCH_API_KEY to your environment.
                    </p>
                  )}
                  {lastRunDiagnostics.providerConfigured === true && (
                    <p className="text-green-600">✓ Provider: {String(lastRunDiagnostics.providerName ?? 'unknown')}</p>
                  )}

                  {/* Fallback info */}
                  {lastRunDiagnostics.fallback_trigger && (
                    <div className="border-l-2 border-amber-400 pl-2 space-y-0.5">
                      <p className="text-amber-600">⚠ Portal search returned 0 — auto-fallback to live_scraper</p>
                      <p>Fallback result: {String(lastRunDiagnostics.fallback_result ?? 'unknown')}</p>
                      {lastRunDiagnostics.fallback_fetched != null && (
                        <p>Fallback fetched: {String(lastRunDiagnostics.fallback_fetched)}</p>
                      )}
                    </div>
                  )}

                  {/* Query info */}
                  {lastRunDiagnostics.generatedQueries && (
                    <p>Queries: {(lastRunDiagnostics.generatedQueries as string[]).length} generated</p>
                  )}
                  {lastRunDiagnostics.totalResultsBeforeFiltering != null && (
                    <p>Raw results: {String(lastRunDiagnostics.totalResultsBeforeFiltering)}</p>
                  )}
                  {lastRunDiagnostics.totalResultsAfterRentalKeywordFilter != null && (
                    <p>After rental filter: {String(lastRunDiagnostics.totalResultsAfterRentalKeywordFilter)}</p>
                  )}
                  {lastRunDiagnostics.rentFilterRelaxed && (
                    <p className="text-yellow-600">⚠ Rental keyword filter was relaxed</p>
                  )}
                  {lastRunDiagnostics.totalResultsAfterDedup != null && (
                    <p>After dedup: {String(lastRunDiagnostics.totalResultsAfterDedup)}</p>
                  )}
                  {lastRunDiagnostics.configFilteredOut != null && Number(lastRunDiagnostics.configFilteredOut) > 0 && (
                    <p className="text-yellow-600">Config-filtered out: {String(lastRunDiagnostics.configFilteredOut)}</p>
                  )}
                  {lastRunDiagnostics.rawOpportunitiesReturned != null && (
                    <p>Opportunities returned: {String(lastRunDiagnostics.rawOpportunitiesReturned)}</p>
                  )}

                  {/* Validation rejections */}
                  {lastRunDiagnostics.pre_save_rejections_count != null && Number(lastRunDiagnostics.pre_save_rejections_count) > 0 && (
                    <p className="text-yellow-600">Pre-save rejections: {String(lastRunDiagnostics.pre_save_rejections_count)}</p>
                  )}
                  {lastRunDiagnostics.validation_rejections && Array.isArray(lastRunDiagnostics.validation_rejections) && (lastRunDiagnostics.validation_rejections as Array<Record<string, unknown>>).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-muted-foreground">Validation rejections ({(lastRunDiagnostics.validation_rejections as Array<unknown>).length})</summary>
                      <div className="mt-1 space-y-0.5 pl-2 max-h-40 overflow-y-auto">
                        {(lastRunDiagnostics.validation_rejections as Array<Record<string, unknown>>).slice(0, 5).map((rej, i) => (
                          <p key={i} className="text-destructive">
                            {String(rej.rejection_reasons ?? rej.rejection_reason ?? 'unknown')}: {String(rej.title ?? rej.source_url ?? '')}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Query breakdown */}
                  {lastRunDiagnostics.queryResultsCount && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-muted-foreground">Query results breakdown</summary>
                      <div className="mt-1 space-y-0.5 pl-2">
                        {Object.entries(lastRunDiagnostics.queryResultsCount as Record<string, number>).map(([query, count]) => (
                          <p key={query} className={count < 0 ? 'text-destructive' : ''}>
                            {count < 0 ? '✗' : '•'} {query}: {count < 0 ? 'error' : `${count} results`}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Errors */}
                  {lastRunDiagnostics.errors && Array.isArray(lastRunDiagnostics.errors) && (lastRunDiagnostics.errors as Array<string>).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-destructive">Errors ({(lastRunDiagnostics.errors as Array<string>).length})</summary>
                      <div className="mt-1 space-y-0.5 pl-2">
                        {(lastRunDiagnostics.errors as Array<string>).slice(0, 5).map((err, i) => (
                          <p key={i} className="text-destructive">{String(err)}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
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

      <HunterSourceDialog
        open={isSourceDialogOpen}
        onOpenChange={setIsSourceDialogOpen}
        editingSourceId={null}
        sourceForm={sourceForm}
        onFormChange={setSourceForm}
        onSave={async () => {
          if (!organization?.id || !sourceForm.name.trim()) {
            toast.error('Source name is required.')
            return
          }
          setIsSavingSource(true)
          try {
            const payload = buildSourcePayload(sourceForm)
            const newSource = await opportunityHunterService.createSource(organization.id, {
              ...payload,
              module_type: 'rent',
            })
            if (id) {
              await opportunityHunterService.assignSourceToBrief(id, newSource.id)
              setAssignedSources((prev) => [...prev, newSource])
            } else {
              setAvailableSources((prev) => [...prev, newSource])
            }
            setIsSourceDialogOpen(false)
            toast.success('Source created and assigned.')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create source.')
          } finally {
            setIsSavingSource(false)
          }
        }}
        onCancel={() => setIsSourceDialogOpen(false)}
        isSaving={isSavingSource}
        supportedSourceTypes={RENT_SOURCE_TYPES}
      />
    </div>
  )
}
