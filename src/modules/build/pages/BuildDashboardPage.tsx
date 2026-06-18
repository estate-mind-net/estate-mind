import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function BuildDashboardPage() {
  return (
    <ModuleLandingPage
      module={modules.build}
      coreQuestion="What should I build, and where?"
      actionLabel="Start Build Project"
    />
  )
}