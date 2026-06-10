import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService, type OpportunityHunterRunDetailData } from '@/services/supabase/opportunityHunter.service'

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

type PortalMetricRow = {
  portal: string
  listings_found: number
  listings_extracted: number
  listings_skipped: number
  extraction_errors: number
  invalid_titles_rejected: number
  invalid_urls_rejected: number
  low_confidence_rejected: number
}

type GroupedExtraction = {
  title: string
  url: string
}

type RejectedSearchResult = {
  title: string
  url: string
  domain: string
  classification: string
  skip_reason: string
  skip_reason_code?: string
  reason_code?: string
  path_pattern?: string
}

type ValidationRejectionRow = {
  portal: string
  title: string
  source_url: string
  rejection_reason: string
  reason_code: string
  confidence: number
}

type RejectedMatchRow = {
  raw_opportunity_id?: string
  title: string
  source_url: string
  city?: string
  price?: number | null
  property_type?: string
  match_score?: number
  rejection_reasons?: string[]
  mismatch_reasons?: string[]
  missing_data?: string[]
}

const formatPortalName = (value: string): string => {
  if (value === '4zida') return '4Zida'
  if (value === 'halo_oglasi') return 'Halo Oglasi'
  if (value === 'cityexpert') return 'City Expert'
  if (value === 'nekretnine') return 'Nekretnine.rs'
  if (value === 'realitica') return 'Realitica'
  return value.replace(/_/g, ' ')
}

const getPortalKey = (value: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return 'generic'
}

