/**
 * Manual URL Rent Extractor
 *
 * When a user provides a listing URL, we create a placeholder RawOpportunity
 * with needs_manual_completion=true. No scraping or AI — the user fills in details manually.
 */

import type { RawOpportunity } from '@/lib/types/opportunityHunter'

export interface ManualUrlExtractResult {
  rawOpportunity: Partial<RawOpportunity>
  needsManualCompletion: boolean
}

/**
 * Extract a placeholder RawOpportunity from a user-provided listing URL.
 * Does NOT scrape — returns a skeleton that the user must complete manually.
 */
export function extractFromManualUrl(url: string): ManualUrlExtractResult {
  // Try to infer a title from the URL hostname
  let domain = ''
  try {
    const parsed = new URL(url)
    domain = parsed.hostname.replace(/^www\./, '')
  } catch {
    domain = 'Unknown source'
  }

  return {
    rawOpportunity: {
      title: `Listing from ${domain}`,
      source_url: url,
      city: null,
      district: null,
      price: null,
      currency: 'EUR',
      size_m2: null,
      bedrooms: null,
      property_type: 'rental',
      raw_payload: {
        needs_manual_completion: true,
        source_domain: domain,
      },
    },
    needsManualCompletion: true,
  }
}