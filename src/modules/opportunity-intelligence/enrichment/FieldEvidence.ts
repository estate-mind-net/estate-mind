/**
 * FieldEvidence.ts
 * Every extracted field includes provenance for Decision Workspace transparency.
 */

/** Source of extracted data. */
export type FieldSource = 'structured_json' | 'next_data' | 'html_element' | 'description_text' | 'feature_list' | 'url_inference' | 'default'

/** Evidence for a single extracted field. */
export interface FieldEvidence<T = unknown> {
  value: T
  source: FieldSource
  confidence: number // 0-100
  rawText?: string
}

/** Evidence collection for all fields of a listing. */
export interface ListingEvidence {
  title?: FieldEvidence<string>
  price?: FieldEvidence<number>
  currency?: FieldEvidence<string>
  sizeM2?: FieldEvidence<number>
  rooms?: FieldEvidence<number>
  bathrooms?: FieldEvidence<number>
  floor?: FieldEvidence<number>
  buildingFloors?: FieldEvidence<number>
  balcony?: FieldEvidence<boolean>
  terrace?: FieldEvidence<boolean>
  parking?: FieldEvidence<boolean>
  garage?: FieldEvidence<boolean>
  heating?: FieldEvidence<string>
  furnished?: FieldEvidence<boolean>
  pets?: FieldEvidence<boolean>
  elevator?: FieldEvidence<boolean>
  airConditioning?: FieldEvidence<boolean>
  orientation?: FieldEvidence<string>
  condition?: FieldEvidence<string>
  description?: FieldEvidence<string>
  agency?: FieldEvidence<string>
  photos?: FieldEvidence<string[]>
  coordinates?: FieldEvidence<{ lat: number; lng: number }>
  district?: FieldEvidence<string>
  city?: FieldEvidence<string>
  publishedDate?: FieldEvidence<string>
}

/** Calculate evidence coverage as percentage of tracked fields that have values. */
export function calculateEvidenceCoverage(evidence: ListingEvidence): number {
  const trackedFields: (keyof ListingEvidence)[] = [
    'title', 'price', 'sizeM2', 'rooms', 'floor', 'balcony', 'parking',
    'heating', 'furnished', 'elevator', 'description', 'district', 'city',
  ]
  const present = trackedFields.filter((f) => evidence[f] !== undefined).length
  return Math.round((present / trackedFields.length) * 100)
}