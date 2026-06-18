import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function BuyDashboardPage() {
  return (
    <ModuleLandingPage
      module={modules.buy}
      coreQuestion="Which property should I buy for myself?"
      actionLabel="Browse Properties"
    />
  )
}