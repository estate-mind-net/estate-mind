import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { mockOpportunities } from '@/lib/mockData'
import { opportunitiesService } from '@/services/supabase/opportunities.service'
import { getSupabaseClient } from '@/services/supabase/client'

interface OpportunitiesContextValue {
  opportunities: Opportunity[] | null
  archivedOpportunities: Opportunity[] | null
  updateStatus: (id: string, status: OpportunityStatus) => void
  bulkArchive: (ids: string[]) => void
  bulkAddTags: (ids: string[], tags: string[]) => void
  bulkDelete: (ids: string[]) => void
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null)

export function OpportunitiesProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(mockOpportunities)
  const [archivedOpportunities, setArchivedOpportunities] = useState<Opportunity[] | null>([])

  // Load from Supabase on mount only when configured
  useEffect(() => {
    if (!getSupabaseClient()) return

    opportunitiesService.getAll().then((data) => {
      if (data.length > 0) setOpportunities(data)
    }).catch(() => {/* stay on mock */})

    opportunitiesService.getAllArchived().then((data) => {
      setArchivedOpportunities(data)
    }).catch(() => {/* stay on empty */})
  }, [])

  const updateStatus = useCallback((id: string, status: OpportunityStatus) => {
    setOpportunities((current) =>
      current?.map((o) =>
        o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
      ) ?? []
    )
    // Async persist — best-effort, no revert in Phase 2B
    opportunitiesService.update(id, { status }).catch((err) =>
      console.error('Failed to persist status update:', err)
    )
  }, [])

  const bulkArchive = useCallback((ids: string[]) => {
    setOpportunities((current) => {
      const selected = (current ?? []).filter((o) => ids.includes(o.id))
      setArchivedOpportunities((archived) => [
        ...(archived ?? []),
        ...selected.map((o) => ({ ...o, updatedAt: new Date().toISOString() })),
      ])
      return (current ?? []).filter((o) => !ids.includes(o.id))
    })
    // Async persist — best-effort
    opportunitiesService.archive(ids).catch((err) =>
      console.error('Failed to persist archive:', err)
    )
  }, [])

  const bulkAddTags = useCallback((ids: string[], tags: string[]) => {
    setOpportunities((current) =>
      current?.map((o) => {
        if (!ids.includes(o.id)) return o
        const newTags = Array.from(new Set([...o.tags, ...tags]))
        return { ...o, tags: newTags, updatedAt: new Date().toISOString() }
      }) ?? []
    )
    // Async persist — best-effort
    opportunitiesService.bulkUpdate(ids, { tags }).catch((err) =>
      console.error('Failed to persist tag update:', err)
    )
  }, [])

  const bulkDelete = useCallback((ids: string[]) => {
    setOpportunities((current) =>
      current?.filter((o) => !ids.includes(o.id)) ?? []
    )
    // Async persist — best-effort
    Promise.all(ids.map((id) => opportunitiesService.delete(id))).catch((err) =>
      console.error('Failed to persist delete:', err)
    )
  }, [])

  return (
    <OpportunitiesContext.Provider
      value={{
        opportunities,
        archivedOpportunities,
        updateStatus,
        bulkArchive,
        bulkAddTags,
        bulkDelete,
      }}
    >
      {children}
    </OpportunitiesContext.Provider>
  )
}

export function useOpportunities(): OpportunitiesContextValue {
  const ctx = useContext(OpportunitiesContext)
  if (!ctx) {
    throw new Error('useOpportunities must be used within an OpportunitiesProvider')
  }
  return ctx
}
