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
  modeOrOptions: 'manual' | 'nightly' | { briefId: string; organizationId?: string } = 'manual',
  organizationId?: string,
): Promise<ManualDiscoveryRunResponse> {
  const url = '/api/discovery/run'

  let body: Record<string, unknown>
  if (typeof modeOrOptions === 'object') {
    body = { mode: 'manual', organizationId: modeOrOptions.organizationId ?? organizationId, briefId: modeOrOptions.briefId }
  } else {
    body = { mode: modeOrOptions, organizationId }
  }

  console.info('[discovery] request started', {
    url,
    ...body,
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get('content-type') ?? ''
    const responseText = await response.text()

    console.info('[discovery] response received', {
      url,
      status: response.status,
      contentType,
    })

    if (!contentType.toLowerCase().includes('application/json')) {
      console.error('[discovery] request failed with status', {
        url,
        status: response.status,
        reason: 'non_json_response',
      })
      throw new Error(`Discovery API returned non-JSON response (status ${response.status}). Body: ${responseText || '<empty>'}`)
    }

    let payload: ManualDiscoveryRunResponse
    try {
      payload = JSON.parse(responseText) as ManualDiscoveryRunResponse
    } catch {
      console.error('[discovery] request failed with status', {
        url,
        status: response.status,
        reason: 'invalid_json_response',
      })
      throw new Error(`Discovery API returned invalid JSON (status ${response.status}). Body: ${responseText || '<empty>'}`)
    }

    if (!response.ok || !payload.success) {
      console.error('[discovery] request failed with status', {
        url,
        status: response.status,
        reason: payload.error ?? 'request_failed',
      })
      throw new Error(payload.error ?? `Discovery request failed with status ${response.status}.`)
    }

    return payload
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discovery request failed.'
    console.error('[discovery] request failed with status', {
      url,
      status: 'network_error',
      reason: message,
    })
    throw error
  }
}
