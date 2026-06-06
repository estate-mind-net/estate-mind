export const APP_NAME = 'EstateMind'
export const APP_TAGLINE = 'AI Investment Intelligence for Real Estate'

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed-use', label: 'Mixed-Use' }
] as const

export const PROPERTY_CONDITIONS = [
  { value: 'new', label: 'New Construction' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'needs-renovation', label: 'Needs Renovation' },
  { value: 'under-construction', label: 'Under Construction' }
] as const

export const OPPORTUNITY_STATUSES = [
  { value: 'lead', label: 'Lead', color: 'oklch(0.74 0.15 210)' },
  { value: 'interested', label: 'Interested', color: 'oklch(0.68 0.14 265)' },
  { value: 'negotiating', label: 'Negotiating', color: 'oklch(0.72 0.18 190)' },
  { value: 'offer-made', label: 'Offer Made', color: 'oklch(0.78 0.16 82)' },
  { value: 'due-diligence', label: 'Due Diligence', color: 'oklch(0.35 0.15 270)' },
  { value: 'purchased', label: 'Purchased', color: 'oklch(0.65 0.18 145)' },
  { value: 'sold', label: 'Sold', color: 'oklch(0.58 0.14 160)' },
  { value: 'rejected', label: 'Rejected', color: 'oklch(0.60 0.22 25)' }
] as const

export const SCORE_THRESHOLDS = {
  BUY: 75,
  WATCH: 60,
  AVOID: 0
} as const

export const BADGE_VARIANTS = {
  lead: 'secondary' as const,
  interested: 'outline' as const,
  negotiating: 'default' as const,
  'offer-made': 'default' as const,
  'due-diligence': 'default' as const,
  purchased: 'default' as const,
  sold: 'secondary' as const,
  'rejected': 'destructive' as const
}

export const TIME_RANGES = [
  { value: '1M', label: '1 Month' },
  { value: '3M', label: '3 Months' },
  { value: '6M', label: '6 Months' },
  { value: '1Y', label: '1 Year' },
  { value: 'ALL', label: 'All Time' }
] as const

export const PRICING_TIERS = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    period: '14 days',
    features: [
      '3 property analyses',
      'Basic investment scores',
      'Market comparisons',
      'Email support'
    ]
  },
  {
    id: 'starter',
    name: 'Investor Starter',
    price: 49,
    period: 'month',
    features: [
      '20 property analyses/month',
      'Advanced AI insights',
      'Opportunity tracking',
      'Portfolio analytics',
      'Priority support'
    ],
    recommended: false
  },
  {
    id: 'pro',
    name: 'Investor Pro',
    price: 149,
    period: 'month',
    features: [
      'Unlimited analyses',
      'AI-powered recommendations',
      'Investment pipeline',
      'Document intelligence',
      'API access',
      'Dedicated support'
    ],
    recommended: true
  },
  {
    id: 'elite',
    name: 'Investor Elite',
    price: 399,
    period: 'month',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'White-label reports',
      'Multi-user accounts',
      'Advanced integrations',
      'Concierge support'
    ],
    recommended: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: 'custom',
    features: [
      'Custom pricing',
      'Dedicated infrastructure',
      'Custom features',
      'SLA guarantees',
      'Training & onboarding',
      '24/7 support'
    ],
    recommended: false
  }
] as const
