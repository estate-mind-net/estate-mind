/**
 * fetchUrlProxy.ts
 *
 * Fetches external URLs through a server-side proxy to avoid CORS.
 * Used by portal importers (4zida, halooglasi, etc.)
 *
 * In production (Vercel): calls /api/fetch-url
 * In development: falls back to direct fetch (may fail due to CORS)
 */

export interface FetchUrlResult {
  success: boolean
  html: string | null
  status: number
  url: string
  error: string | null
}

const PROXY_ENDPOINT = '/api/fetch-url'

/**
 * Fetch an external URL through the server-side proxy.
 */
export async function fetchUrlProxy(url: string): Promise<FetchUrlResult> {
  console.log('[fetchUrlProxy] Requested URL:', url)
  // Try proxy first
  try {
    const proxyUrl = `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`
    console.log('[fetchUrlProxy] Proxy URL:', proxyUrl)
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) })
    console.log('[fetchUrlProxy] Proxy response status:', response.status)
    const data = await response.json() as FetchUrlResult
    if (data.success && data.html) {
      console.log(`[fetchUrlProxy] Proxy success: ${data.url} | HTML length: ${data.html.length}`)
      return data
    }
    console.warn(`[fetchUrlProxy] Proxy returned failure: status=${data.status} error=${data.error}`)
    // Fall through to direct fetch
  } catch (proxyError) {
    console.warn('[fetchUrlProxy] Proxy unavailable, trying direct fetch:', proxyError)
  }

  // Direct fetch fallback (works in dev if CORS allows)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EstateMind/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      return { success: false, html: null, status: response.status, url, error: `HTTP ${response.status}` }
    }
    const html = await response.text()
    console.log(`[fetchUrlProxy] Direct fetch success: ${url} (${html.length} chars)`)
    return { success: true, html, status: response.status, url, error: null }
  } catch (directError) {
    return {
      success: false, html: null, status: 0, url,
      error: `Both proxy and direct fetch failed. Proxy + direct: ${directError instanceof Error ? directError.message : 'Unknown error'}`,
    }
  }
}
