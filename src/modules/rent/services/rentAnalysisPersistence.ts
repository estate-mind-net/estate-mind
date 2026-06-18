/**
 * rentAnalysisPersistence.ts
 *
 * Persists deterministic Rent Analysis results to Supabase:
 * - Full analysis JSON → notes table (with type discriminator)
 * - Structured findings → ai_findings table (reusing existing helper)
 *
 * Does NOT call OpenAI or any external API.
 * All analysis is deterministic, generated client-side.
 */

import type { AiFindingCreateInput, AiFindingSourceType } from '@/lib/types'
import type { RentAnalysisResult } from './rentAnalysis'
import type { RentPreferences } from '../types'
import { getSupabaseClient } from '@/services/supabase/client'

// ── Result types ───────────────────────────────────────────────────

export interface RentPersistenceResult {
  success: boolean
  data?: RentAnalysisResult
  error?: string
}

export interface RentAnalysisLoadResult {
  success: boolean
  data?: RentAnalysisResult
  error?: string
}

export interface RentPersistenceContext {
  organizationId: string
}

// ── Note content shape ─────────────────────────────────────────────

interface RentAnalysisNoteContent {
  type: 'rent_analysis'
  analysisVersion: 'rent-deterministic-v1'
  generatedAt: string
  source: 'deterministic'
  preferences: RentPreferences
  result: RentAnalysisResult
  snapshot: {
    score: number
    recommendation: string
    confidenceScore: number
    rentPerM2: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function buildNoteContent(
  analysis: RentAnalysisResult,
  apartment: { monthlyRent: number; sizeM2: number },
  preferences: RentPreferences,
): RentAnalysisNoteContent {
  return {
    type: 'rent_analysis',
    analysisVersion: 'rent-deterministic-v1',
    generatedAt: new Date().toISOString(),
    source: 'deterministic',
    preferences,
    result: analysis,
    snapshot: {
      score: analysis.confidenceScore,
      recommendation: analysis.recommendation,
      confidenceScore: analysis.confidenceScore,
      rentPerM2: apartment.monthlyRent / apartment.sizeM2,
    },
  }
}

function mapRentAnalysisToFindings(
  analysis: RentAnalysisResult,
  organizationId: string,
  opportunityId: string,
): AiFindingCreateInput[] {
  const rows: AiFindingCreateInput[] = []
  const sourceType: AiFindingSourceType = 'listing'

  // keyPros → opportunity findings
  for (const pro of analysis.keyPros) {
    if (!pro.trim()) continue
    rows.push({
      organization_id: organizationId,
      opportunity_id: opportunityId,
      category: 'opportunities',
      title: pro.length <= 80 ? pro : `${pro.slice(0, 77)}...`,
      finding_type: 'opportunity',
      confidence: analysis.confidenceScore,
      source_type: sourceType,
      evidence: pro,
      metadata: { explanation: pro, value: pro },
    })
  }

  // keyCons → risk findings
  for (const con of analysis.keyCons) {
    if (!con.trim()) continue
    rows.push({
      organization_id: organizationId,
      opportunity_id: opportunityId,
      category: 'risks',
      title: con.length <= 80 ? con : `${con.slice(0, 77)}...`,
      finding_type: 'risk',
      confidence: analysis.confidenceScore,
      source_type: sourceType,
      evidence: con,
      metadata: { explanation: con, value: con },
    })
  }

  // comfortRisks → risk findings
  for (const risk of analysis.comfortRisks) {
    if (!risk.trim()) continue
    rows.push({
      organization_id: organizationId,
      opportunity_id: opportunityId,
      category: 'risks',
      title: risk.length <= 80 ? risk : `${risk.slice(0, 77)}...`,
      finding_type: 'risk',
      confidence: analysis.confidenceScore,
      source_type: sourceType,
      evidence: risk,
      metadata: { explanation: risk, value: risk },
    })
  }

  // missingInformation → missing_evidence findings
  for (const missing of analysis.missingInformation) {
    if (!missing.trim()) continue
    rows.push({
      organization_id: organizationId,
      opportunity_id: opportunityId,
      category: 'missingEvidence',
      title: missing.length <= 80 ? missing : `${missing.slice(0, 77)}...`,
      finding_type: 'missing_evidence',
      confidence: null,
      source_type: sourceType,
      evidence: missing,
      metadata: { explanation: missing, value: missing },
    })
  }

  return rows
}

// ── Public methods ─────────────────────────────────────────────────

/**
 * Save rent analysis to Supabase:
 * 1. Insert full JSON into notes table
 * 2. Replace ai_findings with structured findings
 */
export async function saveRentAnalysis(
  opportunityId: string,
  analysis: RentAnalysisResult,
  apartment: { monthlyRent: number; sizeM2: number },
  preferences: RentPreferences,
  context: RentPersistenceContext,
): Promise<RentPersistenceResult> {
  try {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    // 1. Insert analysis note
    const noteContent = buildNoteContent(analysis, apartment, preferences)
    const noteResult = await client
      .from('notes')
      .insert([{
        organization_id: context.organizationId,
        opportunity_id: opportunityId,
        content: JSON.stringify(noteContent),
      }])

    if (noteResult.error) {
      throw new Error(noteResult.error.message ?? 'Failed to save analysis note.')
    }

    // 2. Replace ai_findings using existing helper
    // We need to wrap the RentAnalysisResult into a minimal InvestmentAnalysis-like shape
    // that replaceAiFindingsForOpportunity can process, or call our own findings insert.
    // Since replaceAiFindingsForOpportunity expects InvestmentAnalysis, we'll insert directly.
    const findings = mapRentAnalysisToFindings(analysis, context.organizationId, opportunityId)

    // Delete existing rent findings for this opportunity
    const deleteResult = await client
      .from('ai_findings')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('opportunity_id', opportunityId)

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message ?? 'Failed to clear previous findings.')
    }

    if (findings.length > 0) {
      const insertResult = await client.from('ai_findings').insert(findings)
      if (insertResult.error) {
        throw new Error(insertResult.error.message ?? 'Failed to save findings.')
      }
    }

    return { success: true, data: analysis }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save rent analysis.',
    }
  }
}

