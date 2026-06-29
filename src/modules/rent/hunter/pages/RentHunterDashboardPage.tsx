import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Compass, Database, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { createLimanPreset } from '../services/rentPresetService'
import { ImportSearchDialog } from '@/modules/opportunity-intelligence/workspace/ImportSearchDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { triggerDiscoveryRun } from '@/services/api/discovery.service'
import { getSupabaseClient } from '@/services/supabase/client'
import type { InvestmentSearchBrief, OpportunitySource, SourceConnectorRun } from '@/lib/types/opportunityHunter'

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

type BriefStats = {
  sources: OpportunitySource[]
  lastRunDate: string | null
  matchCount: number
}

export function RentHunterDashboardPage() {
  const navigate = useNavigate()
  const { organization, user } = useAuth()

  const importContext = organization?.id && user?.id ? { organizationId: organization.id, userId: user.id } : null
  const [briefs, setBriefs] = useState<RentBrief[]>([])
  const [sources, setSources] = useState<OpportunitySource[]>([])
  const [briefStats, setBriefStats] = useState<Record<string, BriefStats>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const [runningBriefIds, setRunningBriefIds] = useState<Set<string>>(new Set())
  const [isCreatingPreset, setIsCreatingPreset] = useState(false)

  useEffect(() => {
    if (!organization?.id) { setIsLoading(false); return }

    let cancelled = false

    async function load() {
      try {
        const [rentBriefs, rentSources] = await Promise.all([
          opportunityHunterService.listBriefs(organization!.id, 'rent') as Promise<RentBrief[]>,
          opportunityHunterService.listSources(organization!.id, 'rent'),
        ])
        if (cancelled) return

        setBriefs(rentBriefs)
        setSources(rentSources)

        // Load per-brief stats: sources, last run, match count
        const supabase = getSupabaseClient()
        const stats: Record<string, BriefStats> = {}

        for (const brief of rentBriefs) {
          // Get sources assigned to this brief
          const briefSources = await opportunityHunterService.listBriefSources(brief.id).catch(() => [])

          // Get last run from source_connector_runs for this brief's sources
          let lastRunDate: string | null = null
          if (briefSources.length > 0 && supabase) {
            const sourceIds = briefSources.map((s: OpportunitySource) => s.id)
            const { data: runRows } = await supabase
              .from('source_connector_runs')
              .select('started_at')
              .eq('organization_id', organization!.id)
              .in('source_id', sourceIds)
              .order('started_at', { ascending: false })
              .limit(1)
            const rows = runRows as Array<{ started_at: string }> | null
            if (rows && rows.length > 0) {
              lastRunDate = rows[0].started_at
            }
          }

          // Get match count
          let matchCount = 0
          if (supabase) {
            const { data: matchRows } = await supabase
              .from('opportunity_matches')
              .select('id')
              .eq('brief_id', brief.id)
              .eq('organization_id', organization!.id)
            const rows = matchRows as Array<{ id: string }> | null
            matchCount = rows?.length ?? 0
          }

          stats[brief.id] = { sources: briefSources, lastRunDate, matchCount }
        }

        if (!cancelled) setBriefStats(stats)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load rent hunter data.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [organization?.id])

  const demoSourceExists = sources.some((s) => s.type === 'rent_demo' && s.is_enabled)

  const sourceTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      rent_demo: 'Demo',
      manual_url: 'Manual',
      portal_manual_assisted: 'Portal Assisted',
      portal_api: 'Portal API',
      web_search: 'Web Search',
      partner_feed: 'Partner Feed',
      saved_search: 'Saved Search',
      rent_web_search: 'Rent Web Search',
      live_scraper: 'Live Scraper',
      portal_search: 'Portal Search',
    }
    return labels[type] ?? type
  }

  const handleCreateDemoSource = async () => {
    if (!organization?.id) return
    setIsCreatingDemo(true)
    try {
      await opportunityHunterService.createSource(organization.id, {
        name: 'Rent Demo Source',
        type: 'rent_demo',
        source_url: null,
        seed_urls: [],
        connector_config: {
          demo_count: 10,
          default_city: 'Novi Sad',
          price_range: [300, 900],
          size_range: [30, 120],
          strategy: 'long_term',
        },
        terms_checked: true,
        allowed_use_notes: 'Demo data for development',
        rate_limit_per_hour: 10,
        contact_email: null,
        is_enabled: true,
        module_type: 'rent',
      })
      const updatedSources = await opportunityHunterService.listSources(organization.id, 'rent')
      setSources(updatedSources)
      toast.success('Rent Demo Source created.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create demo source.')
    } finally {
      setIsCreatingDemo(false)
    }
  }

  const handleCreateLimanPreset = async () => {
    if (!organization?.id) return
    setIsCreatingPreset(true)
    try {
      const result = await createLimanPreset(organization.id)
      if (result.created) {
        toast.success('Liman preset created! Navigate to run discovery.')
      } else {
        toast.info('Liman preset already exists. Opening existing brief.')
      }
      navigate(`/rent/hunter/${result.brief.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create preset.')
    } finally {
      setIsCreatingPreset(false)
    }
  }

  const handleRunDiscovery = async (briefId: string) => {
    if (!organization?.id) return
    setRunningBriefIds((prev) => new Set(prev).add(briefId))
    try {
      const result = await triggerDiscoveryRun({ briefId, organizationId: organization.id })
      toast.success(result.message ?? `Discovery complete: ${result.matchesFound ?? 0} matches.`)

      // Reload brief stats
      const stats = { ...briefStats }
      const briefSources = stats[briefId]?.sources ?? []
      const supabase = getSupabaseClient()

      let lastRunDate: string | null = null
      if (briefSources.length > 0 && supabase) {
        const sourceIds = briefSources.map((s: OpportunitySource) => s.id)
        const { data: runRows } = await supabase
          .from('source_connector_runs')
          .select('started_at')
          .eq('organization_id', organization.id)
          .in('source_id', sourceIds)
          .order('started_at', { ascending: false })
          .limit(1)
        const rows = runRows as Array<{ started_at: string }> | null
        if (rows && rows.length > 0) {
          lastRunDate = rows[0].started_at
        }
      }

      let matchCount = 0
      if (supabase) {
        const { data: matchRows } = await supabase
          .from('opportunity_matches')
          .select('id')
          .eq('brief_id', briefId)
          .eq('organization_id', organization.id)
        const rows = matchRows as Array<{ id: string }> | null
        matchCount = rows?.length ?? 0
      }

      stats[briefId] = { ...stats[briefId], lastRunDate, matchCount }
      setBriefStats(stats)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discovery run failed.')
    } finally {
      setRunningBriefIds((prev) => {
        const next = new Set(prev)
        next.delete(briefId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent
        </Button>
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Loading rent hunter...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2 mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rent
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="h-8 w-8" />
            Rent Hunter
          </h1>
          <p className="text-foreground/70 mt-1">
            Discover rental apartments matching your criteria.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportSearchDialog context={importContext} onNavigateToListings={() => navigate('/rent')} onNavigateToImportUrl={() => navigate('/rent/hunter/import-url')} onNavigateToNew={() => navigate('/rent/new')} />
          <Button onClick={() => navigate('/rent/hunter/new')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            New Rent Brief
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateLimanPreset}
            disabled={isCreatingPreset}
          >
            <Compass className="mr-2 h-4 w-4" />
            {isCreatingPreset ? 'Creating...' : 'Create My Novi Sad Rent Search'}
          </Button>
        </div>
      </div>

      {!demoSourceExists && (
        <Card className="border-dashed p-6 text-center">
          <Database className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="font-display text-lg font-semibold">No Rent Demo Source</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Create a demo source to populate Rent Hunter with sample apartment listings.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleCreateDemoSource}
            disabled={isCreatingDemo}
          >
            <Database className="mr-2 h-4 w-4" />
            {isCreatingDemo ? 'Creating...' : 'Create Demo Rent Source'}
          </Button>
        </Card>
      )}

      {briefs.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Compass className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="font-display text-xl font-bold">No rent briefs yet</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Create a rent search brief to define your apartment criteria. The Rent Hunter will discover listings that match.
          </p>
          <Button className="mt-6" onClick={() => navigate('/rent/hunter/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Brief
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Your Rent Briefs</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {briefs.map((brief) => {
              const moduleData = brief.module_data ?? {}
              const stats = briefStats[brief.id]
              const sourceCount = stats?.sources.length ?? 0
              const matchCount = stats?.matchCount ?? 0
              const lastRunDate = stats?.lastRunDate ?? null
              const isRunning = runningBriefIds.has(brief.id)
              const districts = (moduleData.preferred_districts ?? brief.districts ?? []).join(', ')

              return (
                <Card key={brief.id} className="p-5 space-y-3 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{brief.title}</h3>
                    <Badge variant={brief.is_active ? 'default' : 'secondary'}>
                      {brief.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  {/* Criteria summary */}
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">City:</span>{' '}
                      {brief.cities.join(', ') || 'Any'}
                    </p>
                    {districts && (
                      <p>
                        <span className="text-muted-foreground">Districts:</span>{' '}
                        {districts}
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">Budget:</span>{' '}
                      {brief.currency ?? 'EUR'} {brief.min_price ? `${brief.min_price} – ` : ''}{brief.max_price ?? '—'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Size:</span>{' '}
                      {brief.min_size_m2 ?? '—'} – {brief.max_size_m2 ?? '—'} m²
                    </p>
                    {moduleData.bedrooms != null && (
                      <p>
                        <span className="text-muted-foreground">Bedrooms:</span>{' '}
                        {moduleData.bedrooms}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {moduleData.furnished_required && <Badge variant="outline">Furnished</Badge>}
                    {moduleData.parking_required && <Badge variant="outline">Parking</Badge>}
                    {moduleData.balcony_required && <Badge variant="outline">Balcony</Badge>}
                    {moduleData.elevator_required && <Badge variant="outline">Elevator</Badge>}
                    {moduleData.pets_allowed_required && <Badge variant="outline">Pets OK</Badge>}
                    {moduleData.remote_work_important && <Badge variant="outline">Remote Work</Badge>}
                    {moduleData.quiet_important && <Badge variant="outline">Quiet</Badge>}
                  </div>

                  {/* Sources */}
                  <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
                    <p className="font-medium">
                      {sourceCount > 0
                        ? `${sourceCount} source${sourceCount !== 1 ? 's' : ''}`
                        : 'No sources assigned'}
                    </p>
                    {sourceCount > 0 && (
                      <p className="truncate">
                        {stats!.sources
                          .slice(0, 3)
                          .map((s) => s.name)
                          .join(', ')}
                        {sourceCount > 3 && ` +${sourceCount - 3} more`}
                      </p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {lastRunDate && (
                      <span>Last run: {new Date(lastRunDate).toLocaleDateString()}</span>
                    )}
                    {matchCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {matchCount} match{matchCount !== 1 ? 'es' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/rent/hunter/${brief.id}`}>View Brief</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunDiscovery(brief.id)}
                        disabled={isRunning}
                      >
                        <MagnifyingGlass className="mr-1 h-3 w-3" />
                        {isRunning ? 'Updating...' : 'Update Opportunities'}
                      </Button>
                    </div>
                    {matchCount > 0 && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/rent/hunter/${brief.id}`}>View Matches</Link>
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}