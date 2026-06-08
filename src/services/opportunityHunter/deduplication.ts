import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import { buildDedupeKey } from './normalization'

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const titleSimilarity = (a: string, b: string): number => {
  const x = normalize(a)
  const y = normalize(b)
  if (!x || !y) return 0
  if (x === y) return 1

  const xWords = new Set(x.split(' '))
  const yWords = new Set(y.split(' '))
  const intersection = [...xWords].filter((w) => yWords.has(w)).length
  const union = new Set([...xWords, ...yWords]).size
  return union === 0 ? 0 : intersection / union
}

const fuzzyDuplicate = (left: RawOpportunity, right: RawOpportunity): boolean => {
  const priceClose = left.price && right.price ? Math.abs(left.price - right.price) <= Math.max(2500, left.price * 0.03) : false
  const sizeClose = left.size_m2 && right.size_m2 ? Math.abs(left.size_m2 - right.size_m2) <= 8 : false
  const cityEqual = (left.city ?? '').toLowerCase() === (right.city ?? '').toLowerCase()
  const titleClose = titleSimilarity(left.title, right.title) >= 0.72
  return Boolean(titleClose && cityEqual && priceClose && sizeClose)
}

export interface DeduplicationResult {
  canonical: RawOpportunity[]
  duplicates: RawOpportunity[]
}

export const deduplicateRawOpportunities = (items: RawOpportunity[]): DeduplicationResult => {
  const canonical: RawOpportunity[] = []
  const duplicates: RawOpportunity[] = []

  for (const item of items) {
    const dedupeKey = buildDedupeKey(item)
    const enriched = { ...item, dedupe_key: dedupeKey }

    const exact = canonical.find((existing) => existing.dedupe_key === dedupeKey)
    if (exact) {
      duplicates.push({ ...enriched, is_duplicate: true, canonical_raw_opportunity_id: exact.id ?? null })
      continue
    }

    const fuzzy = canonical.find((existing) => fuzzyDuplicate(existing, enriched))
    if (fuzzy) {
      duplicates.push({ ...enriched, is_duplicate: true, canonical_raw_opportunity_id: fuzzy.id ?? null })
      continue
    }

    canonical.push({ ...enriched, is_duplicate: false, canonical_raw_opportunity_id: null })
  }

  return { canonical, duplicates }
}
