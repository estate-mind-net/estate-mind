import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { RentalApartment } from '@/modules/rent/types'
import { opportunityRepository } from '@/modules/rent/repositories/OpportunityRepository'
import { getStorageSummary, countOpportunities } from './resetService'
import type { StorageSummary, DataContext } from './resetService'
import { isValidContext } from '../auth/ContextValidation'
import { useAuth } from '@/hooks/useAuth'
import { SearchSourcesPanel } from './SearchSourcesPanel'
import { OpportunitiesPanel } from './OpportunitiesPanel'
import { StorageSummaryPanel } from './StorageSummaryPanel'
import { DeveloperToolsPanel } from './DeveloperToolsPanel'
import { AuthRequiredCard } from '../auth/AuthRequiredCard'

export function DataManagementPage() {
  const { user, organization } = useAuth()
  const navigate = useNavigate()
  const [apartments, setApartments] = useState<RentalApartment[]>([])
  const [storageSummary, setStorageSummary] = useState<StorageSummary>({ searchSources: 0, opportunities: 0, aiReports: 0, lastImport: null })
  const [refreshKey, setRefreshKey] = useState(0)

  const context: DataContext | null = useMemo(() => {
    if (organization?.id && user?.id) return { organizationId: organization.id, userId: user.id }
    return null
  }, [organization?.id, user?.id])

  useEffect(() => {
    if (!context) return
    opportunityRepository.list(context)
      .then((r) => setApartments(r.data ?? []))
      .catch(() => setApartments([]))
    getStorageSummary(context).then(setStorageSummary).catch(() => {})
  }, [context, refreshKey])

  const opportunities = useMemo(() =>
    apartments.map((a) => ({
      id: a.id, title: a.title, moduleType: 'rent', status: a.status ?? 'new',
      recommendation: a.recommendation ?? 'Possible Fit', workspaceUrl: `/rent/${a.id}`,
    })), [apartments])

  const handleDeleteOpportunity = (id: string) => {
    if (!context) return
    opportunityRepository.delete(id, context)
      .then(() => { toast.success('Opportunity deleted.'); setRefreshKey((k) => k + 1) })
      .catch(() => toast.error('Failed to delete opportunity.'))
  }

  if (!context) {
    return (
      <div className="mx-auto max-w-4xl">
        <AuthRequiredCard />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Data Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage imported searches and opportunities.</p>
        <p className="text-xs text-amber-600 mt-1">Data Management operates on your Supabase workspace data. Deletions cannot be undone.</p>
      </div>

      <SearchSourcesPanel
        sources={[]}
        onDelete={(source) => toast.info(`Delete search "${source.name}" â€” coming soon.`)}
        onUpdate={(source) => toast.info(`Update "${source.name}" â€” coming soon.`)}
      />

      <OpportunitiesPanel opportunities={opportunities} onDelete={handleDeleteOpportunity} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorageSummaryPanel summary={storageSummary} />
        <DeveloperToolsPanel context={context ?? { organizationId: '', userId: '' }} onResetComplete={() => setRefreshKey((k) => k + 1)} />
      </div>
    </div>
  )
}