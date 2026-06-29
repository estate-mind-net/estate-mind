import type { Icon } from '@phosphor-icons/react'
import {
  Bed,
  Brain,
  ClipboardText,
  Compass,
  CurrencyDollar,
  Factory,
  Gear,
  Hammer,
  House,
  HouseLine,
  Lightning,
  MagnifyingGlass,
  ShieldCheck,
  SignOut,
  SolarPanel,
  TrendUp,
} from '@phosphor-icons/react'

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
    key: 'home',
    title: 'HOME',
    items: [
      { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: House },
    ],
  },
  {
    key: 'discover',
    title: 'DISCOVER',
    items: [
      { key: 'hunter', label: 'Hunter', to: '/hunter', icon: Compass },
    ],
  },
  {
    key: 'workspace',
    title: 'WORKSPACE',
    items: [
      { key: 'my-opportunities', label: 'My Opportunities', to: '/decisions', icon: ClipboardText },
    ],
  },
  {
    key: 'reports',
    title: 'REPORTS',
    items: [
      { key: 'ai-reports', label: 'AI Reports', to: '/reports', icon: Brain },
    ],
  },
  {
    key: 'modules',
    title: 'MODULES',
    items: [
      { key: 'module-rent', label: 'Rent', to: '/rent', icon: HouseLine },
      { key: 'module-buy', label: 'Buy', to: '/buy', icon: MagnifyingGlass },
      { key: 'module-invest', label: 'Invest', to: '/invest', icon: TrendUp },
      { key: 'module-build', label: 'Build', to: '/build', icon: Factory },
      { key: 'module-renovate', label: 'Renovate', to: '/renovate', icon: Hammer },
      { key: 'module-airbnb', label: 'Airbnb', to: '/airbnb', icon: Bed },
      { key: 'module-due-diligence', label: 'Due Diligence', to: '/due-diligence', icon: ShieldCheck },
      { key: 'module-energy', label: 'Energy', to: '/energy', icon: SolarPanel },
      { key: 'module-portfolio-intelligence', label: 'Portfolio Intelligence', to: '/portfolio-intelligence', icon: Lightning },
    ],
  },
  {
    key: 'account',
    title: 'ACCOUNT',
    items: [
      { key: 'pricing', label: 'Pricing / Billing', to: '/pricing', icon: CurrencyDollar },
      { key: 'settings', label: 'Settings', to: '/settings', icon: Gear },
      { key: 'logout', label: 'Logout', icon: SignOut, action: 'logout' },
    ],
  },
]

export const navigationItems = navigationSections.flatMap((section) => section.items)