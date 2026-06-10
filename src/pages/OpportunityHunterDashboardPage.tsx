import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import {
  opportunityHunterService,
  type OpportunityHunterCleanupAction,
  type OpportunityHunterCleanupPreview,
  type OpportunityHunterDashboardData,
} from '@/services/supabase/opportunityHunter.service'
import { triggerDiscoveryRun } from '@/services/api/discovery.service'
import type { OpportunitySource } from '@/lib/types/opportunityHunter'

type DemoBriefKey =
  | 'novi-sad-small-apartment'
  | 'fruska-gora-land-parcel'
  | 'regional-ski-apartment'
  | 'regional-seaside-apartment'

type BriefCreateInput = {
  title: string
  countries: string[]
  cities: string[]
  districts: string[]
  min_price: number | null
  max_price: number | null
  currency: string | null
  min_size_m2: number | null
  max_size_m2: number | null
  property_types: string[]
  rental_strategy: 'long_term' | 'airbnb' | 'flip' | 'mixed'
  target_yield: number | null
  risk_tolerance: 'low' | 'medium' | 'high'
  renovation_preference: 'none' | 'light' | 'heavy' | 'any'
  notes: string | null
  is_active: boolean
}

type SourceType = 'web_search' | 'demo' | 'manual_url' | 'csv_import'

type SourceHealthStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONFIGURATION_INCOMPLETE'

interface SourceForm {
  name: string
  type: SourceType
  terms_checked: boolean
  allowed_domains: string
  excluded_domains: string
  max_results_per_run: string
  rate_limit_per_hour: string
  is_enabled: boolean
}

const emptySource: SourceForm = {
  name: '',
  type: 'manual_url',
  terms_checked: false,
  allowed_domains: '',
  excluded_domains: '',
  max_results_per_run: '20',
  rate_limit_per_hour: '24',
  is_enabled: true,
}

const healthClass: Record<SourceHealthStatus, string> = {
  ONLINE: 'bg-emerald-500/10 text-emerald-700 border-emerald-600/20',
  OFFLINE: 'bg-slate-500/10 text-slate-700 border-slate-600/20',
  ERROR: 'bg-rose-500/10 text-rose-700 border-rose-600/20',
  CONFIGURATION_INCOMPLETE: 'bg-amber-500/10 text-amber-800 border-amber-600/20',
}

const supportedSourceTypes: SourceType[] = ['web_search', 'demo', 'manual_url', 'csv_import']

const cleanupLabels: Record<OpportunityHunterCleanupAction, string> = {
  failed_runs: 'Delete failed discovery runs',
  rejected_raw_opportunities: 'Delete rejected raw opportunities',
  unmatched_raw_opportunities: 'Delete unmatched raw opportunities',
  duplicate_demo_briefs: 'Delete duplicate demo briefs',
  all_demo_briefs: 'Delete all demo briefs',
  all_test_data: 'Delete all Opportunity Hunter test data',
  old_discovery_runs: 'Delete discovery runs older than X days',
  old_raw_opportunities: 'Delete raw opportunities older than X days',
}

const cleanupActions = Object.keys(cleanupLabels) as OpportunityHunterCleanupAction[]

const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

const sourceToForm = (source: OpportunitySource): SourceForm => {
  const config = source.connector_config && typeof source.connector_config === 'object'
    ? source.connector_config
    : {}

  const allowedDomains = Array.isArray(config.allowed_domains)
    ? config.allowed_domains.filter((item): item is string => typeof item === 'string').join(', ')
    : ''
  const excludedDomains = Array.isArray(config.excluded_domains)
    ? config.excluded_domains.filter((item): item is string => typeof item === 'string').join(', ')
    : ''
  const maxResultsPerRun = Number(config.max_results_per_run)

  return {
    name: source.name,
    type: source.type as SourceType,
    terms_checked: source.terms_checked,
    allowed_domains: allowedDomains,
    excluded_domains: excludedDomains,
    max_results_per_run: Number.isFinite(maxResultsPerRun) && maxResultsPerRun > 0 ? String(maxResultsPerRun) : '20',
    rate_limit_per_hour: source.rate_limit_per_hour != null ? String(source.rate_limit_per_hour) : '24',
    is_enabled: source.is_enabled,
  }
}

