import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function DueDiligenceModulePage() {
  return (
    <ModuleLandingPage
      module={modules['due-diligence']}
      coreQuestion="Is this property legally safe?"
      actionLabel="Start Due Diligence"
    />
  )
}