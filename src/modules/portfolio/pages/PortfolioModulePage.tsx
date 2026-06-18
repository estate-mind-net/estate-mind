import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function PortfolioModulePage() {
  return (
    <ModuleLandingPage
      module={modules.portfolio}
      coreQuestion="How is my property portfolio performing?"
      actionLabel="View Portfolio"
    />
  )
}