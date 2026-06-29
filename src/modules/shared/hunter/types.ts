/**
 * Module identifiers for the Hunter system.
 * Each module type scopes briefs, sources, and matches.
 */
export type ModuleId = 'invest' | 'rent' | 'buy' | 'airbnb' | 'renovate'

/**
 * Configuration for a Hunter module instance.
 * Used to parameterize shared components per module.
 */
export interface HunterModuleConfig {
  /** Module identifier */
  moduleId: ModuleId
  /** Display name (e.g., "Opportunity Hunter", "Rent Hunter") */
  displayName: string
  /** Base route (e.g., "/opportunity-hunter", "/rent/hunter") */
  baseRoute: string
  /** Brief creation route (e.g., "/opportunity-hunter/new", "/rent/hunter/new") */
  newBriefRoute: string
  /** Supported source types for this module */
  supportedSourceTypes: string[]
  /** Whether to show demo briefs dropdown */
  showDemoBriefs?: boolean
  /** Whether to show cleanup dialog */
  showCleanup?: boolean
}

/**
 * Default configurations for each module.
 */
export const HUNTER_MODULE_CONFIGS: Record<ModuleId, HunterModuleConfig> = {
  invest: {
    moduleId: 'invest',
    displayName: 'Opportunity Hunter',
    baseRoute: '/opportunity-hunter',
    newBriefRoute: '/opportunity-hunter/new',
    supportedSourceTypes: ['web_search', 'demo', 'manual_url', 'csv_import'],
    showDemoBriefs: true,
    showCleanup: true,
  },
  rent: {
    moduleId: 'rent',
    displayName: 'Rent Hunter',
    baseRoute: '/rent/hunter',
    newBriefRoute: '/rent/hunter/new',
    supportedSourceTypes: ['rent_demo', 'manual_url', 'csv_import', 'live_scraper', 'portal_search', 'saved_search', 'rent_web_search'],
    showDemoBriefs: false,
    showCleanup: false,
  },
  buy: {
    moduleId: 'buy',
    displayName: 'Buy Hunter',
    baseRoute: '/buy/hunter',
    newBriefRoute: '/buy/hunter/new',
    supportedSourceTypes: ['web_search', 'demo', 'manual_url', 'csv_import'],
  },
  airbnb: {
    moduleId: 'airbnb',
    displayName: 'Airbnb Hunter',
    baseRoute: '/airbnb/hunter',
    newBriefRoute: '/airbnb/hunter/new',
    supportedSourceTypes: ['web_search', 'demo', 'manual_url', 'csv_import'],
  },
  renovate: {
    moduleId: 'renovate',
    displayName: 'Renovate Hunter',
    baseRoute: '/renovate/hunter',
    newBriefRoute: '/renovate/hunter/new',
    supportedSourceTypes: ['web_search', 'demo', 'manual_url', 'csv_import'],
  },
}