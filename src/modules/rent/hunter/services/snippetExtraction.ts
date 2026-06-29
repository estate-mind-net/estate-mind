/**
 * Snippet extraction utilities for rent search results.
 * Conservative regex extraction — never invents values.
 */

export interface ExtractionResult<T> {
  value: T
  confidence: number // 0-1
}

const DISTRICTS: Record<string, string[]> = {
  'Novi Sad': [
    'liman 1', 'liman 2', 'liman 3', 'liman 4',
    'grbavica', 'podbara', 'detelinara', 'novo naselje',
    'stari grad', 'sremska kamenica', 'petrovaradin',
    'telep', 'adice', 'satelit', 'bistrica',
    'sajmište', 'sajmiste', 'bulevar', 'rotkvarija',
  ],
  'Beograd': [
    'novi beograd', 'vračar', 'vracar', 'savski venac', 'savski venac',
    'zemun', 'dorćol', 'dorcol', 'banovo brdo', 'voždovac', 'vozdovac',
    'palilula', 'rakovica', 'čukarica', 'cukarica', 'stari grad',
  ],
}

// Serbian bedroom descriptors
const BEDROOM_MAP: Record<string, number> = {
  'jednosoban': 1,
  'jednoiposoban': 1.5,
  'jedno i po soban': 1.5,
  'dvosoban': 2,
  'dvoiposoban': 2.5,
  'dvo i po soban': 2.5,
  'trosoban': 3,
  'troiposoban': 3.5,
  'tro i po soban': 3.5,
  'četvorosoban': 4,
  'cetvorosoban': 4,
  'petosoban': 5,
}

/**
 * Extract price from text. Supports:
 * - 550€, 550 EUR, 550 evra
 * - €550, EUR 550
 * - 1.500€ (thousand separator)
 */
export function extractPrice(text: string): ExtractionResult<number | null> {
  if (!text) return { value: null, confidence: 0 }

  const patterns = [
    // "550€" or "550 EUR" or "550 evra"
    /([0-9]{1,3}(?:[\.\,\s]?[0-9]{3})*)\s?(?:€|eur|evra)/i,
    // "€550" or "EUR 550"
    /(?:€|eur)\s?([0-9]{1,3}(?:[\.\,\s]?[0-9]{3})*)/i,
    // Standalone number 300-99999 that looks like a rent price
    /\b([3-9][0-9]{2,4})\s?(?:€|eur|evra|mesečno|mesecno|monthly)\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const cleaned = match[1].replace(/[\.\,\s]/g, '')
      const num = Number(cleaned)
      if (Number.isFinite(num) && num >= 50 && num <= 50000) {
        // Higher confidence for explicit currency markers
        const confidence = /€|eur|evra/i.test(match[0]) ? 0.9 : 0.6
        return { value: num, confidence }
      }
    }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract size in m² from text. Supports:
 * - 55m2, 55 m², 55 kv, 55 sqm
 */
export function extractSize(text: string): ExtractionResult<number | null> {
  if (!text) return { value: null, confidence: 0 }

  const patterns = [
    /([0-9]{2,4})\s?(?:m2|m²|kv\.?|sqm|sq\s?m)/i,
    /površ(?:ina|ine)?[:\s]*([0-9]{2,4})\s?(?:m2|m²|kv)?/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const num = Number(match[1])
      if (Number.isFinite(num) && num >= 10 && num <= 1000) {
        return { value: num, confidence: 0.85 }
      }
    }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract bedroom count from text. Supports:
 * - "2 sobe", "3 room", "dvosoban", "trosoban"
 */
export function extractBedrooms(text: string): ExtractionResult<number | null> {
  if (!text) return { value: null, confidence: 0 }

  const lower = text.toLowerCase()

  // Check Serbian bedroom descriptors first (highest confidence)
  for (const [keyword, count] of Object.entries(BEDROOM_MAP)) {
    if (lower.includes(keyword)) {
      return { value: count, confidence: 0.9 }
    }
  }

  // Pattern: "2 sobe", "3 soba", "2-room"
  const match = lower.match(/(\d)\s?(?:sob|stan|room|bed|br\.?\s*soba)/i)
  if (match) {
    const num = Number(match[1])
    if (Number.isFinite(num) && num >= 0 && num <= 10) {
      return { value: num, confidence: 0.7 }
    }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract district from text. Known districts for Novi Sad and Beograd.
 */
export function extractDistrict(text: string, city?: string): ExtractionResult<string | null> {
  if (!text) return { value: null, confidence: 0 }

  const lower = text.toLowerCase()
  const cities = city ? [city] : Object.keys(DISTRICTS)

  for (const c of cities) {
    const districts = DISTRICTS[c]
    if (!districts) continue
    for (const district of districts) {
      if (lower.includes(district)) {
        return {
          value: district.charAt(0).toUpperCase() + district.slice(1),
          confidence: 0.85,
        }
      }
    }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract city from text. Known Serbian cities.
 */
export function extractCity(text: string): ExtractionResult<string | null> {
  if (!text) return { value: null, confidence: 0 }

  const cities = ['novi sad', 'beograd', 'belgrade', 'niš', 'nis', 'subotica', 'kragujevac', 'zrenjanin', 'pančevo', 'pancevo', 'sombor']
  const lower = text.toLowerCase()

  for (const city of cities) {
    if (lower.includes(city)) {
      const normalized = city === 'belgrade' ? 'Beograd' : city.charAt(0).toUpperCase() + city.slice(1)
      return { value: normalized, confidence: 0.8 }
    }
  }

  return { value: null, confidence: 0 }
}