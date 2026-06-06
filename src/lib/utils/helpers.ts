import { opportunityStageColors, opportunityStageLabels, type OpportunityStage } from '../constants/opportunityStages'

export function getStatusColor(status: OpportunityStage): string {
  return opportunityStageColors[status]
}

export function getStatusLabel(status: OpportunityStage): string {
  return opportunityStageLabels[status]
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
