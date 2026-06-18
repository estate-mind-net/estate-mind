import type { RentalApartment, RentPreferences, RentRecommendation } from '../types'

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

export interface RentScoreResult {
  score: number
  recommendation: RentRecommendation
  breakdown: {
    budgetFit: number
    sizeFit: number
    districtMatch: number
    furnishedMatch: number
    parkingMatch: number
    balconyMatch: number
    petsMatch: number
  }
}

export function scoreRentalApartment(apartment: RentalApartment, preferences: RentPreferences): RentScoreResult {
  const breakdown = {
    budgetFit: scoreBudgetFit(apartment.monthlyRent, preferences.maxBudget),
    sizeFit: scoreSizeFit(apartment.sizeM2, preferences.minimumSize),
    districtMatch: scoreDistrictMatch(apartment.district, preferences.preferredDistrict),
    furnishedMatch: scoreBooleanMatch(apartment.furnished, preferences.furnishedRequired),
    parkingMatch: scoreBooleanMatch(apartment.parking, preferences.parkingRequired),
    balconyMatch: scoreBooleanMatch(apartment.balcony, preferences.balconyPreferred),
    petsMatch: scoreBooleanMatch(apartment.petsAllowed, preferences.petsRequired),
  }

  const weightedScore =
    breakdown.budgetFit * 0.3 +
    breakdown.sizeFit * 0.2 +
    breakdown.districtMatch * 0.15 +
    breakdown.furnishedMatch * 0.12 +
    breakdown.parkingMatch * 0.1 +
    breakdown.balconyMatch * 0.08 +
    breakdown.petsMatch * 0.05

  const score = clamp(Math.round(weightedScore), 0, 100)
  const recommendation = toRecommendation(score)

  return { score, recommendation, breakdown }
}

function scoreBudgetFit(rent: number, maxBudget: number): number {
  if (maxBudget <= 0) return 50
  if (rent <= 0) return 50

  if (rent > maxBudget) {
    const overshoot = (rent - maxBudget) / maxBudget
    return clamp(Math.round(100 - overshoot * 200), 0, 100)
  }

  const ratio = rent / maxBudget
  if (ratio <= 0.7) return 100
  if (ratio <= 0.85) return 90
  if (ratio <= 0.95) return 80
  return 70
}

function scoreSizeFit(size: number, minimumSize: number): number {
  if (minimumSize <= 0) return 70
  if (size >= minimumSize * 1.5) return 100
  if (size >= minimumSize * 1.2) return 90
  if (size >= minimumSize) return 80
  if (size >= minimumSize * 0.8) return 50
  return 20
}

function scoreDistrictMatch(apartmentDistrict: string, preferredDistrict: string): number {
  if (!preferredDistrict || preferredDistrict.trim().length === 0) return 70
  const normalizedPreferred = preferredDistrict.trim().toLowerCase()
  const normalizedActual = apartmentDistrict.trim().toLowerCase()
  return normalizedActual === normalizedPreferred ? 100 : 30
}

function scoreBooleanMatch(hasFeature: boolean, isRequired: boolean): number {
  if (!isRequired) return 70
  return hasFeature ? 100 : 10
}

function toRecommendation(score: number): RentRecommendation {
  if (score >= 85) return 'Excellent Fit'
  if (score >= 70) return 'Good Fit'
  if (score >= 50) return 'Watch'
  return 'Avoid'
}