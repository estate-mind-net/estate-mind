import type { RentalApartment, RentPreferences, RentRecommendation } from '../types'
import { scoreRentalApartment } from './rentScoring'

export interface RentAnalysisResult {
  executiveSummary: string
  priceAssessment: string
  locationAssessment: string
  coupleSuitability: string
  remoteWorkSuitability: string
  comfortRisks: string[]
  keyPros: string[]
  keyCons: string[]
  missingInformation: string[]
  confidenceScore: number
  recommendation: RentRecommendation
}

export function generateRentAnalysis(apartment: RentalApartment, preferences: RentPreferences): RentAnalysisResult {
  const scoreResult = scoreRentalApartment(apartment, preferences)
  const { recommendation, score, breakdown } = scoreResult

  const keyPros: string[] = []
  const keyCons: string[] = []
  const missingInformation: string[] = []
  const comfortRisks: string[] = []

  // Price assessment
  const rentPerM2 = apartment.monthlyRent / apartment.sizeM2
  const priceAssessment = buildPriceAssessment(apartment, preferences, rentPerM2, breakdown.budgetFit)

  // Location assessment
  const locationAssessment = buildLocationAssessment(apartment, preferences)

  // Evidence-based pros/cons
  if (apartment.monthlyRent <= preferences.maxBudget * 0.85) {
    keyPros.push(`Rent (€${apartment.monthlyRent}) is comfortably below your €${preferences.maxBudget} budget.`)
  } else if (apartment.monthlyRent > preferences.maxBudget) {
    keyCons.push(`Rent (€${apartment.monthlyRent}) exceeds your €${preferences.maxBudget} budget by €${apartment.monthlyRent - preferences.maxBudget}.`)
  }

  if (apartment.sizeM2 >= preferences.minimumSize * 1.2) {
    keyPros.push(`At ${apartment.sizeM2} m², the apartment is well above your ${preferences.minimumSize} m² minimum.`)
  } else if (apartment.sizeM2 < preferences.minimumSize) {
    keyCons.push(`At ${apartment.sizeM2} m², the apartment is below your ${preferences.minimumSize} m² minimum.`)
  }

  if (preferences.furnishedRequired && apartment.furnished) {
    keyPros.push('Furnished as required.')
  } else if (preferences.furnishedRequired && !apartment.furnished) {
    keyCons.push('Not furnished, but furnished is required.')
  }

  if (preferences.parkingRequired && apartment.parking) {
    keyPros.push('Parking available as required.')
  } else if (preferences.parkingRequired && !apartment.parking) {
    keyCons.push('No parking, but parking is required.')
  }

  if (apartment.balcony) keyPros.push('Balcony available.')
  if (apartment.elevator) keyPros.push('Elevator available.')
  if (apartment.petsAllowed && preferences.petsRequired) keyPros.push('Pets allowed as required.')
  if (!apartment.petsAllowed && preferences.petsRequired) keyCons.push('Pets not allowed, but required.')

  // Couple suitability
  const coupleSuitability = buildCoupleSuitability(apartment, preferences)

  // Remote work suitability
  const remoteWorkSuitability = buildRemoteWorkSuitability(apartment, preferences)

  // Comfort risks
  if (!apartment.elevator && apartment.floor !== undefined && apartment.floor >= 3) {
    comfortRisks.push(`Floor ${apartment.floor} without elevator may be inconvenient for heavy groceries or mobility needs.`)
  }
  if (!apartment.furnished && apartment.sizeM2 < 50) {
    comfortRisks.push('Unfurnished small apartment requires upfront investment in furniture.')
  }
  if (rentPerM2 > 12) {
    comfortRisks.push(`At €${rentPerM2.toFixed(2)}/m², the price per square meter is relatively high for Novi Sad.`)
  }
  if (!apartment.parking) {
    comfortRisks.push('No parking listed. Street parking availability should be verified.')
  }

  // Missing information
  if (!apartment.notes || apartment.notes.trim().length === 0) {
    missingInformation.push('No notes provided. Neighbourhood noise levels, natural light, and heating type are unknown.')
  }
  if (!apartment.listingUrl) {
    missingInformation.push('No listing URL. Unable to verify current availability or photos.')
  }
  if (!apartment.floor && apartment.floor !== 0) {
    missingInformation.push('Floor number not specified. Cannot assess elevator need or noise exposure.')
  }
  if (apartment.address === undefined || apartment.address.trim().length === 0) {
    missingInformation.push('Exact address not provided. Commute time and neighbourhood specifics cannot be verified.')
  }

  // Confidence score based on data completeness
  const fieldsProvided = [
    apartment.title, apartment.city, apartment.district, apartment.address,
    apartment.monthlyRent, apartment.sizeM2, apartment.bedrooms,
    apartment.notes, apartment.listingUrl, apartment.floor,
    apartment.contactName, apartment.contactPhone,
  ].filter((f) => f !== undefined && f !== '' && f !== null).length
  const confidenceScore = Math.round((fieldsProvided / 12) * 100)

  // Executive summary
  const executiveSummary = buildExecutiveSummary(apartment, score, recommendation, rentPerM2)

  return {
    executiveSummary,
    priceAssessment,
    locationAssessment,
    coupleSuitability,
    remoteWorkSuitability,
    comfortRisks,
    keyPros,
    keyCons,
    missingInformation,
    confidenceScore,
    recommendation,
  }
}

