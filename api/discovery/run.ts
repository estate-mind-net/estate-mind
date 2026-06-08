import { handleDiscoveryRunHttp } from '../../src/lib/server/discoveryRunHandler'

type JsonResponder = { status: (code: number) => { json: (payload: unknown) => void } }

type NodeLikeRequest = {
  method?: string
  body?: unknown
}

export default async function handler(req: NodeLikeRequest, res: JsonResponder): Promise<void> {
  console.log('[DISCOVERY ROUTE HIT]', {
    runtime: 'vercel-api',
    method: req.method ?? 'UNKNOWN',
  })
  const { status, body } = await handleDiscoveryRunHttp(req.method, req.body)
  res.status(status).json(body)
}