const demoBriefOptions: Array<{ key: DemoBriefKey; label: string; payload: BriefCreateInput }> = [
  {
    key: 'novi-sad-small-apartment',
    label: 'Novi Sad Small Apartment',
    payload: {
      title: 'Demo: 35 m2 Apartment in Novi Sad',
      countries: ['Serbia'],
      cities: ['Novi Sad'],
      districts: [],
      min_price: 45000,
      max_price: 95000,
      currency: 'EUR',
      min_size_m2: 28,
      max_size_m2: 42,
      property_types: ['apartment'],
      rental_strategy: 'long_term',
      target_yield: 5,
      risk_tolerance: 'medium',
      renovation_preference: 'light',
      notes: 'Looking for an apartment around 35 m2 in Novi Sad, Serbia. Prefer locations suitable for long-term rental, students, young professionals, or compact urban living.',
      is_active: true,
    },
  },
  {
    key: 'fruska-gora-land-parcel',
    label: 'Fruska Gora Land Parcel',
    payload: {
      title: 'Demo: Land Parcel near Novi Sad / Fruska Gora',
      countries: ['Serbia'],
      cities: ['Novi Sad', 'Sremska Kamenica', 'Ledinci', 'Rakovac', 'Beocin', 'Irig'],
      districts: ['Fruska Gora'],
      min_price: 15000,
      max_price: 120000,
      currency: 'EUR',
      min_size_m2: 400,
      max_size_m2: 3000,
      property_types: ['land', 'parcel'],
      rental_strategy: 'mixed',
      target_yield: null,
      risk_tolerance: 'medium',
      renovation_preference: 'any',
      notes: 'Looking for a parcel near Novi Sad, preferably near Fruska Gora National Park, suitable for building a private house. Important factors: road access, utilities nearby, legal/building permits, peaceful location, nature, and future appreciation.',
      is_active: true,
    },
  },
  {
    key: 'regional-ski-apartment',
    label: 'Regional Ski Apartment',
    payload: {
      title: 'Demo: Apartment in Regional Ski Center',
      countries: ['Serbia', 'Bosnia and Herzegovina', 'Montenegro', 'North Macedonia', 'Bulgaria', 'Slovenia'],
      cities: ['Kopaonik', 'Zlatibor', 'Jahorina', 'Bansko', 'Borovets', 'Kolasin', 'Kranjska Gora', 'Popova Shapka'],
      districts: [],
      min_price: 50000,
      max_price: 220000,
      currency: 'EUR',
      min_size_m2: 25,
      max_size_m2: 75,
      property_types: ['apartment', 'studio'],
      rental_strategy: 'airbnb',
      target_yield: 6,
      risk_tolerance: 'medium',
      renovation_preference: 'light',
      notes: 'Looking for an apartment in a ski center in the Balkan/nearby region with strong short-term rental potential, winter tourism demand, liquidity, and manageable operating costs.',
      is_active: true,
    },
  },
  {
    key: 'regional-seaside-apartment',
    label: 'Regional Seaside Apartment',
    payload: {
      title: 'Demo: Seaside Apartment in the Region',
      countries: ['Montenegro', 'Croatia', 'Albania', 'Greece', 'Slovenia'],
      cities: ['Budva', 'Tivat', 'Kotor', 'Herceg Novi', 'Bar', 'Ulcinj', 'Dubrovnik', 'Split', 'Zadar', 'Saranda', 'Vlore'],
      districts: [],
      min_price: 70000,
      max_price: 300000,
      currency: 'EUR',
      min_size_m2: 30,
      max_size_m2: 90,
      property_types: ['apartment', 'studio'],
      rental_strategy: 'airbnb',
      target_yield: 6,
      risk_tolerance: 'medium',
      renovation_preference: 'light',
      notes: 'Looking for an apartment by the seaside in the region, suitable for short-term rental, tourism demand, appreciation, and potential personal use.',
      is_active: true,
    },
  },
]

