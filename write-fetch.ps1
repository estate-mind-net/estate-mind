$file = 'c:\CODE\ESTATEMIND\estatemind\api\fetch-url.ts'
$content = @'
/**
 * /api/fetch-url
 *
 * Server-side proxy for fetching external URLs.
 * Avoids CORS issues when importing from portals like 4zida.rs.
 *
 * Usage: GET /api/fetch-url?url=<encodeURIComponent(url)>
 */

type JsonResponder = {
  status: (code: number) => { json: (payload: unknown) => void }
}
type VercelRequest = {
  method?: string
  url?: string
  query?: Record<string, string | string[]>
}

const ALLOWED_HOSTS = [
  '4zida.rs', 'www.4zida.rs',
  'halooglasi.com', 'www.halooglasi.com',
  'cityexpert.rs', 'www.cityexpert.rs',
  'nekretnine.rs', 'www.nekretnine.rs',
]

function log(msg: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString()
  if (data) console.log(`[fetch-url ${ts}] ${msg}`, JSON.stringify(data))
  else console.log(`[fetch-url ${ts}] ${msg}`)
}

function extractTargetUrl(req: VercelRequest): string | null {
  const fromQuery = req.query?.url
  if (fromQuery) {
    if (typeof fromQuery === 'string') return fromQuery
    if (Array.isArray(fromQuery) && fromQuery.length > 0) return fromQuery[0]
  }
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost')
      const param = parsed.searchParams.get('url')
      if (param) return param
    } catch {
      const qIndex = req.url.indexOf('?')
      if (qIndex >= 0) {
        const qs = new URLSearchParams(req.url.slice(qIndex + 1))
        const param = qs.get('url')
        if (param) return param
      }
    }
  }
  return null
}

function isAllowedHost(targetUrl: string): { allowed: boolean; hostname: string; error?: string } {
  let parsed: URL
  try { parsed = new URL(targetUrl) } catch { return { allowed: false, hostname: '', error: 'Invalid URL format.' } }
  const hostname = parsed.hostname.toLowerCase()
  const allowed = ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))
  return { allowed, hostname, error: allowed ? undefined : 'Host "' + hostname + '" not allowed.' }
}
'@
[System.IO.File]::WriteAllText($file, $content)
Write-Output 'Part 1 written'