export function OpportunityHunterRunDetailPage() {
  const navigate = useNavigate()
  const { runId } = useParams<{ runId: string }>()
  const { organization } = useAuth()

  const [detail, setDetail] = useState<OpportunityHunterRunDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!organization?.id || !runId) return
    setIsLoading(true)
    try {
      const data = await opportunityHunterService.getDiscoveryRunDetail(organization.id, runId)
      setDetail(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load discovery run detail.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id, runId])

  useEffect(() => {
    void load()
  }, [load])

  const handleDeleteRawOpportunity = async (rawId: string, title: string) => {
    if (!organization?.id) return
    if (!window.confirm(`Delete raw opportunity "${title}"? Related matches and alerts may be removed by database relationships.`)) return

    try {
      const deleted = await opportunityHunterService.deleteRawOpportunity(organization.id, rawId)
      toast.success(`Deleted ${deleted} raw opportunit${deleted === 1 ? 'y' : 'ies'}.`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete raw opportunity.')
    }
  }

  const summary = useMemo(() => {
    const metadata = detail?.run.metadata ?? {}
    const errors = asStringArray(metadata.errors)
    const pageClassifications = Array.isArray(metadata.page_classifications)
      ? metadata.page_classifications.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      : []
    const portalMetricsObject = metadata.portal_metrics && typeof metadata.portal_metrics === 'object'
      ? metadata.portal_metrics as Record<string, unknown>
      : {}
    const rejectedSearchResults = Array.isArray(metadata.raw_search_results)
      ? metadata.raw_search_results.filter((item): item is RejectedSearchResult => Boolean(item) && typeof item === 'object')
      : []
    const validationRejections = Array.isArray(metadata.validation_rejections)
      ? metadata.validation_rejections.filter((item): item is ValidationRejectionRow => Boolean(item) && typeof item === 'object')
      : []
    const rejectedMatches = Array.isArray(metadata.rejected_matches)
      ? metadata.rejected_matches.filter((item): item is RejectedMatchRow => Boolean(item) && typeof item === 'object')
      : []
    const portalMetrics = Object.entries(portalMetricsObject).map(([portal, value]) => {
      const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}
      return {
        portal,
        listings_found: asNumber(row.listings_found, 0),
        listings_extracted: asNumber(row.listings_extracted, 0),
        listings_skipped: asNumber(row.listings_skipped, 0),
        extraction_errors: asNumber(row.extraction_errors, 0),
        invalid_titles_rejected: asNumber(row.invalid_titles_rejected, 0),
        invalid_urls_rejected: asNumber(row.invalid_urls_rejected, 0),
        low_confidence_rejected: asNumber(row.low_confidence_rejected, 0),
      } satisfies PortalMetricRow
    })

    const groupedExtracted = (detail?.extractedOpportunities ?? []).reduce<Record<string, GroupedExtraction[]>>((groups, item) => {
      const portal = getPortalKey((item.raw_payload as Record<string, unknown> | undefined)?.portal_label ?? (item.raw_payload as Record<string, unknown> | undefined)?.portal_key)
      if (!groups[portal]) {
        groups[portal] = []
      }

      const url = typeof item.source_url === 'string' && item.source_url.length > 0 ? item.source_url : ''
      const title = typeof item.title === 'string' && item.title.length > 0 ? item.title : 'Untitled opportunity'
      groups[portal].push({ title, url })
      return groups
    }, {})

    return {
      sources: asNumber(metadata.source_count, detail?.run.source_id ? 1 : 0),
      queries: asNumber(metadata.query_count, 0),
      searchResults: asNumber(metadata.search_results_count, 0),
      categoryPagesSkipped: asNumber(metadata.category_pages_skipped, 0),
      listingPagesFound: asNumber(metadata.listing_pages_found, 0),
      listingCardsExtracted: asNumber(metadata.listing_cards_extracted, 0),
      invalidTitlesRejected: asNumber(metadata.invalid_titles_rejected, 0),
      invalidUrlsRejected: asNumber(metadata.invalid_urls_rejected, 0),
      lowConfidenceRejected: asNumber(metadata.low_confidence_rejected, 0),
      extracted: asNumber(metadata.extracted_opportunities_count, detail?.run.opportunities_fetched ?? 0),
      saved: asNumber(metadata.inserted_opportunities_count, detail?.run.opportunities_inserted ?? 0),
      matches: asNumber(metadata.matched_opportunities_count, detail?.run.opportunities_matched ?? 0),
      skipped: asNumber(metadata.skipped_opportunities_count, detail?.run.opportunities_deduplicated ?? 0),
      errors,
      queriesList: asStringArray(metadata.generated_queries),
      pageClassifications,
      portalMetrics,
      groupedExtracted,
      rejectedSearchResults,
      validationRejections,
      rejectedMatches,
    }
  }, [detail])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading discovery run detail...</p>
  }

  if (!detail) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Discovery run not found.</p>
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

        <Badge variant="outline">{detail.run.status}</Badge>
      </div>

      <Card className="p-6 space-y-3">
        <h1 className="font-display text-2xl font-bold">Discovery Run Detail</h1>
        <p className="text-sm text-muted-foreground">
          Source: {detail.source?.name ?? detail.run.connector_name} · Brief: {detail.brief?.title ?? detail.run.brief_id ?? 'n/a'}
        </p>
        <p className="text-xs text-muted-foreground">
          Started: {new Date(detail.run.started_at).toLocaleString()} · Completed: {detail.run.completed_at ? new Date(detail.run.completed_at).toLocaleString() : 'in progress'}
        </p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Discovery Summary</h2>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p>Sources: {summary.sources}</p>
          <p>Queries: {summary.queries}</p>
          <p>Search Results: {summary.searchResults}</p>
          <p>Listing Pages Found: {summary.listingPagesFound}</p>
          <p>Listing Cards Extracted: {summary.listingCardsExtracted}</p>
          <p>Category Pages Skipped: {summary.categoryPagesSkipped}</p>
          <p>Invalid Titles Rejected: {summary.invalidTitlesRejected}</p>
          <p>Invalid URLs Rejected: {summary.invalidUrlsRejected}</p>
          <p>Low Confidence Rejected: {summary.lowConfidenceRejected}</p>
          <p>Extracted Opportunities: {summary.extracted}</p>
          <p>Saved Opportunities: {summary.saved}</p>
          <p>Matches: {summary.matches}</p>
          <p>Skipped Opportunities: {summary.skipped}</p>
          <p>Errors: {summary.errors.length}</p>
        </div>

        {summary.errors.length > 0 && (
          <div className="rounded border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-700 space-y-1">
            {summary.errors.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Raw Opportunities</h2>
        {(detail.extractedOpportunities ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No raw opportunities were stored for this run.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {detail.extractedOpportunities.map((item) => (
              <div key={item.id ?? item.source_url ?? item.title} className="rounded border p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.title || 'Untitled raw opportunity'}</p>
                  {item.id ? (
                    <Button size="sm" variant="outline" onClick={() => { void handleDeleteRawOpportunity(item.id as string, item.title) }}>
                      Delete
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground break-all">{item.source_url || 'No URL available'}</p>
                <p className="text-xs text-muted-foreground">
                  City: {item.city || 'n/a'} · Price: {item.price ?? 'n/a'} · Type: {item.property_type || 'n/a'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Generated Search Queries</h2>
        {summary.queriesList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No generated queries were stored for this run.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {summary.queriesList.map((query, index) => (
              <li key={`${query}-${index}`} className="rounded border p-2">{query}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Page Classifications</h2>
        {summary.pageClassifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No page classifications were stored for this run.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {summary.pageClassifications.map((item, index) => (
              <div key={`${String(item.url ?? 'page')}-${index}`} className="rounded border p-2">
                <p className="font-medium">{String(item.classification ?? 'unknown')}</p>
                <p className="text-xs text-muted-foreground break-all">{String(item.url ?? '')}</p>
                {Number(item.cardsExtracted ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Listing cards extracted: {Number(item.cardsExtracted)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Portal Metrics</h2>
        {summary.portalMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No portal metrics were stored for this run.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {summary.portalMetrics.map((item) => (
              <div key={item.portal} className="rounded border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{formatPortalName(item.portal)}</p>
                  <Badge variant="outline">{item.portal}</Badge>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
                  <p>Listings Found: {item.listings_found}</p>
                  <p>Listings Extracted: {item.listings_extracted}</p>
                  <p>Listings Skipped: {item.listings_skipped}</p>
                  <p>Extraction Errors: {item.extraction_errors}</p>
                  <p>Invalid Titles: {item.invalid_titles_rejected}</p>
                  <p>Invalid URLs: {item.invalid_urls_rejected}</p>
                  <p>Low Confidence: {item.low_confidence_rejected}</p>
                </div>

                {summary.groupedExtracted[item.portal]?.length ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Extracted URLs</p>
                    <div className="space-y-2">
                      {summary.groupedExtracted[item.portal].map((entry, index) => (
                        <div key={`${entry.url}-${index}`} className="rounded bg-muted/40 p-2">
                          <p className="text-sm font-medium">{entry.title}</p>
                          {entry.url ? (
                            <p className="text-xs text-muted-foreground break-all">{entry.url}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">No URL available</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Rejected Matches</h2>
        {summary.rejectedMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hard match rejections were stored for this run.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {summary.rejectedMatches.map((item, index) => (
              <div key={`${item.source_url}-${index}`} className="rounded border p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.title || 'Untitled candidate'}</p>
                  <div className="flex flex-wrap gap-2">
                    {(item.rejection_reasons ?? ['rejected_match']).map((reason) => (
                      <Badge key={reason} variant="outline">{reason}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground break-all">{item.source_url || 'No URL available'}</p>
                <p className="text-xs text-muted-foreground">
                  City: {item.city || 'n/a'} · Price: {item.price ?? 'n/a'} · Type: {item.property_type || 'n/a'} · Score: {item.match_score ?? 'n/a'}
                </p>
                {(item.mismatch_reasons ?? []).length > 0 ? (
                  <p className="text-xs text-muted-foreground">Mismatch: {(item.mismatch_reasons ?? []).join(', ')}</p>
                ) : null}
                {(item.missing_data ?? []).length > 0 ? (
                  <p className="text-xs text-muted-foreground">Missing: {(item.missing_data ?? []).join(', ')}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Validation Rejections</h2>
        {summary.validationRejections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No validation rejections were stored for this run.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {summary.validationRejections.map((item, index) => (
              <div key={`${item.source_url}-${index}`} className="rounded border p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.title || 'Untitled candidate'}</p>
                  <Badge variant="outline">{item.reason_code}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Portal: {formatPortalName(item.portal)}</p>
                <p className="text-xs text-muted-foreground">Reason: {item.rejection_reason}</p>
                <p className="text-xs text-muted-foreground">Confidence: {asNumber(item.confidence, 0)}</p>
                <p className="text-xs text-muted-foreground break-all">{item.source_url || 'No URL available'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Rejected Search Results</h2>
        {summary.rejectedSearchResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rejected search results were stored for this run.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {summary.rejectedSearchResults.map((item, index) => (
              <div key={`${item.url}-${index}`} className="rounded border p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.skip_reason_code ?? item.reason_code ?? item.classification}</Badge>
                    <Badge variant="outline">{item.classification}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground break-all">{item.url}</p>
                <p className="text-xs text-muted-foreground">Domain: {item.domain || 'n/a'}</p>
                <p className="text-xs text-muted-foreground">Skip reason: {item.skip_reason || 'n/a'}</p>
                {item.path_pattern ? (
                  <p className="text-xs text-muted-foreground">Path pattern: {item.path_pattern}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
