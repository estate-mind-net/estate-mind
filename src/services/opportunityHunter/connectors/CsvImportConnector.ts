import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

type CsvRecord = Record<string, string>

const toNumber = (value: string | undefined): number | null => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const parseCsv = (content: string): CsvRecord[] => {
  const rows = content.split(/\r?\n/).map((row) => row.trim()).filter(Boolean)
  if (rows.length < 2) return []

  const headers = rows[0].split(',').map((h) => h.trim().toLowerCase())
  return rows.slice(1).map((row) => {
    const cols = row.split(',').map((c) => c.trim())
    return headers.reduce<CsvRecord>((acc, header, index) => {
      acc[header] = cols[index] ?? ''
      return acc
    }, {})
  })
}

export class CsvImportConnector implements OpportunityConnector {
  name = 'CsvImportConnector'
  type = 'csv_import'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const config = input.source.connector_config
    const csvContent = typeof config.csv_content === 'string' ? config.csv_content : ''
    const records = parseCsv(csvContent)

    return records.map((record, index) => ({
      source_id: input.source.id,
      external_id: record.external_id || `csv-${index}`,
      source_url: record.source_url || null,
      title: record.title || `Imported CSV opportunity ${index + 1}`,
      description: record.description || null,
      country: record.country || null,
      city: record.city || null,
      district: record.district || null,
      price: toNumber(record.price),
      currency: record.currency || input.brief.currency || 'EUR',
      size_m2: toNumber(record.size_m2),
      bedrooms: toNumber(record.bedrooms),
      property_type: record.property_type || null,
      raw_payload: {
        origin: 'csv_import',
        row: record,
      },
    }))
  }
}
