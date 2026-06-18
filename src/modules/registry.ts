import type { ModuleConfig, ModuleId } from './shared/types/module'

export const modules: Record<ModuleId, ModuleConfig> = {
  invest: {
    id: 'invest',
    label: 'Invest',
    description: 'Analyze and track real estate investment opportunities with AI-powered deal analysis.',
    defaultRoute: '/dashboard',
  },
  rent: {
    id: 'rent',
    label: 'Rent',
    description: 'Manage long-term rental properties, track tenants, and optimize rental yield.',
    defaultRoute: '/rent',
  },
  buy: {
    id: 'buy',
    label: 'Buy',
    description: 'Source, evaluate, and acquire properties with structured buy-side workflows.',
    defaultRoute: '/buy',
  },
  build: {
    id: 'build',
    label: 'Build',
    description: 'Manage ground-up construction projects from planning through completion.',
    defaultRoute: '/build',
  },
  renovate: {
    id: 'renovate',
    label: 'Renovate',
    description: 'Plan, budget, and track renovation projects to maximize property value uplift.',
    defaultRoute: '/renovate',
  },
  airbnb: {
    id: 'airbnb',
    label: 'Airbnb',
    description: 'Optimize short-term rental operations, pricing, and guest experience.',
    defaultRoute: '/airbnb',
  },
  'due-diligence': {
    id: 'due-diligence',
    label: 'Due Diligence',
    description: 'Structured due diligence workflows for legal, technical, and financial verification.',
    defaultRoute: '/due-diligence',
  },
  energy: {
    id: 'energy',
    label: 'Energy',
    description: 'Assess and improve property energy efficiency, sustainability, and compliance.',
    defaultRoute: '/energy',
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio',
    description: 'Monitor portfolio performance, analytics, and asset allocation across all properties.',
    defaultRoute: '/portfolio',
  },
}

export const moduleIds = Object.keys(modules) as ModuleId[]

export const getModuleConfig = (id: ModuleId): ModuleConfig => modules[id]