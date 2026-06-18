import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function RenovateDashboardPage() {
  return (
    <ModuleLandingPage
      module={modules.renovate}
      coreQuestion="Is renovation worth it?"
      actionLabel="Evaluate Renovation"
    />
  )
}