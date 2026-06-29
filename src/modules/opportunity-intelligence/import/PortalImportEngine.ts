import type { PortalImportResult, ImportMetadata, ImportConfig } from './PortalImportResult'
import type { ExtractedListing } from './PortalImporter'
import type { EnrichmentProgress } from '../enrichment/EnrichmentResult'
import type { DataContext } from '../auth/ContextValidation'
import './bootstrap'
import { portalRegistry } from './PortalRegistry'
import { listingEnrichmentEngine } from '../enrichment/ListingEnrichmentEngine'
import { normalizeRentListing } from '../normalizers/rentNormalizer'
import { scoreRentOpportunity } from '../scoring/rentScorer'
import { toRentModulePreferences } from '../configs/rentModuleConfig'
import { DEFAULT_RENT_PREFERENCES } from '@/modules/rent/types'
import { opportunityRepository } from '@/modules/rent/repositories/OpportunityRepository'

const DEFAULT_CONFIG: ImportConfig = { maxPages: 10, maxListings: 500, delayBetweenPagesMs: 1000, delayBetweenListingsMs: 0, skipDuplicates: true, knownUrls: new Set() }

/** Generic/category page title patterns that are not real apartment listings */
const INVALID_TITLE_PATTERNS = [
  /^izdavanje stanova\s*\|/i,
  /^izdavanje stanova\s+[a-z]/i,
  /^izdavanje ku[a-z]a\s*\|/i,
  /^prodaja/i,
  /^stanovi za izdavanje/i,
  /^nekretnine/i,
  /^pretraga/i,
  /^filter/i,
]

function isInvalidListing(el: { title: string | null; price: number | null; sizeM2: number | null; listingUrl: string | null }): { valid: boolean; reason: string } {
  if (!el.listingUrl) return { valid: false, reason: 'missing listingUrl' }
  const title = (el.title ?? '').trim()
  if (!title || title === 'Untitled') return { valid: false, reason: 'missing or Untitled title' }
  // Reject generic/category pages
  for (const pat of INVALID_TITLE_PATTERNS) {
    if (pat.test(title)) return { valid: false, reason: `generic title: "${title.slice(0, 60)}"` }
  }
  // Reject if price is missing — never persist EUR 0/mo
  if (!el.price) return { valid: false, reason: 'no price' }
  // Reject if both price and size are missing
  if (!el.price && !el.sizeM2) return { valid: false, reason: 'no price and no size' }
  return { valid: true, reason: '' }
}

