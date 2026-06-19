/**
 * 4zida.rs Manual Text Parser
 *
 * Parses user-pasted visible listing text from 4zida.rs to extract structured rental fields.
 * This is NOT scraping — the user manually copies and pastes text they can already see.
 * The parser is conservative: only extracts fields clearly present in text.
 */

export interface ParsedFourZidaListing {
  title?: string
  city?: string
  district?: string
  monthlyRent?: number
  currency?: string
  sizeM2?: number
  bedrooms?: number
  floor?: number
  furnished?: boolean | null
  parking?: boolean | null
  balcony?: boolean | null
  elevator?: boolean | null
  petsAllowed?: boolean | null
  confidence: number
  extractedFields: string[]
  warnings: string[]
}

// ── Serbian/English apartment type to bedroom count ───────────────
const ROOM_MAP: Record<string, number> = {
  'garsonjera': 0,
  'garsonjeru': 0,
  'studio': 0,
  'jednoiposoban': 1,
  'jednoiposoban stan': 1,
  '1.5-soban': 1,
  '1.5 soban': 1,
  'dvosoban': 2,
  'dvosobni': 2,
  '2-soban': 2,
  '2 soban': 2,
  'dvoiposoban': 2,
  'dvoiposoban stan': 2,
  '2.5-soban': 2,
  '2.5 soban': 2,
  'trosoban': 3,
  'trosobni': 3,
  '3-soban': 3,
  '3 soban': 3,
  'troiposoban': 3,
  '3.5-soban': 3,
  '3.5 soban': 3,
  'četvorosoban': 4,
  'četvorosobni': 4,
  '4-soban': 4,
  '4 soban': 4,
  'petosoban': 5,
  '5-soban': 5,
}

// ── City detection ────────────────────────────────────────────────
const KNOWN_CITIES = [
  'novi sad', 'beograd', 'niš', 'nis', 'kragujevac', 'subotica',
  'zrenjanin', 'pančevo', 'pancevo', 'čačak', 'cacak', 'novi pazar',
  'kraljevo', 'smederevo', 'leskovac', 'užice', 'uzice', 'vranje',
  'valjevo', 'šabac', 'sabac', 'sombor', 'požarevac', 'pozarevac',
]

// ── District patterns for common cities ───────────────────────────
const NOVI_SAD_DISTRICTS = [
  'liman', 'liman 1', 'liman 2', 'liman 3', 'liman 4',
  'grbavica', 'detelinara', 'bistrica', 'podbara', 'stari grad',
  'rotkvarija', 'salajka', 'telep', 'adice', 'novi naselje',
  'sajmište', 'sajmiste', 'avijatičarsko naselje', 'adamovićevo naselje',
  'bul. oslobođenja', 'bul. oslobođenja', 'futoška', 'futoska',
]

const BELGRADE_DISTRICTS = [
  'vračar', 'vracar', 'dorćol', 'dorcol', 'savski venac', 'stari grad',
  'novi beograd', 'zvezdara', 'voždovac', 'vozdovac', 'palilula',
  'rakovica', 'čukarica', 'cukarica', 'banovo brdo', 'medaković',
  'konjarnik', 'banjica', 'žarkovo', 'cerak', 'vidikovac',
  'mirijevo', 'borča', 'borca', 'surčin', 'surcin', 'zemun',
]

// ── Helpers ───────────────────────────────────────────────────────

function extractRent(text: string): { rent: number; currency: string } | null {
  // Match patterns like "550€", "550 €", "€550", "550 EUR", "EUR 550", "550 evra", "550e"
  const patterns = [
    /(\d[\d.,]*)\s*€/,
    /€\s*(\d[\d.,]*)/,
    /(\d[\d.,]*)\s*eur(?:o|a)?/i,
    /(\d[\d.,]*)\s*evra?/i,
    /(\d[\d.,]*)\s*e\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const numStr = match[1].replace(/\./g, '').replace(',', '.')
      const num = parseFloat(numStr)
      if (num > 0 && num < 50000) {
        return { rent: num, currency: 'EUR' }
      }
    }
  }

  // Try RSD
  const rsdMatch = text.match(/(\d[\d.,]*)\s*(?:rsd|din(?:ara)?|din)/i)
  if (rsdMatch) {
    const numStr = rsdMatch[1].replace(/\./g, '').replace(',', '.')
    const num = parseFloat(numStr)
    if (num > 0 && num < 5000000) {
      return { rent: num, currency: 'RSD' }
    }
  }

  return null
}

