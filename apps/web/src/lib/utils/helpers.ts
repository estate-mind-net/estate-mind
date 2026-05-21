import type { OpportunityStatus } from '../types'

export function getStatusColor(status: OpportunityStatus): string {
  const colors: Record<OpportunityStatus, string> = {
    'new-opportunity': 'oklch(0.75 0.15 195)',
    'initial-analysis': 'oklch(0.65 0.15 270)',
    'watching': 'oklch(0.75 0.15 75)',
    'due-diligence': 'oklch(0.35 0.15 270)',
    'negotiation': 'oklch(0.75 0.15 195)',
    'acquired': 'oklch(0.65 0.18 145)',
    'rejected': 'oklch(0.60 0.22 25)',
  }
  return colors[status]
}

export function getStatusLabel(status: OpportunityStatus): string {
  const labels: Record<OpportunityStatus, string> = {
    'new-opportunity': 'New Opportunity',
    'initial-analysis': 'Initial Analysis',
    'watching': 'Watching',
    'due-diligence': 'Due Diligence',
    'negotiation': 'Negotiation',
    'acquired': 'Acquired',
    'rejected': 'Rejected',
  }
  return labels[status]
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'oklch(0.65 0.18 145)'
  if (score >= 70) return 'oklch(0.75 0.15 195)'
  if (score >= 60) return 'oklch(0.75 0.15 75)'
  return 'oklch(0.60 0.22 25)'
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Poor'
}

export function getRecommendationColor(recommendation: 'buy' | 'watch' | 'avoid'): string {
  const colors = {
    buy: 'oklch(0.65 0.18 145)',
    watch: 'oklch(0.75 0.15 75)',
    avoid: 'oklch(0.60 0.22 25)',
  }
  return colors[recommendation]
}

export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: 'oklch(0.60 0.22 25)',
    medium: 'oklch(0.75 0.15 75)',
    low: 'oklch(0.75 0.15 195)',
  }
  return colors[priority]
}