export function OpportunityHunterDashboardPage() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [data, setData] = useState<OpportunityHunterDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isSavingSource, setIsSavingSource] = useState(false)
  const [isAddingDemoBrief, setIsAddingDemoBrief] = useState(false)
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false)
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false)
  const [isCleanupLoading, setIsCleanupLoading] = useState(false)
  const [cleanupPreview, setCleanupPreview] = useState<OpportunityHunterCleanupPreview | null>(null)
  const [cleanupDays, setCleanupDays] = useState('30')
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [sourceForm, setSourceForm] = useState<SourceForm>(emptySource)

  const load = async () => {
    if (!organization?.id) return

    setIsLoading(true)
    try {
      const dashboard = await opportunityHunterService.getDashboardData(organization.id)
      setData(dashboard)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load opportunity hunter dashboard.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [organization?.id])

  const handleRunDiscovery = async () => {
    if (!organization?.id) {
      toast.error('Missing organization context.')
      return
    }

    setIsRunning(true)
    try {
      const result = await triggerDiscoveryRun('manual', organization.id)
      toast.success(result.message ?? `Discovery complete: ${result.matchesFound ?? 0} matches.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discovery run failed.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleCreateOrUpdateSource = async () => {
    if (!organization?.id) return

    setIsSavingSource(true)
    try {
      const payload: Omit<OpportunitySource, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'last_run_at'> = {
        name: sourceForm.name.trim(),
        type: sourceForm.type.trim(),
        source_url: null,
        seed_urls: [],
        connector_config: sourceForm.type.trim() === 'web_search'
          ? {
              allowed_domains: splitCsv(sourceForm.allowed_domains),
              excluded_domains: splitCsv(sourceForm.excluded_domains),
              max_results_per_run: Number.isFinite(Number(sourceForm.max_results_per_run))
                ? Number(sourceForm.max_results_per_run)
                : 20,
            }
          : {},
        terms_checked: sourceForm.terms_checked,
        rate_limit_per_hour: Number.isFinite(Number(sourceForm.rate_limit_per_hour)) ? Number(sourceForm.rate_limit_per_hour) : null,
        is_enabled: sourceForm.is_enabled,
        allowed_use_notes: null,
        contact_email: null,
      }

      if (!payload.name) {
        toast.error('Source name is required.')
        return
      }

      if (editingSourceId) {
        await opportunityHunterService.updateSource(organization.id, editingSourceId, payload)
        toast.success('Source updated.')
      } else {
        await opportunityHunterService.createSource(organization.id, payload)
        toast.success('Source created.')
      }
      setSourceForm(emptySource)
      setEditingSourceId(null)
      setIsSourceDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create source.')
    } finally {
      setIsSavingSource(false)
    }
  }

  const handleOpenCreateSource = () => {
    setEditingSourceId(null)
    setSourceForm(emptySource)
    setIsSourceDialogOpen(true)
  }

  const handleOpenEditSource = (source: OpportunitySource) => {
    setEditingSourceId(source.id)
    setSourceForm(sourceToForm(source))
    setIsSourceDialogOpen(true)
  }

  const handleAddDemoBrief = async (demoKey: DemoBriefKey) => {
    if (!organization?.id) {
      toast.error('Missing organization context.')
      return
    }

    const selected = demoBriefOptions.find((option) => option.key === demoKey)
    if (!selected) {
      toast.error('Demo brief not found.')
      return
    }

    setIsAddingDemoBrief(true)
    try {
      const created = await opportunityHunterService.createBrief(organization.id, selected.payload)
      toast.success('Demo brief created.')
      navigate(`/opportunity-hunter/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create demo brief.')
    } finally {
      setIsAddingDemoBrief(false)
    }
  }

  const cleanupDaysNumber = () => {
    const parsed = Number(cleanupDays)
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 30
  }

  const loadCleanupPreview = async () => {
    if (!organization?.id) return
    setIsCleanupLoading(true)
    try {
      const preview = await opportunityHunterService.previewCleanupCounts(organization.id, cleanupDaysNumber())
      setCleanupPreview(preview)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to preview cleanup counts.')
    } finally {
      setIsCleanupLoading(false)
    }
  }

  const handleOpenCleanup = async () => {
    setIsCleanupDialogOpen(true)
    await loadCleanupPreview()
  }

  const handleCleanupAction = async (action: OpportunityHunterCleanupAction) => {
    if (!organization?.id) return
    const previewCount = cleanupPreview?.[action] ?? 0
    if (!window.confirm(`${cleanupLabels[action]}? This will delete ${previewCount} record${previewCount === 1 ? '' : 's'}.`)) return

    setIsCleanupLoading(true)
    try {
      let deleted = 0
      if (action === 'failed_runs') deleted = await opportunityHunterService.cleanupFailedRuns(organization.id)
      if (action === 'rejected_raw_opportunities') deleted = await opportunityHunterService.cleanupRejectedRawOpportunities(organization.id)
      if (action === 'unmatched_raw_opportunities') deleted = await opportunityHunterService.cleanupUnmatchedRawOpportunities(organization.id)
      if (action === 'duplicate_demo_briefs') deleted = await opportunityHunterService.cleanupDuplicateDemoBriefs(organization.id)
      if (action === 'all_demo_briefs') deleted = await opportunityHunterService.cleanupAllDemoBriefs(organization.id)
      if (action === 'all_test_data') deleted = await opportunityHunterService.cleanupAllOpportunityHunterTestData(organization.id)
      if (action === 'old_discovery_runs') deleted = await opportunityHunterService.cleanupOldDiscoveryRuns(organization.id, cleanupDaysNumber())
      if (action === 'old_raw_opportunities') deleted = await opportunityHunterService.cleanupOldRawOpportunities(organization.id, cleanupDaysNumber())

      toast.success(`Deleted ${deleted} record${deleted === 1 ? '' : 's'}.`)
      await Promise.all([load(), loadCleanupPreview()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cleanup failed.')
    } finally {
      setIsCleanupLoading(false)
    }
  }

  const handleDeleteBrief = async (briefId: string, title: string) => {
    if (!organization?.id) return
    if (!window.confirm(`Delete search brief "${title}"?`)) return
    try {
      const deleted = await opportunityHunterService.deleteSearchBrief(organization.id, briefId)
      toast.success(`Deleted ${deleted} brief${deleted === 1 ? '' : 's'}.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete brief.')
    }
  }

  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (!organization?.id) return
    if (!window.confirm(`Delete source "${name}"? Discovery rows will keep organization scope but lose this source reference where the database uses set-null relationships.`)) return
    try {
      const deleted = await opportunityHunterService.deleteSource(organization.id, sourceId)
      toast.success(`Deleted ${deleted} source${deleted === 1 ? '' : 's'}.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete source.')
    }
  }

  const handleDeleteDiscoveryRun = async (runId: string) => {
    if (!organization?.id) return
    if (!window.confirm('Delete this discovery run? Raw opportunities are not deleted by this action.')) return
    try {
      const deleted = await opportunityHunterService.deleteDiscoveryRun(organization.id, runId)
      toast.success(`Deleted ${deleted} discovery run${deleted === 1 ? '' : 's'}.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete discovery run.')
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!organization?.id) return
    if (!window.confirm('Delete this opportunity match? The raw opportunity is not deleted.')) return
    try {
      const deleted = await opportunityHunterService.deleteOpportunityMatch(organization.id, matchId)
      toast.success(`Deleted ${deleted} match${deleted === 1 ? '' : 'es'}.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete match.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Opportunity Hunter</h1>
          <p className="text-sm text-muted-foreground mt-1">Define briefs, connect legal sources, and run automated discovery.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCleanup} disabled={!organization?.id || isCleanupLoading}>
            Cleanup
          </Button>
          <Button variant="outline" onClick={handleRunDiscovery} disabled={isRunning || !organization?.id}>
            {isRunning ? 'Running Discovery...' : 'Run Discovery'}
          </Button>
          <Button variant="outline" onClick={handleOpenCreateSource} disabled={!organization?.id}>
            Add Source
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isAddingDemoBrief || !organization?.id}>
                {isAddingDemoBrief ? 'Adding Demo Brief...' : 'Add Demo Brief'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {demoBriefOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  disabled={isAddingDemoBrief}
                  onClick={() => {
                    void handleAddDemoBrief(option.key)
                  }}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link to="/opportunity-hunter/new">New Brief</Link>
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading dashboard...</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Active Briefs</h2>
          {(data?.activeBriefs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active briefs yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.activeBriefs.map((brief) => (
                <div key={brief.id} className="rounded border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{brief.title}</p>
                    <p className="text-xs text-muted-foreground">{brief.countries.join(', ') || 'Any country'} · {brief.property_types.join(', ') || 'Any type'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/opportunity-hunter/${brief.id}`}>View</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { void handleDeleteBrief(brief.id, brief.title) }}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Source Health</h2>
          {(data?.sourceHealth ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No configured sources.</p>
          ) : (
            <div className="space-y-2">
              {data?.sourceHealth.map((entry) => (
                <div key={entry.source.id} className="rounded border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.source.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.source.type} · Last run {entry.lastRun?.started_at ? new Date(entry.lastRun.started_at).toLocaleString() : 'never'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Reason: {entry.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEditSource(entry.source)}>
                      Edit Source
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { void handleDeleteSource(entry.source.id, entry.source.name) }}>
                      Delete
                    </Button>
                    <Badge className={healthClass[entry.health]}>
                      {entry.health === 'CONFIGURATION_INCOMPLETE' ? 'Configuration Incomplete' : entry.health}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Top Ranked Opportunities</h2>
          {(data?.topRanked ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No ranked opportunities yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.topRanked.slice(0, 8).map((match) => (
                <div key={match.id} className="rounded border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{match.raw?.title ?? 'Untitled opportunity'}</p>
                    <div className="flex items-center gap-2">
                      <Badge>{match.match_score}/100</Badge>
                      <Button size="sm" variant="outline" onClick={() => { void handleDeleteMatch(match.id) }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">AI score: {match.ai_investment_score ?? 'n/a'} · Recommendation: {match.recommendation ?? 'pending'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Last Discovery Status</h2>
          {(data?.lastDiscoveryStatus ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No discovery runs yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.lastDiscoveryStatus.map((run) => (
                <div key={run.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{run.connector_name}</p>
                    <Badge variant="outline">{run.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    fetched {run.opportunities_fetched} · inserted {run.opportunities_inserted} · deduped {run.opportunities_deduplicated} · matched {run.opportunities_matched}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/opportunity-hunter/runs/${run.id}`}>View Trace</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { void handleDeleteDiscoveryRun(run.id) }}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSourceId ? 'Edit Source' : 'Add Source'}</DialogTitle>
            <DialogDescription>
              {editingSourceId ? 'Update the discovery source configuration.' : 'Create a discovery source and persist it to the source registry.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={sourceForm.name} onChange={(e) => setSourceForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sourceForm.type}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, type: e.target.value as SourceType }))}
              >
                {supportedSourceTypes.map((hint) => (
                  <option key={hint} value={hint}>{hint}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Allowed Domains</Label>
              <Input
                placeholder="example.com, listings.example.org"
                value={sourceForm.allowed_domains}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, allowed_domains: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Excluded Domains</Label>
              <Input
                placeholder="social.example.com, ads.example.net"
                value={sourceForm.excluded_domains}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, excluded_domains: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Results Per Run</Label>
              <Input
                type="number"
                value={sourceForm.max_results_per_run}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, max_results_per_run: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate Limit Per Hour</Label>
              <Input
                type="number"
                value={sourceForm.rate_limit_per_hour}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, rate_limit_per_hour: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={sourceForm.terms_checked} onChange={(e) => setSourceForm((prev) => ({ ...prev, terms_checked: e.target.checked }))} />
              Terms checked
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={sourceForm.is_enabled} onChange={(e) => setSourceForm((prev) => ({ ...prev, is_enabled: e.target.checked }))} />
              Enabled
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSourceDialogOpen(false)
                setEditingSourceId(null)
                setSourceForm(emptySource)
              }}
              disabled={isSavingSource}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateOrUpdateSource} disabled={isSavingSource}>
              {isSavingSource ? 'Saving...' : editingSourceId ? 'Update Source' : 'Save Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cleanup Opportunity Hunter Data</DialogTitle>
            <DialogDescription>
              Delete discovery and test data for the current organization. Saved property opportunities and deal analyses are not touched.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1">
                <Label>Age threshold in days</Label>
                <Input type="number" min={1} value={cleanupDays} onChange={(event) => setCleanupDays(event.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={loadCleanupPreview} disabled={isCleanupLoading}>
                  Preview
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {cleanupActions.map((action) => (
                <div key={action} className="rounded border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{cleanupLabels[action]}</p>
                    <p className="text-xs text-muted-foreground">Preview count: {cleanupPreview?.[action] ?? 0}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => { void handleCleanupAction(action) }} disabled={isCleanupLoading || (cleanupPreview?.[action] ?? 0) === 0}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCleanupDialogOpen(false)} disabled={isCleanupLoading}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