export class PortalImportEngine {
  async importAndPersist(
    searchUrl: string, context: DataContext, config: Partial<ImportConfig> = {},
    onProgress?: (p: EnrichmentProgress) => void,
  ): Promise<PortalImportResult> {
    const merged = { ...DEFAULT_CONFIG, ...config }
    console.log('[PortalImportEngine] Received URL:', searchUrl)
    const importer = portalRegistry.findByUrl(searchUrl)
    if (!importer) { console.error('[PortalImportEngine] No importer found for URL:', searchUrl, 'Registered:', portalRegistry.listPortals()); return this.error('unknown', searchUrl, 'No importer found. Supported: ' + portalRegistry.listPortals().join(', ')) }
    console.log('[PortalImportEngine] Detected portal:', importer.portalId, '| Importer class:', importer.constructor.name)
    onProgress?.({ phase: 'downloading', current: 0, total: 0, message: 'Fetching search pages...' })
    const fetchResult = await importer.fetchAllPages(searchUrl, merged.maxPages, merged.maxListings)
    if (fetchResult.error && fetchResult.listings.length === 0) return this.error(importer.portalId, searchUrl, fetchResult.error)
    const { unique, duplicates } = this.deduplicate(fetchResult.listings, merged.knownUrls)
    if (unique.length === 0) return this.empty(importer.portalId, searchUrl, fetchResult.pageCount, fetchResult.listings.length, duplicates)
    onProgress?.({ phase: 'enriching', current: 0, total: unique.length, message: 'Downloading listing details...' })
    const enrichment = await listingEnrichmentEngine.enrichBatch(unique, { concurrency: 5, delayBetweenMs: 200 }, onProgress)
    onProgress?.({ phase: 'scoring', current: 0, total: enrichment.enrichedCount, message: 'Saving opportunities...' })
    const prefs = toRentModulePreferences(DEFAULT_RENT_PREFERENCES)
    const dist = { excellentFit: 0, goodFit: 0, possibleFit: 0, weakFit: 0, reject: 0 }
    let totalConf = 0; const allErrors = enrichment.errors.map((e) => e.error)
    let created = 0; let skippedDupes = 0; let failed = 0; let rejectedInvalid = 0; const persistedIds: string[] = []

    for (let i = 0; i < enrichment.results.length; i++) {
      const r = enrichment.results[i]; if (!r.enrichedListing) continue
      const el = r.enrichedListing
      if (el.listingUrl) { try { const exists = await opportunityRepository.existsBySourceUrl(el.listingUrl, context); if (exists) { skippedDupes++; continue } } catch {} }

      // Validate listing before persisting
      const validation = isInvalidListing({ title: el.title, price: el.price, sizeM2: el.sizeM2, listingUrl: el.listingUrl })
      if (!validation.valid) {
        rejectedInvalid++
        console.log(`[PortalImportEngine] Rejected invalid: ${validation.reason} | URL: ${el.listingUrl} | Title: ${el.title}`)
        continue
      }

      const apartment = {
        title: el.title!, city: el.city || '', district: el.district || '',
        monthlyRent: el.price!, currency: el.currency || 'EUR', sizeM2: el.sizeM2 ?? 0,
        bedrooms: el.rooms ?? 0, furnished: el.furnished ?? false, parking: el.parking ?? false,
        balcony: el.balcony ?? false, elevator: el.elevator ?? false, petsAllowed: el.pets ?? false,
        floor: el.floor ?? undefined, listingUrl: el.listingUrl ?? undefined,
        notes: el.description ?? undefined, status: 'new' as const,
      }
      const norm = normalizeRentListing({ id: 'temp', ...apartment } as any)
      const score = scoreRentOpportunity(norm, prefs); totalConf += score.confidenceScore
      const rec = score.recommendation
      if (rec === 'Excellent Fit') dist.excellentFit++; else if (rec === 'Good Fit') dist.goodFit++
      else if (rec === 'Possible Fit') dist.possibleFit++; else if (rec === 'Weak Fit') dist.weakFit++
      else dist.reject++
      try {
        const result = await opportunityRepository.create(apartment, context)
        if (result.success) { created++; persistedIds.push(result.data?.id ?? '') }
        else { failed++; allErrors.push(result.error ?? 'Create failed') }
      } catch (e) { failed++; allErrors.push(e instanceof Error ? e.message : 'Create failed') }
      onProgress?.({ phase: 'scoring', current: i + 1, total: enrichment.enrichedCount, message: 'Saving ' + (i + 1) + ' / ' + enrichment.enrichedCount + '...' })
    }
    console.log(`[PortalImportEngine] Import complete: created=${created} rejected=${rejectedInvalid} duplicates=${duplicates + skippedDupes} failed=${failed}`)
    onProgress?.({ phase: 'complete', current: enrichment.enrichedCount, total: enrichment.enrichedCount, message: 'Import complete' })
    const avg = enrichment.enrichedCount > 0 ? Math.round(totalConf / enrichment.enrichedCount) : 0
    const meta: ImportMetadata = { portal: importer.portalId, searchUrl, moduleType: importer.moduleType, importedAt: new Date().toISOString(),
      pagesProcessed: fetchResult.pageCount, listingsFound: fetchResult.listings.length, listingsImported: created, duplicatesSkipped: duplicates + skippedDupes, searchCriteria: {} }
    return { success: true, portal: importer.portalName, searchUrl, pagesProcessed: fetchResult.pageCount,
      listingsFound: fetchResult.listings.length, listingsImported: created, duplicatesSkipped: duplicates + skippedDupes,
      rejectedInvalid, errors: allErrors, scoreDistribution: dist, averageConfidence: avg, importedListingIds: persistedIds, metadata: meta }
  }
  private deduplicate(listings: ExtractedListing[], known: Set<string>): { unique: ExtractedListing[]; duplicates: number } {
    const seen = new Set<string>(); const unique: ExtractedListing[] = []; let dupes = 0
    for (const l of listings) { const key = l.portalListingId ? l.portal + ':' + l.portalListingId : l.sourceUrl.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, ''); if (seen.has(key) || known.has(l.sourceUrl)) { dupes++; continue } seen.add(key); unique.push(l) }
    return { unique, duplicates: dupes }
  }
  private error(portal: string, searchUrl: string, msg: string): PortalImportResult {
    return { success: false, portal, searchUrl, pagesProcessed: 0, listingsFound: 0, listingsImported: 0, duplicatesSkipped: 0, rejectedInvalid: 0, errors: [msg],
      scoreDistribution: { excellentFit: 0, goodFit: 0, possibleFit: 0, weakFit: 0, reject: 0 }, averageConfidence: 0, importedListingIds: [],
      metadata: { portal, searchUrl, moduleType: 'rent', importedAt: new Date().toISOString(), pagesProcessed: 0, listingsFound: 0, listingsImported: 0, duplicatesSkipped: 0, searchCriteria: {} } }
  }
  private empty(portal: string, searchUrl: string, pages: number, found: number, dupes: number): PortalImportResult {
    return { success: true, portal, searchUrl, pagesProcessed: pages, listingsFound: found, listingsImported: 0, duplicatesSkipped: dupes, rejectedInvalid: 0, errors: [],
      scoreDistribution: { excellentFit: 0, goodFit: 0, possibleFit: 0, weakFit: 0, reject: 0 }, averageConfidence: 0, importedListingIds: [],
      metadata: { portal, searchUrl, moduleType: 'rent', importedAt: new Date().toISOString(), pagesProcessed: pages, listingsFound: found, listingsImported: 0, duplicatesSkipped: dupes, searchCriteria: {} } }
  }
}
export const portalImportEngine = new PortalImportEngine()