function buildPriceAssessment(apartment: RentalApartment, preferences: RentPreferences, rentPerM2: number, budgetFit: number): string {
  const parts: string[] = []

  if (apartment.monthlyRent <= preferences.maxBudget) {
    parts.push(`The monthly rent of €${apartment.monthlyRent} is within your €${preferences.maxBudget} budget.`)
  } else {
    parts.push(`The monthly rent of €${apartment.monthlyRent} exceeds your €${preferences.maxBudget} budget.`)
  }

  parts.push(`This works out to €${rentPerM2.toFixed(2)} per square meter.`)

  if (rentPerM2 <= 10) {
    parts.push('This is competitive for Novi Sad market conditions.')
  } else if (rentPerM2 <= 13) {
    parts.push('This is within the average range for Novi Sad.')
  } else {
    parts.push('This is above average for Novi Sad. Negotiation may be worth considering.')
  }

  if (budgetFit >= 80) {
    parts.push('Budget fit is strong.')
  } else if (budgetFit >= 50) {
    parts.push('Budget fit is moderate.')
  } else {
    parts.push('Budget fit is weak. Consider whether the value justifies the cost.')
  }

  return parts.join(' ')
}

function buildLocationAssessment(apartment: RentalApartment, preferences: RentPreferences): string {
  const parts: string[] = []

  parts.push(`The apartment is located in ${apartment.district}, ${apartment.city}.`)

  if (preferences.preferredDistrict && apartment.district.toLowerCase() === preferences.preferredDistrict.toLowerCase()) {
    parts.push(`This matches your preferred district of ${preferences.preferredDistrict}.`)
  } else if (preferences.preferredDistrict) {
    parts.push(`This does not match your preferred district of ${preferences.preferredDistrict}.`)
  }

  if (apartment.notes) {
    const lowerNotes = apartment.notes.toLowerCase()
    if (lowerNotes.includes('quiet')) parts.push('The notes mention a quiet environment.')
    if (lowerNotes.includes('university') || lowerNotes.includes('campus')) parts.push('Proximity to university campus is noted.')
    if (lowerNotes.includes('danube') || lowerNotes.includes('river')) parts.push('Near the Danube riverside area.')
    if (lowerNotes.includes('center') || lowerNotes.includes('centre')) parts.push('Close to city center.')
    if (lowerNotes.includes('transport') || lowerNotes.includes('bus')) parts.push('Good public transport access is mentioned.')
  }

  return parts.join(' ')
}

function buildCoupleSuitability(apartment: RentalApartment, _preferences: RentPreferences): string {
  const parts: string[] = []

  if (apartment.bedrooms >= 2) {
    parts.push(`With ${apartment.bedrooms} bedrooms, there is enough space for a couple with separate sleeping and working areas.`)
  } else if (apartment.bedrooms === 1) {
    parts.push('With 1 bedroom, this is suitable for a couple who shares a room, but separate work-from-home space may be limited.')
  } else {
    parts.push('Studio layout. Limited privacy for a couple.')
  }

  if (apartment.sizeM2 >= 50) {
    parts.push('The size provides reasonable living comfort for two people.')
  } else if (apartment.sizeM2 >= 35) {
    parts.push('The size is compact for two people.')
  } else {
    parts.push('The size may feel cramped for two people.')
  }

  return parts.join(' ')
}

function buildRemoteWorkSuitability(apartment: RentalApartment, preferences: RentPreferences): string {
  const parts: string[] = []

  if (preferences.remoteWorkImportant) {
    parts.push('Remote work is important to you.')
  }

  if (apartment.sizeM2 >= 55 && apartment.bedrooms >= 2) {
    parts.push('A dedicated room can likely serve as a home office.')
  } else if (apartment.sizeM2 >= 40) {
    parts.push('A work corner is feasible, but a dedicated office room may not be possible.')
  } else {
    parts.push('Space for a home office setup is very limited.')
  }

  if (apartment.notes) {
    const lowerNotes = apartment.notes.toLowerCase()
    if (lowerNotes.includes('quiet')) parts.push('The quiet environment is favorable for video calls and focused work.')
    if (lowerNotes.includes('remote') || lowerNotes.includes('work')) parts.push('The listing mentions suitability for remote work.')
  }

  return parts.join(' ')
}

function buildExecutiveSummary(apartment: RentalApartment, score: number, recommendation: RentRecommendation, rentPerM2: number): string {
  const parts: string[] = []

  parts.push(`${apartment.title} in ${apartment.district}, ${apartment.city} scores ${score}/100 (${recommendation}).`)

  parts.push(`At €${apartment.monthlyRent}/month for ${apartment.sizeM2} m² (€${rentPerM2.toFixed(2)}/m²), it is a ${apartment.bedrooms}-bedroom apartment`)

  const features: string[] = []
  if (apartment.furnished) features.push('furnished')
  if (apartment.parking) features.push('with parking')
  if (apartment.balcony) features.push('with balcony')
  if (apartment.elevator) features.push('with elevator')
  if (features.length > 0) {
    parts[parts.length - 1] += ` that is ${features.join(', ')}.`
  } else {
    parts[parts.length - 1] += '.'
  }

  switch (recommendation) {
    case 'Excellent Fit':
      parts.push('This apartment strongly aligns with your stated preferences and is recommended for further action.')
      break
    case 'Good Fit':
      parts.push('This apartment is a solid match. A viewing is recommended to confirm suitability.')
      break
    case 'Watch':
      parts.push('This apartment has some mismatches with your preferences. Worth monitoring but not a priority.')
      break
    case 'Avoid':
      parts.push('This apartment does not meet key requirements. It is recommended to look for alternatives.')
      break
  }

  return parts.join(' ')
}