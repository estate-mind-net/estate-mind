/**
 * debug.ts
 *
 * Debug utility for the Opportunity Intelligence Engine.
 * Outputs a structured report explaining why an opportunity scored
 * a certain way -- useful for debugging 80/100 vs 45/100 scores.
 *
 * Usage:
 *   import { debugOpportunity } from '@/modules/opportunity-intelligence'
 *   console.log(debugOpportunity(apartment, preferences))
 */

import type { NormalizedOpportunity, OpportunityScore, ScoreBreakdownItem, MissingDataItem } from './types'
import { normalizeRentListing, type RentListingInput } from './normalizers/rentNormalizer'
import { scoreRentOpportunity } from './scoring/rentScorer'
import type { RentModulePreferences } from './configs/rentModuleConfig'

export interface DebugOutput {
  /** Opportunity title */
  title: string
  /** Final total score */
  totalScore: number
  /** Recommendation level */
  recommendation: string
  /** Confidence score from normalization */
  confidenceScore: number
  /** Evidence items found during normalization */
  evidenceSummary: Array<{ field: string; value: unknown; source: string }>
  /** Missing data items with impact */
  missingDataSummary: Array<{ field: string; severity: string; impact: string }>
  /** Score breakdown per dimension */
  scoreBreakdown: Array<{ dimension: string; score: number; weight: number; weightedScore: number; explanation: string }>
  /** Human-readable summary */
  summary: string
}

/**
 * Debug a rent opportunity: normalize, score, and produce a readable report.
 */
export function debugOpportunity(
  listing: RentListingInput,
  preferences: RentModulePreferences,
): DebugOutput {
  const normalized = normalizeRentListing(listing)
  const score = scoreRentOpportunity(normalized, preferences)

  return buildDebugOutput(normalized, score)
}

function buildDebugOutput(
  normalized: NormalizedOpportunity,
  score: OpportunityScore,
): DebugOutput {
  const evidenceSummary = normalized.evidence.map((e) => ({
    field: e.field,
    value: e.value,
    source: e.source,
  }))

  const missingDataSummary = normalized.missingData.map((m) => ({
    field: m.field,
    severity: m.severity,
    impact: m.impact,
  }))

  const breakdownSummary = score.scoreBreakdown.map((b) => ({
    dimension: b.dimension,
    score: b.score,
    weight: b.weight,
    weightedScore: b.weightedScore,
    explanation: b.explanation,
  }))

  const summary = buildSummary(normalized, score)

  return {
    title: normalized.title,
    totalScore: score.totalScore,
    recommendation: score.recommendation,
    confidenceScore: score.confidenceScore,
    evidenceSummary,
    missingDataSummary,
    scoreBreakdown: breakdownSummary,
    summary,
  }
}

function buildSummary(normalized: NormalizedOpportunity, score: OpportunityScore): string {
  const parts: string[] = []

  parts.push(`"${normalized.title}" scored ${score.totalScore}/100 (${score.recommendation}).`)
  parts.push(`Confidence: ${score.confidenceScore}% based on ${normalized.evidence.length} confirmed facts.`)

  if (normalized.missingData.length > 0) {
    const required = normalized.missingData.filter((m) => m.severity === 'required')
    const recommended = normalized.missingData.filter((m) => m.severity === 'recommended')
    if (required.length > 0) {
      parts.push(`MISSING REQUIRED: ${required.map((m) => m.label).join(', ')}.`)
    }
    if (recommended.length > 0) {
      parts.push(`Missing recommended: ${recommended.map((m) => m.label).join(', ')}.`)
    }
  }

  // Top scoring dimensions
  const sorted = [...score.scoreBreakdown].sort((a, b) => b.weightedScore - a.weightedScore)
  const top = sorted.slice(0, 3)
  parts.push(`Top dimensions: ${top.map((b) => `${b.label}=${b.weightedScore}`).join(', ')}.`)

  // Weakest dimensions
  const weak = sorted.slice(-2)
  parts.push(`Weakest: ${weak.map((b) => `${b.label}=${b.weightedScore}`).join(', ')}.`)

  return parts.join(' ')
}
