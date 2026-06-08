export interface ManualDiscoveryRunResponse {
  success: boolean
  message?: string
  matchesFound?: number
  summary?: {
    organizationId: string
    mode: string
    totalRuns: number
    totalFetched: number
    totalInserted: number
    totalDeduplicated: number
    totalMatched: number
    failedRuns: number
  }
  results?: unknown[]
  error?: string
}

export async function triggerDiscoveryRun(
  mode: 'manual' | 'nightly' = 'manual',
  organizationId?: string,
): Promise<ManualDiscoveryRunResponse> {
  const url = new URL('/api/discovery/run', window.location.origin).toString()

  console.info('[discovery] request', {
    url,
    mode,
    organizationId: organizationId ?? 'none',
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode, organizationId }),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const responseText = await response.text()

  console.info('[discovery] response', {
    url,
    status: response.status,
    contentType,
    body: responseText,
  })

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Discovery API returned non-JSON response (status ${response.status}). Body: ${responseText || '<empty>'}`)
  }

  let payload: ManualDiscoveryRunResponse
  try {
    payload = JSON.parse(responseText) as ManualDiscoveryRunResponse
  } catch {
    throw new Error(`Discovery API returned invalid JSON (status ${response.status}). Body: ${responseText || '<empty>'}`)
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `Discovery request failed with status ${response.status}.`)
  }

  return payload
}
