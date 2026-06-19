import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Compass, Database, Link as LinkIcon, Plus, Pulse } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { getSupabaseClient } from '@/services/supabase/client'
import type { InvestmentSearchBrief, OpportunitySource, SourceConnectorRun } from '@/lib/types/opportunityHunter'

// Source types supported by Rent Hunter:
// rent_demo | manual_url | portal_manual_assisted | portal_api | web_search | partner_feed

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

export function RentHunterDashboardPage() {
  const navigate = useNavigate()
  const { organization } = useAuth()

  const [briefs, setBriefs] = useState<RentBrief[]>([])
  const [sources, setSources] = useState<OpportunitySource[]>([])
  const [lastRuns, setLastRuns] = useState<Record<string, SourceConnectorRun>>({})
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSource, setIsCreatingSource] = useState(false)

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

        // Load last run per source
        const supabase = getSupabaseClient()
        if (supabase && rentSources.length > 0) {
          const sourceIds = rentSources.map((s) => s.id)
          const { data: runRows } = await supabase
            .from('source_connector_runs')
            .select('*')
            .eq('organization_id', organization!.id)
            .in('source_id', sourceIds)
            .order('started_at', { ascending: false })
            .limit(50)

          if (!cancelled && runRows) {
            const runsBySource: Record<string, SourceConnectorRun> = {}
            for (const row of runRows as SourceConnectorRun[]) {
              if (row.source_id && !runsBySource[row.source_id]) {
                runsBySource[row.source_id] = row
              }
            }
            setLastRuns(runsBySource)
          }
        }

        // Load match counts per brief
        if (rentBriefs.length > 0 && supabase) {
          const counts: Record<string, number> = {}
          const briefIds = rentBriefs.map((b) => b.id)
          const { data: matchRows } = await supabase
            .from('opportunity_matches')
            .select('brief_id')
            .in('brief_id', briefIds)
            .eq('organization_id', organization!.id)
          for (const row of (matchRows ?? []) as Array<{ brief_id: string }>) {
            counts[row.brief_id] = (counts[row.brief_id] ?? 0) + 1
          }
          if (!cancelled) setMatchCounts(counts)
        }
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
      manual_url: 'Manual URL',
      portal_manual_assisted: 'Portal Assisted',
      portal_api: 'Portal API',
      web_search: 'Web Search',
      partner_feed: 'Partner Feed',
    }
    return labels[type] ?? type
  }

  const sourceStatusColor = (source: OpportunitySource): string => {
    if (!source.is_enabled) return 'text-muted-foreground'
    const run = lastRuns[source.id]
    if (!run) return 'text-muted-foreground'
    if (run.status === 'failed') return 'text-destructive'
    if (run.status === 'partial') return 'text-yellow-600'
    return 'text-green-600'
  }

  const sourceStatusLabel = (source: OpportunitySource): string => {
    if (!source.is_enabled) return 'Disabled'
    const run = lastRuns[source.id]
    if (!run) return 'No runs yet'
    if (run.status === 'failed') return 'Last run failed'
    if (run.status === 'partial') return 'Partial'
    if (run.status === 'running') return 'Running...'
    return 'Online'
  }

  const handleCreateDemoSource = async () => {
    if (!organization?.id) return
    setIsCreatingSource(true)
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
      // Reload sources to reflect the new demo source
      const updatedSources = await opportunityHunterService.listSources(organization.id, 'rent')
      setSources(updatedSources)
      toast.success('Rent Demo Source created.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create demo source.')
    } finally {
      setIsCreatingSource(false)
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
          <Button variant="outline" onClick={() => navigate('/rent/hunter/import-url')}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Import Listing URL
          </Button>
          <Button onClick={() => navigate('/rent/hunter/new')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            New Rent Brief
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
            disabled={isCreatingSource}
          >
            <Database className="mr-2 h-4 w-4" />
            {isCreatingSource ? 'Creating...' : 'Create Demo Rent Source'}
          </Button>
        </Card>
      )}

      {/* Rent Sources */}
      {sources.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Pulse className="h-5 w-5" />
            Rent Sources
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => {
              const lastRun = lastRuns[source.id]
              const statusLabel = sourceStatusLabel(source)
              const statusColor = sourceStatusColor(source)

              return (
                <Card key={source.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm truncate">{source.name}</h3>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {sourceTypeLabel(source.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                    {lastRun?.started_at && (
                      <span className="text-muted-foreground">
                        · {new Date(lastRun.started_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {lastRun && lastRun.status !== 'failed' && (
                    <p className="text-xs text-muted-foreground">
                      {lastRun.opportunities_inserted ?? 0} inserted · {lastRun.opportunities_matched ?? 0} matched
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
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
              const matches = matchCounts[brief.id] ?? 0
              const districts = (moduleData.preferred_districts ?? brief.districts ?? []).join(', ')

              return (
                <Card key={brief.id} className="p-5 space-y-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{brief.title}</h3>
                    <Badge variant={brief.is_active ? 'default' : 'secondary'}>
                      {brief.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

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
                      <span className="text-muted-foreground">Max Rent:</span>{' '}
                      {brief.currency ?? 'EUR'} {brief.max_price ?? '—'}
                      {brief.min_price ? ` (min ${brief.currency ?? 'EUR'} ${brief.min_price})` : ''}
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

                  <div className="flex flex-wrap gap-1.5">
                    {moduleData.furnished_required && <Badge variant="outline">Furnished</Badge>}
                    {moduleData.parking_required && <Badge variant="outline">Parking</Badge>}
                    {moduleData.balcony_required && <Badge variant="outline">Balcony</Badge>}
                    {moduleData.elevator_required && <Badge variant="outline">Elevator</Badge>}
                    {moduleData.pets_allowed_required && <Badge variant="outline">Pets OK</Badge>}
                    {moduleData.remote_work_important && <Badge variant="outline">Remote Work</Badge>}
                    {moduleData.quiet_important && <Badge variant="outline">Quiet</Badge>}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      {matches > 0 && (
                        <Badge variant="secondary">{matches} match{matches !== 1 ? 'es' : ''}</Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/rent/hunter/${brief.id}`}>View Brief</Link>
                    </Button>
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