import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function EnergyDashboardPage() {
  return (
    <ModuleLandingPage
      module={modules.energy}
      coreQuestion="Can operating costs and ESG performance be improved?"
      actionLabel="Assess Energy Efficiency"
    />
  )
}