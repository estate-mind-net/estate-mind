/**
 * ListingEnrichmentEngine.ts
 * Downloads listing detail pages and enriches them with structured data.
 * Supports concurrent downloads with configurable limits.
 */

import type { ListingParser } from './ListingParser'
import type { RawListing } from './RawListing'
import type { EnrichedListing } from './EnrichedListing'
import type { EnrichmentResult, BatchEnrichmentResult, EnrichmentProgress } from './EnrichmentResult'
import type { ExtractedListing } from '../import/PortalImporter'
import { FourZidaListingParser } from './connectors/FourZidaListingParser'
import { fetchUrlProxy } from '@/lib/fetchUrlProxy'

type ProgressCallback = (progress: EnrichmentProgress) => void

interface EnrichmentConfig {
  concurrency: number
  delayBetweenMs: number
  timeoutMs: number
}

const DEFAULT_CONFIG: EnrichmentConfig = {
  concurrency: 5,
  delayBetweenMs: 200,
  timeoutMs: 15000,
}

export class ListingEnrichmentEngine {
  private parsers: ListingParser[] = [new FourZidaListingParser()]

  registerParser(parser: ListingParser): void {
    this.parsers.push(parser)
  }

  async enrichListing(url: string, html?: string): Promise<EnrichmentResult> {
    const start = Date.now()
    const parser = this.parsers.find((p) => p.canHandle(url))
    if (!parser) return { success: false, rawListing: this.emptyRaw(url), enrichedListing: null, error: 'No parser for URL', parserUsed: 'none', downloadTimeMs: 0, parseTimeMs: 0 }

    let fetchedHtml = html
    let downloadTime = 0
    if (!fetchedHtml) {
      const dlStart = Date.now()
      try {
        const result = await fetchUrlProxy(url)
        if (!result.success || !result.html) return { success: false, rawListing: this.emptyRaw(url), enrichedListing: null, error: result.error ?? `HTTP ${result.status}`, parserUsed: parser.portalId, downloadTimeMs: Date.now() - dlStart, parseTimeMs: 0 }
        fetchedHtml = result.html
        downloadTime = Date.now() - dlStart
        console.log(`[ListingEnrichmentEngine] Fetched via proxy: ${url} htmlLength=${fetchedHtml.length}`)
      } catch (e) { return { success: false, rawListing: this.emptyRaw(url), enrichedListing: null, error: e instanceof Error ? e.message : 'Download failed', parserUsed: parser.portalId, downloadTimeMs: Date.now() - dlStart, parseTimeMs: 0 } }
    }

    const parseStart = Date.now()
    const raw: RawListing = { id: `raw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, portal: parser.portalId, portalListingId: null, listingUrl: url, rawHtml: fetchedHtml, rawJson: null, rawImages: [], importedOn: new Date().toISOString(), searchSourceId: null }
    const enriched = parser.parse(fetchedHtml, url)
    const parseTime = Date.now() - parseStart

    return { success: enriched !== null, rawListing: raw, enrichedListing: enriched, error: enriched ? null : 'Parsing returned null', parserUsed: parser.portalId, downloadTimeMs: downloadTime, parseTimeMs: parseTime }
  }

  async enrichBatch(listings: ExtractedListing[], config: Partial<EnrichmentConfig> = {}, onProgress?: ProgressCallback): Promise<BatchEnrichmentResult> {
    const merged = { ...DEFAULT_CONFIG, ...config }
    const start = Date.now()
    const results: EnrichmentResult[] = []
    const errors: Array<{ url: string; error: string }> = []
    let totalCoverage = 0

    // Process in batches
    for (let i = 0; i < listings.length; i += merged.concurrency) {
      const batch = listings.slice(i, i + merged.concurrency)
      onProgress?.({ phase: 'downloading', current: i, total: listings.length, message: `Downloading details ${i + 1}-${Math.min(i + merged.concurrency, listings.length)} / ${listings.length}` })

      const batchResults = await Promise.allSettled(batch.map((l) => this.enrichListing(l.sourceUrl)))
      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j]
        if (r.status === 'fulfilled') {
          results.push(r.value)
          if (r.value.enrichedListing) totalCoverage += r.value.enrichedListing.evidenceCoverage
          if (r.value.error) errors.push({ url: batch[j].sourceUrl, error: r.value.error })
        } else {
          errors.push({ url: batch[j].sourceUrl, error: r.reason instanceof Error ? r.reason.message : 'Unknown error' })
          results.push({ success: false, rawListing: this.emptyRaw(batch[j].sourceUrl), enrichedListing: null, error: 'Promise rejected', parserUsed: 'none', downloadTimeMs: 0, parseTimeMs: 0 })
        }
      }

      if (i + merged.concurrency < listings.length && merged.delayBetweenMs > 0) {
        await new Promise((r) => setTimeout(r, merged.delayBetweenMs))
      }
    }

    const enrichedCount = results.filter((r) => r.success).length
    const avgCoverage = enrichedCount > 0 ? Math.round(totalCoverage / enrichedCount) : 0

    return { totalListings: listings.length, enrichedCount, failedCount: listings.length - enrichedCount, results, errors, totalTimeMs: Date.now() - start, averageEvidenceCoverage: avgCoverage }
  }

  private emptyRaw(url: string): RawListing {
    return { id: `raw-empty-${Date.now()}`, portal: 'unknown', portalListingId: null, listingUrl: url, rawHtml: null, rawJson: null, rawImages: [], importedOn: new Date().toISOString(), searchSourceId: null }
  }
}

export const listingEnrichmentEngine = new ListingEnrichmentEngine()