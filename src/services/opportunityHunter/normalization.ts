import type { RawOpportunity } from '@/lib/types/opportunityHunter'

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeRawOpportunity = (item: RawOpportunity): RawOpportunity => {
  const title = (item.title || '').trim() || 'Untitled opportunity'
  const sourceUrl = item.source_url?.trim() || null
  const city = item.city?.trim() || null
  const propertyType = item.property_type?.trim().toLowerCase() || null
  const price = toNumber(item.price)
  const size = toNumber(item.size_m2)

  return {
    ...item,
    title,
    source_url: sourceUrl,
    city,
    property_type: propertyType,
    price,
    size_m2: size,
    normalized_payload: {
      ...item.normalized_payload,
      normalizedAt: new Date().toISOString(),
      title,
      sourceUrl,
      city,
      propertyType,
      price,
      size,
    },
  }
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '-')

export const buildDedupeKey = (item: RawOpportunity): string => {
  if (item.source_url) return `url:${item.source_url.toLowerCase()}`
  if (item.external_id && item.source_id) return `external:${item.source_id}:${item.external_id.toLowerCase()}`

  const title = slug(item.title)
  const city = slug(item.city ?? 'na')
  const price = item.price ? Math.round(item.price / 1000) * 1000 : 0
  const size = item.size_m2 ? Math.round(item.size_m2) : 0
  return `fuzzy:${title}:${city}:${price}:${size}`
}