/**
 * Load the most recent rent analysis from the notes table.
 * Looks for notes with type='rent_analysis' discriminator.
 */
export async function getLatestRentAnalysis(
  opportunityId: string,
  context: RentPersistenceContext,
): Promise<RentAnalysisLoadResult> {
  try {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const { data, error } = await client
      .from('notes')
      .select('content, created_at')
      .eq('organization_id', context.organizationId)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message ?? 'Failed to load notes.')

    const notes = (data ?? []) as { content: string | null; created_at: string | null }[]

    // Find the latest note with rent_analysis type
    for (const note of notes) {
      if (!note.content) continue
      try {
        const parsed = JSON.parse(note.content)
        if (parsed && parsed.type === 'rent_analysis' && parsed.result) {
          return { success: true, data: parsed.result as RentAnalysisResult }
        }
      } catch {
        // Not valid JSON, skip
      }
    }

    // No persisted analysis found
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load rent analysis.',
    }
  }
}

/**
 * Replace all ai_findings for an opportunity with rent analysis findings.
 * Useful if you want to update findings without inserting a new note.
 */
export async function replaceRentAnalysisFindings(
  opportunityId: string,
  analysis: RentAnalysisResult,
  context: RentPersistenceContext,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is unavailable.')

    const findings = mapRentAnalysisToFindings(analysis, context.organizationId, opportunityId)

    // Delete existing findings
    const deleteResult = await client
      .from('ai_findings')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('opportunity_id', opportunityId)

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message ?? 'Failed to clear previous findings.')
    }

    if (findings.length > 0) {
      const insertResult = await client.from('ai_findings').insert(findings)
      if (insertResult.error) {
        throw new Error(insertResult.error.message ?? 'Failed to save findings.')
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to replace rent findings.',
    }
  }
}