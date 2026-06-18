import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function AirbnbDashboardPage() {
  return (
    <ModuleLandingPage
      module={modules.airbnb}
      coreQuestion="Will this property work as short-term rental?"
      actionLabel="Evaluate Short-Term Rental"
    />
  )
}