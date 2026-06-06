export const opportunityStages = [
  'lead',
  'interested',
  'negotiating',
  'offer-made',
  'due-diligence',
  'purchased',
  'sold',
  'rejected',
] as const

export type OpportunityStage = (typeof opportunityStages)[number]

export const opportunityStageLabels: Record<OpportunityStage, string> = {
  lead: 'Lead',
  interested: 'Interested',
  negotiating: 'Negotiating',
  'offer-made': 'Offer Made',
  'due-diligence': 'Due Diligence',
  purchased: 'Purchased',
  sold: 'Sold',
  rejected: 'Rejected',
}

export const opportunityStageColors: Record<OpportunityStage, string> = {
  lead: 'oklch(0.74 0.15 210)',
  interested: 'oklch(0.68 0.14 265)',
  negotiating: 'oklch(0.72 0.18 190)',
  'offer-made': 'oklch(0.78 0.16 82)',
  'due-diligence': 'oklch(0.45 0.16 275)',
  purchased: 'oklch(0.65 0.18 145)',
  sold: 'oklch(0.58 0.14 160)',
  rejected: 'oklch(0.60 0.22 25)',
}

const legacyStageMap: Record<string, OpportunityStage> = {
  'new-opportunity': 'lead',
  'initial-analysis': 'interested',
  watching: 'interested',
  negotiation: 'negotiating',
  acquired: 'purchased',
}

export const normalizeOpportunityStage = (value?: string | null): OpportunityStage => {
  if (!value) {
    return 'lead'
  }

  if (opportunityStages.includes(value as OpportunityStage)) {
    return value as OpportunityStage
  }

  return legacyStageMap[value] ?? 'lead'
}
