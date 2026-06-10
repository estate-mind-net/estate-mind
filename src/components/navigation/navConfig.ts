import type { Icon } from '@phosphor-icons/react'
import { Brain, Buildings, Compass, CurrencyDollar, Gear, House, PlusSquare, SignOut } from '@phosphor-icons/react'

export interface NavItemConfig {
  key: string
  label: string
  icon: Icon
  to?: string
  exact?: boolean
  disabled?: boolean
  disabledReason?: string
  action?: 'logout'
}

export interface NavSectionConfig {
  key: string
  title: string
  items: NavItemConfig[]
}

export const navigationSections: NavSectionConfig[] = [
  {
    key: 'invest',
    title: 'INVEST',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        to: '/dashboard',
        icon: House,
      },
      {
        key: 'opportunity-hunter',
        label: 'Opportunity Hunter',
        to: '/opportunity-hunter',
        icon: Compass,
      },
      {
        key: 'opportunities',
        label: 'My Opportunities',
        to: '/opportunities',
        icon: Buildings,
      },
      {
        key: 'new-opportunity',
        label: 'New Opportunity',
        to: '/opportunities/new',
        icon: PlusSquare,
        exact: true,
      },
    ],
  },
  {
    key: 'analyze',
    title: 'ANALYZE',
    items: [
      {
        key: 'ai-reports',
        label: 'AI Reports',
        to: '/reports',
        icon: Brain,
      },
    ],
  },
  {
    key: 'account',
    title: 'ACCOUNT',
    items: [
      {
        key: 'pricing',
        label: 'Pricing / Billing',
        to: '/pricing',
        icon: CurrencyDollar,
      },
      {
        key: 'settings',
        label: 'Settings',
        to: '/settings',
        icon: Gear,
      },
      {
        key: 'logout',
        label: 'Logout',
        icon: SignOut,
        action: 'logout',
      },
    ],
  },
]

export const navigationItems = navigationSections.flatMap((section) => section.items)
