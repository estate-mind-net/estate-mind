import { handleDiscoveryRunHttp } from '../../src/lib/server/discoveryRunHandler'

type JsonResponder = { status: (code: number) => { json: (payload: unknown) => void } }

type NodeLikeRequest = {
  method?: string
  body?: unknown
}

export default async function handler(req: NodeLikeRequest, res: JsonResponder): Promise<void> {
  try {
    console.log('[DISCOVERY ROUTE HIT]', {
      runtime: 'vercel-api',
      method: req.method ?? 'UNKNOWN',
    })

    const { status, body } = await handleDiscoveryRunHttp(req.method, req.body)
    res.status(status).json(body)
  } catch (error) {
    console.error('[DISCOVERY ERROR]', error)
    const isDevelopment = process.env.NODE_ENV !== 'production'
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Discovery run failed.',
      ...(isDevelopment && error instanceof Error ? { stack: error.stack ?? '' } : {}),
    })
  }
}
