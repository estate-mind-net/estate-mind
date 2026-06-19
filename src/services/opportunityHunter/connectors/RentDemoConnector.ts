/**
 * RentDemoConnector
 *
 * Generates sample rental listings for Novi Sad districts.
 * Used for testing the Rent Hunter matching pipeline without external data sources.
 *
 * No scraping, no AI — pure synthetic data based on brief criteria.
 */

import type { OpportunityConnector, ConnectorInput } from '../types'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

const NOVI_SAD_DISTRICTS = [
  { name: 'Liman', baseRent: 550, sizeRange: [40, 75] as [number, number] },
  { name: 'Grbavica', baseRent: 500, sizeRange: [38, 70] as [number, number] },
  { name: 'Podbara', baseRent: 450, sizeRange: [35, 65] as [number, number] },
  { name: 'Detelinara', baseRent: 480, sizeRange: [40, 72] as [number, number] },
  { name: 'Center', baseRent: 650, sizeRange: [35, 80] as [number, number] },
  { name: 'Sajmište', baseRent: 420, sizeRange: [38, 68] as [number, number] },
  { name: 'Adamovićevo Naselje', baseRent: 400, sizeRange: [42, 75] as [number, number] },
  { name: 'Bulevar', baseRent: 600, sizeRange: [40, 70] as [number, number] },
]

const FEATURE_COMBOS = [
  { furnished: true, parking: false, balcony: true, elevator: true, petsAllowed: true, floor: 2 },
  { furnished: false, parking: true, balcony: false, elevator: false, petsAllowed: false, floor: 4 },
  { furnished: true, parking: true, balcony: true, elevator: true, petsAllowed: false, floor: 3 },
  { furnished: true, parking: false, balcony: false, elevator: true, petsAllowed: true, floor: 5 },
  { furnished: false, parking: false, balcony: true, elevator: false, petsAllowed: true, floor: 1 },
  { furnished: true, parking: true, balcony: true, elevator: false, petsAllowed: false, floor: 2 },
  { furnished: false, parking: false, balcony: false, elevator: true, petsAllowed: false, floor: 6 },
  { furnished: true, parking: false, balcony: true, elevator: true, petsAllowed: false, floor: 4 },
]

const CONTACT_NAMES = [
  'Marko', 'Jelena', 'Nikola', 'Ana', 'Stefan', 'Milica', 'Dragan', 'Ivana',
]

const CONTACT_PHONES = [
  '+381 64 123 4567', '+381 63 987 6543', '+381 65 555 1234', '+381 62 444 9876',
]

export class RentDemoConnector implements OpportunityConnector {
  name = 'RentDemoConnector'
  type = 'rent_demo'

  async fetchOpportunities(input: ConnectorInput): Promise<RawOpportunity[]> {
    const brief = input.brief
    const sourceId = input.source.id
    const orgId = input.brief.organization_id

    // Filter districts to match brief if possible, otherwise use all
    const briefDistricts = brief.districts.length > 0
      ? brief.districts.map((d) => d.toLowerCase())
      : []

    const matchingDistricts = NOVI_SAD_DISTRICTS.filter(
      (d) => briefDistricts.length === 0 || briefDistricts.includes(d.name.toLowerCase()),
    )

    // If no matching districts, use all
    const districts = matchingDistricts.length > 0 ? matchingDistricts : NOVI_SAD_DISTRICTS

    const currency = brief.currency ?? 'EUR'
    const listings: RawOpportunity[] = []

    // Generate 6-8 listings across districts
    const count = Math.min(districts.length * 1 + 2, 8)

    for (let i = 0; i < count; i++) {
      const district = districts[i % districts.length]
      const features = FEATURE_COMBOS[i % FEATURE_COMBOS.length]
      const bedrooms = (i % 3) + 1 // 1, 2, or 3
      const sizeM2 = Math.round(
        district.sizeRange[0] + Math.random() * (district.sizeRange[1] - district.sizeRange[0]),
      )
      const rentVariation = Math.round((Math.random() - 0.5) * 100) // ±50
      const monthlyRent = district.baseRent + rentVariation + (bedrooms - 1) * 80
      const contactName = CONTACT_NAMES[i % CONTACT_NAMES.length]
      const contactPhone = CONTACT_PHONES[i % CONTACT_PHONES.length]

      listings.push({
        organization_id: orgId,
        source_id: sourceId,
        external_id: `rent-demo-${sourceId}-${i + 1}`,
        source_url: `https://demo-rent.local/novi-sad/${district.name.toLowerCase().replace(/\s+/g, '-')}/${i + 1}`,
        title: `${district.name} — ${bedrooms}BR apartment, ${sizeM2}m²`,
        description: `Demo rental listing in ${district.name}, Novi Sad. ${features.furnished ? 'Furnished' : 'Unfurnished'}. ${features.balcony ? 'Balcony.' : ''} ${features.parking ? 'Parking available.' : ''} ${features.elevator ? 'Elevator.' : ''} ${features.petsAllowed ? 'Pets allowed.' : ''}`,
        country: 'Serbia',
        city: 'Novi Sad',
        district: district.name,
        price: monthlyRent,
        currency,
        size_m2: sizeM2,
        bedrooms,
        property_type: 'apartment',
        raw_payload: {
          origin: 'rent_demo',
          monthlyRent,
          furnished: features.furnished,
          parking: features.parking,
          balcony: features.balcony,
          elevator: features.elevator,
          petsAllowed: features.petsAllowed,
          floor: features.floor,
          contactName,
          contactPhone,
        },
        normalized_payload: {
          monthlyRent,
          furnished: features.furnished,
          parking: features.parking,
          balcony: features.balcony,
          elevator: features.elevator,
          petsAllowed: features.petsAllowed,
          floor: features.floor,
          contactName,
          contactPhone,
        },
      })
    }

    return listings
  }
}