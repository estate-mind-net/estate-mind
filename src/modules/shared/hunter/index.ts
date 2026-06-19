// Shared Hunter Module
// Reusable components for all Hunter-type modules (Invest, Rent, Buy, Airbnb, Renovate)

export { HunterMatchCard } from './components/HunterMatchCard'
export type { HunterMatchCardProps, MatchWithRaw } from './components/HunterMatchCard'

export { HunterSourceDialog, emptySource, sourceToForm, buildSourcePayload } from './components/HunterSourceDialog'
export type { HunterSourceDialogProps, SourceForm, SourceType } from './components/HunterSourceDialog'

export type { ModuleId, HunterModuleConfig } from './types'
export { HUNTER_MODULE_CONFIGS } from './types'