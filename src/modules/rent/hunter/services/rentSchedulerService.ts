/**
 * Rent Scheduler Service
 *
 * Reusable service for running discovery on rent briefs.
 * No cron, no UI, no notifications, no background workers.
 * Future automation will call these services.
 */

import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { triggerDiscoveryRun } from '@/services/api/discovery.service'
import type { InvestmentSearchBrief } from '@/lib/types/opportunityHunter'

export interface RunBriefResult {
  briefId: string
  briefTitle: string
  success: boolean
  matchesFound?: number
  error?: string
}

export interface RunAllResult {
  totalBriefs: number
  succeeded: number
  failed: number
  results: RunBriefResult[]
}

/**
 * Run discovery for a single rent brief.
 * Uses all assigned sources for that brief.
 */
export async function runBrief(
  briefId: string,
  organizationId: string,
): Promise<RunBriefResult> {
  try {
    const brief = await opportunityHunterService.getBrief(organizationId, briefId)
    if (!brief) {
      return {
        briefId,
        briefTitle: 'Unknown',
        success: false,
        error: 'Brief not found.',
      }
    }

    const result = await triggerDiscoveryRun({
      briefId,
      organizationId,
    })

    return {
      briefId,
      briefTitle: brief.title,
      success: true,
      matchesFound: result.matchesFound ?? 0,
    }
  } catch (error) {
    return {
      briefId,
      briefTitle: 'Unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Run discovery for all active rent briefs in an organization.
 * Sequential execution to respect rate limits.
 */
export async function runAllRentBriefs(
  organizationId: string,
): Promise<RunAllResult> {
  const briefs = await opportunityHunterService.listBriefs(organizationId, 'rent') as InvestmentSearchBrief[]
  const activeBriefs = briefs.filter((b) => b.is_active)

  const results: RunBriefResult[] = []

  for (const brief of activeBriefs) {
    const result = await runBrief(brief.id, organizationId)
    results.push(result)
  }

  return {
    totalBriefs: activeBriefs.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }
}