/**
 * rentScorer.ts
 *
 * Pure function that scores a NormalizedOpportunity for the Rent module.
 * Functionally equivalent to the original rentScoring.ts.
 */

import type {
  NormalizedOpportunity,
  OpportunityScore,
  ScoreBreakdownItem,
  RecommendationLevel,
} from '../types'
import { rentModuleConfig, type RentModulePreferences } from '../configs/rentModuleConfig'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function scoreRentOpportunity(
  opportunity: NormalizedOpportunity,
  preferences: RentModulePreferences,
): OpportunityScore {
  const weights = rentModuleConfig.scoringWeights
  const thresholds = rentModuleConfig.recommendationThresholds
  const md = opportunity.moduleData
  const furnished = (md.furnished as boolean) ?? false
  const parking = (md.parking as boolean) ?? false
  const balcony = (md.balcony as boolean) ?? false
  const petsAllowed = (md.petsAllowed as boolean) ?? false

  const budgetScore = scoreBudgetFit(opportunity.price, preferences.maxBudget)
  const sizeScore = scoreSizeFit(opportunity.sizeM2, preferences.minimumSize)
  const districtScore = scoreDistrictMatch(opportunity.district, preferences.preferredDistrict)
  const furnishedScore = scoreBooleanMatch(furnished, preferences.furnishedRequired)
  const parkingScore = scoreBooleanMatch(parking, preferences.parkingRequired)
  const balconyScore = scoreBooleanMatch(balcony, preferences.balconyPreferred)
  const petsScore = scoreBooleanMatch(petsAllowed, preferences.petsRequired)

  const breakdown: ScoreBreakdownItem[] = [
    buildBreakdownItem('budgetFit', budgetScore, weights.budgetFit,
      budgetScore >= 80 ? 'Within budget' : budgetScore >= 50 ? 'Slightly over budget' : 'Significantly over budget'),
    buildBreakdownItem('sizeFit', sizeScore, weights.sizeFit,
      sizeScore >= 80 ? 'Meets size requirement' : sizeScore >= 50 ? 'Below minimum size' : 'Well below minimum'),
    buildBreakdownItem('districtMatch', districtScore, weights.districtMatch,
      districtScore >= 80 ? 'District matches preference' : 'District does not match'),
    buildBreakdownItem('furnishedMatch', furnishedScore, weights.furnishedMatch,
      furnishedScore >= 80 ? 'Matches furnishing preference' : 'Does not match furnishing preference'),
    buildBreakdownItem('parkingMatch', parkingScore, weights.parkingMatch,
      parkingScore >= 80 ? 'Matches parking preference' : 'Does not match parking preference'),
    buildBreakdownItem('balconyMatch', balconyScore, weights.balconyMatch,
      balconyScore >= 80 ? 'Balcony available' : 'No balcony'),
    buildBreakdownItem('petsMatch', petsScore, weights.petsMatch,
      petsScore >= 80 ? 'Pets allowed' : 'Pets policy does not match'),
  ]

  const totalScore = clamp(Math.round(breakdown.reduce((sum, b) => sum + b.weightedScore, 0)), 0, 100)
  const recommendation = toRecommendation(totalScore, thresholds)

  return {
    opportunityId: opportunity.id,
    moduleType: 'rent',
    totalScore,
    recommendation,
    scoreBreakdown: breakdown,
    evidence: opportunity.evidence,
    missingData: opportunity.missingData,
    confidenceScore: opportunity.confidenceScore,
    scoredAt: new Date().toISOString(),
  }
}

// ── Dimension scorers (matches original rentScoring.ts) ──────────

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

function scoreSizeFit(size: number, min: number): number {
  if (min <= 0) return 70
  if (size >= min * 1.5) return 100
  if (size >= min * 1.2) return 90
  if (size >= min) return 80
  if (size >= min * 0.8) return 50
  return 20
}

function scoreDistrictMatch(actual: string, preferred: string): number {
  if (!preferred || preferred.trim().length === 0) return 70
  return actual.trim().toLowerCase() === preferred.trim().toLowerCase() ? 100 : 30
}

function scoreBooleanMatch(has: boolean, required: boolean): number {
  return !required ? 70 : has ? 100 : 10
}

function toRecommendation(
  score: number,
  thresholds: typeof rentModuleConfig.recommendationThresholds,
): RecommendationLevel {
  if (score >= thresholds.excellent) return 'Excellent Fit'
  if (score >= thresholds.good) return 'Good Fit'
  if (score >= thresholds.possible) return 'Possible Fit'
  if (score >= thresholds.weak) return 'Weak Fit'
  return 'Reject'
}

function buildBreakdownItem(
  dimension: string,
  score: number,
  weight: number,
  explanation: string,
): ScoreBreakdownItem {
  return {
    dimension,
    label: rentModuleConfig.dimensionLabels[dimension] ?? dimension,
    score,
    weight,
    weightedScore: Math.round(score * weight),
    explanation,
  }
}
