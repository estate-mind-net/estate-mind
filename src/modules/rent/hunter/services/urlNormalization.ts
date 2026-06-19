/**
 * URL Normalization for duplicate listing detection.
 *
 * Rules:
 * - Trim whitespace
 * - Remove trailing slash
 * - Remove hash fragments (#...)
 * - Remove tracking params: utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid
 * - Lowercase protocol + host
 * - Preserve path and non-tracking query params
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
])

/**
 * Normalize a listing URL for comparison purposes.
 * Returns the normalized URL string, or the original trimmed string if parsing fails.
 */
export function normalizeListingUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)

    // Lowercase protocol and host
    parsed.protocol = parsed.protocol.toLowerCase()
    parsed.hostname = parsed.hostname.toLowerCase()

    // Remove hash
    parsed.hash = ''

    // Remove tracking params
    const params = new URLSearchParams(parsed.search)
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        params.delete(key)
      }
    }
    parsed.search = params.toString() ? `?${params.toString()}` : ''

    // Remove trailing slash from pathname (but keep root "/")
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }

    return parsed.toString()
  } catch {
    // If URL parsing fails, return trimmed original
    return trimmed.replace(/\/+$/, '')
  }
}

/**
 * Check if two URLs are equivalent after normalization.
 */
export function urlsEquivalent(a: string, b: string): boolean {
  return normalizeListingUrl(a) === normalizeListingUrl(b)
}