function extractSize(text: string): number | null {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*m2/i,
    /(\d+(?:[.,]\d+)?)\s*m²/,
    /(\d+(?:[.,]\d+)?)\s*kv(?:adratnih)?(?:a)?(?:\s|$|\.)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      if (num > 5 && num < 5000) {
        return num
      }
    }
  }

  return null
}

function extractBedrooms(text: string): number | null {
  const lower = text.toLowerCase()

  // Check Serbian apartment type names
  for (const [term, rooms] of Object.entries(ROOM_MAP)) {
    if (lower.includes(term)) {
      return rooms
    }
  }

  // Check "X soba" / "X sobe"
  const sobaMatch = lower.match(/(\d+)\s*sob(?:a|e|ni)?\b/)
  if (sobaMatch) {
    const num = parseInt(sobaMatch[1], 10)
    if (num >= 0 && num <= 10) return num
  }

  // Check "X-bedroom"
  const bedMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|spavać(?:e)?)\b/)
  if (bedMatch) {
    const num = parseInt(bedMatch[1], 10)
    if (num >= 0 && num <= 10) return num
  }

  return null
}

function extractFloor(text: string): number | null {
  const lower = text.toLowerCase()

  if (lower.includes('prizemlje') || lower.includes('ground floor')) return 0
  if (lower.includes('potkrovlje') || lower.includes('attic')) return 99 // sentinel for top floor

  const patterns = [
    /sprat[:\s]*(\d+)/i,
    /(\d+)\s*sprat/i,
    /floor[:\s]*(\d+)/i,
    /(\d+)\s*(?:st|nd|rd|th)?\s*floor/i,
    /(\d+)\s*\./,
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= 0 && num <= 50) return num
    }
  }

  return null
}

function extractCity(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const city of KNOWN_CITIES) {
    // Match whole word
    const regex = new RegExp(`\\b${city}\\b`, 'i')
    if (regex.test(lower)) {
      return city.charAt(0).toUpperCase() + city.slice(1)
    }
  }
  return undefined
}

