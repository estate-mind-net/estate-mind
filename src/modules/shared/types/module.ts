export type ModuleId =
  | 'invest'
  | 'rent'
  | 'buy'
  | 'build'
  | 'renovate'
  | 'airbnb'
  | 'due-diligence'
  | 'energy'
  | 'portfolio'

export interface ModuleConfig {
  id: ModuleId
  label: string
  description: string
  defaultRoute: string
}