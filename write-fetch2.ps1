$file = 'c:\CODE\ESTATEMIND\estatemind\api\fetch-url.ts'
$p2 = @'

export default async function handler(req: VercelRequest, res: JsonResponder): Promise<void> {
  if (req.method !== 'GET') {
    log('Rejected: non-GET', { method: req.method })
    res.status(405).json({ success: false, error: 'Method not allowed. Use GET.', status: 405 })
    return
  }

  const rawUrl = extractTargetUrl(req)
  if (!rawUrl) {
    log('Rejected: missing url')
    res.status(400).json({ success: false, error: 'Missing url parameter.', status: 400 })
    return
  }

  const targetUrl = rawUrl
  const { allowed, hostname, error: hostError } = isAllowedHost(targetUrl)
  log('Request', { target: targetUrl.slice(0, 200), hostname, allowed })

  if (!allowed) {
    log('Rejected', { hostname })
    res.status(403).json({ success: false, error: hostError ?? 'Host not allowed.', url: targetUrl, status: 403 })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => { log('Timeout', { hostname }); controller.abort() }, 20000)

  try {
    log('Fetching', { hostname })
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!response.ok) {
      log('HTTP error', { status: response.status, hostname })
      res.status(200).json({ success: false, html: null, status: response.status, url: targetUrl, error: 'HTTP ' + response.status })
      return
    }

    const contentType = response.headers.get('content-type') ?? 'unknown'
    const html = await response.text()
    const htmlLength = html.length
    log('Success', { hostname, status: response.status, htmlLength })

    res.status(200).json({ success: true, html, status: response.status, url: targetUrl, contentType, htmlLength })
  } catch (error) {
    clearTimeout(timeout)
    const message = error instanceof Error ? error.message : 'Fetch failed'
    const isAbort = message.includes('abort') || message.includes('timeout')
    log('Error', { hostname, error: message })
    res.status(200).json({ success: false, html: null, status: 0, url: targetUrl, error: isAbort ? 'Request timed out after 20 seconds.' : message })
  }
}
'@
[System.IO.File]::AppendAllText($file, $p2)
Write-Output 'Part 2 appended'
