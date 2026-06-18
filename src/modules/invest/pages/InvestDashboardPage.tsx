import { ModuleLandingPage } from '@/modules/shared/components/ModuleLandingPage'
import { modules } from '@/modules/registry'

export function InvestDashboardPage() {
  return (
    <ModuleLandingPage
      module={modules.invest}
      coreQuestion="Where should I invest next, and why?"
      actionLabel="Analyze Opportunity"
    />
  )
}