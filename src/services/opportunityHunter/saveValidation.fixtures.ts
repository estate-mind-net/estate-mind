import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import { validateRawOpportunityForSave } from './saveValidation'

type SaveValidationFixture = {
  name: string
  input: RawOpportunity
  expectedAccepted: boolean
  expectedReasonIncludes?: string
}

const base: RawOpportunity = {
  title: 'Stan 35m2 Novi Sad 82.000 EUR',
  source_url: 'https://www.4zida.rs/prodaja-stanova/novi-sad/id-123456',
  city: 'Novi Sad',
  price: 82000,
  currency: 'EUR',
  size_m2: 35,
  property_type: 'apartment',
}

export const saveValidationFixtures: SaveValidationFixture[] = [
  {
    name: '4Zida valid listing with Agencija in title is accepted',
    input: {
      ...base,
      title: 'Stan 35m2 Novi Sad 82.000 EUR Agencija',
      source_url: 'https://www.4zida.rs/prodaja-stanova/novi-sad/id-123456',
    },
    expectedAccepted: true,
  },
  {
    name: 'Estitor agency URL is rejected',
    input: {
      ...base,
      title: 'Agency profile',
      source_url: 'https://estitor.com/agency/alpha-real-estate',
      city: 'Belgrade',
    },
    expectedAccepted: false,
    expectedReasonIncludes: 'rejected_agency_url',
  },
  {
    name: 'Estitor category page is rejected',
    input: {
      ...base,
      title: 'Belgrade listings',
      source_url: 'https://estitor.com/municipality/vracar/listings',
      city: 'Belgrade',
    },
    expectedAccepted: false,
    expectedReasonIncludes: 'rejected_estitor_category_or_municipality_page',
  },
  {
    name: 'Missing price is rejected',
    input: {
      ...base,
      source_url: 'https://estitor.com/id-567785',
      title: 'Stan 35m2 Novi Sad',
      price: 0,
    },
    expectedAccepted: false,
    expectedReasonIncludes: 'rejected_missing_price',
  },
]

export const runSaveValidationFixtures = () => {
  return saveValidationFixtures.map((fixture) => {
    const result = validateRawOpportunityForSave(fixture.input)
    const passedAcceptance = result.accepted === fixture.expectedAccepted
    const passedReason = fixture.expectedReasonIncludes
      ? result.reasons.includes(fixture.expectedReasonIncludes)
      : true

    return {
      name: fixture.name,
      passed: passedAcceptance && passedReason,
      result,
    }
  })
}