function extractDistrict(text: string, city?: string): string | undefined {
  const lower = text.toLowerCase()

  const districts = city?.toLowerCase().includes('novi sad')
    ? NOVI_SAD_DISTRICTS
    : city?.toLowerCase().includes('beograd')
      ? BELGRADE_DISTRICTS
      : [...NOVI_SAD_DISTRICTS, ...BELGRADE_DISTRICTS]

  for (const district of districts) {
    const regex = new RegExp(`\\b${district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(lower)) {
      // Capitalize first letter of each word
      return district.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  return undefined
}

function extractBoolean(text: string, positiveTerms: string[], negativeTerms: string[]): boolean | null {
  const lower = text.toLowerCase()

  const hasPositive = positiveTerms.some((t) => lower.includes(t))
  const hasNegative = negativeTerms.some((t) => lower.includes(t))

  if (hasPositive && !hasNegative) return true
  if (hasNegative && !hasPositive) return false
  if (hasPositive && hasNegative) return null // ambiguous
  return null // not mentioned
}

// ── Main parser ───────────────────────────────────────────────────

export function parse4zidaRentalText(text: string): ParsedFourZidaListing {
  const extractedFields: string[] = []
  const warnings: string[] = []
  let confidencePoints = 0
  let totalPossible = 0

  if (!text || text.trim().length < 10) {
    return {
      confidence: 0,
      extractedFields: [],
      warnings: ['Text is too short to parse.'],
    }
  }

  // ── Title ──
  let title: string | undefined
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length > 0) {
    // First non-empty line is often the title
    const firstLine = lines[0]
    if (firstLine.length > 5 && firstLine.length < 200) {
      title = firstLine
      extractedFields.push('title')
      confidencePoints += 1
    }
  }
  totalPossible += 1

  // ── Rent ──
  const rentResult = extractRent(text)
  let monthlyRent: number | undefined
  let currency: string | undefined
  if (rentResult) {
    monthlyRent = rentResult.rent
    currency = rentResult.currency
    extractedFields.push('monthlyRent', 'currency')
    confidencePoints += 2
  }
  totalPossible += 2

  // ── Size ──
  const sizeM2 = extractSize(text) ?? undefined
  if (sizeM2 != null) {
    extractedFields.push('sizeM2')
    confidencePoints += 2
  }
  totalPossible += 2

  // ── Bedrooms ──
  const bedrooms = extractBedrooms(text) ?? undefined
  if (bedrooms != null) {
    extractedFields.push('bedrooms')
    confidencePoints += 2
  }
  totalPossible += 2

  // ── City ──
  const city = extractCity(text)
  if (city) {
    extractedFields.push('city')
    confidencePoints += 1
  }
  totalPossible += 1

  // ── District ──
  const district = extractDistrict(text, city)
  if (district) {
    extractedFields.push('district')
    confidencePoints += 1
  }
  totalPossible += 1

  // ── Floor ──
  const floor = extractFloor(text) ?? undefined
  if (floor != null) {
    extractedFields.push('floor')
    confidencePoints += 1
  }
  totalPossible += 1

  // ── Amenities ──
  const furnished = extractBoolean(
    text,
    ['namešten', 'namesten', 'furnished', 'namešten stan', 'kompletno namešten'],
    ['nenamešten', 'nenamesten', 'prazan', 'unfurnished', 'prazan stan', 'bez nameštaja'],
  )
  if (furnished != null) {
    extractedFields.push('furnished')
    confidencePoints += 1
  }
  totalPossible += 1

  const parking = extractBoolean(
    text,
    ['parking', 'garaža', 'garaza', 'parking mesto', 'parking space'],
    ['bez parkinga', 'no parking', 'nema parking'],
  )
  if (parking != null) {
    extractedFields.push('parking')
    confidencePoints += 1
  }
  totalPossible += 1

  const balcony = extractBoolean(
    text,
    ['terasa', 'balkon', 'terrace', 'balcony', 'lođa', 'lodja'],
    ['bez terase', 'bez balkona', 'no balcony', 'nema terasu'],
  )
  if (balcony != null) {
    extractedFields.push('balcony')
    confidencePoints += 1
  }
  totalPossible += 1

  const elevator = extractBoolean(
    text,
    ['lift', 'elevator', 'ima lift'],
    ['bez lifta', 'no elevator', 'nema lift', 'nema lifta'],
  )
  if (elevator != null) {
    extractedFields.push('elevator')
    confidencePoints += 1
  }
  totalPossible += 1

  const petsAllowed = extractBoolean(
    text,
    ['ljubimci', 'pet friendly', 'pets allowed', 'kućni ljubimci', 'kucni ljubimci', 'dozvoljeni ljubimci'],
    ['bez ljubimaca', 'no pets', 'nije dozvoljeno', 'zabranjeni ljubimci'],
  )
  if (petsAllowed != null) {
    extractedFields.push('petsAllowed')
    confidencePoints += 1
  }
  totalPossible += 1

  // ── Warnings ──
  if (rentResult && rentResult.rent < 100) {
    warnings.push('Rent seems unusually low — verify the amount.')
  }
  if (rentResult && rentResult.rent > 3000) {
    warnings.push('Rent seems unusually high — verify the amount.')
  }
  if (sizeM2 != null && sizeM2 < 10) {
    warnings.push('Size seems unusually small — verify.')
  }
  if (furnished === null) {
    const lower = text.toLowerCase()
    if (lower.includes('namešten') || lower.includes('namesten')) {
      warnings.push('Furnished status is ambiguous — both positive and negative terms found.')
    }
  }

  // ── Confidence ──
  const confidence = totalPossible > 0
    ? Math.round((confidencePoints / totalPossible) * 100)
    : 0

  return {
    title,
    city,
    district,
    monthlyRent,
    currency,
    sizeM2,
    bedrooms,
    floor,
    furnished,
    parking,
    balcony,
    elevator,
    petsAllowed,
    confidence,
    extractedFields,
    warnings,
  }
}