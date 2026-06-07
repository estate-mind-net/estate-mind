export default function handler(
  req: { method?: string },
  res: { status: (code: number) => { json: (payload: unknown) => void } },
): void {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' })
    return
  }

  res.status(200).json({ ok: true, message: 'deal-analysis function alive' })
}
