import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RentManualUrlForm } from '../components/RentManualUrlForm'
import { extractFromManualUrl } from '../services/manualUrlRentExtractor'
import { normalizeListingUrl } from '../services/urlNormalization'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import { getSupabaseClient } from '@/services/supabase/client'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'

/**
 * Check if a raw opportunity with the same normalized URL already exists
 * for this organization under rent module.
 */
async function findDuplicateRawOpportunity(
  organizationId: string,
  normalizedUrl: string,
): Promise<RawOpportunity | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  // Check raw_opportunities where raw_payload contains the normalizedUrl
  const { data, error } = await supabase
    .from('raw_opportunities')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('property_type', 'rental')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !data) return null

  for (const row of data as RawOpportunity[]) {
    const payload = row.raw_payload ?? {}
    const storedNormalized = typeof payload.normalizedUrl === 'string' ? payload.normalizedUrl : null
    // Compare stored normalized URL with the new one
    if (storedNormalized && storedNormalized === normalizedUrl) {
      return row
    }
    // Fallback: normalize the existing source_url and compare
    if (row.source_url && normalizeListingUrl(row.source_url) === normalizedUrl) {
      return row
    }
  }

  return null
}

export function RentImportUrlPage() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (url: string, notes: string) => {
    if (!organization?.id) {
      toast.error('No organization found.')
      return
    }

    setIsSubmitting(true)

    try {
      const normalizedUrl = normalizeListingUrl(url)

      // 0. Check for duplicate URL
      const existing = await findDuplicateRawOpportunity(organization.id, normalizedUrl)
      if (existing) {
        toast.info('This listing URL was already imported.')
        navigate(`/rent/hunter/manual-completion/${existing.id}`)
        return
      }

      // 1. Find or create a manual_url source for rent
      const sources = await opportunityHunterService.listSources(organization.id, 'rent')
      let source = sources.find((s) => s.type === 'manual_url' && s.is_enabled)

      if (!source) {
        source = await opportunityHunterService.createSource(organization.id, {
          name: 'Manual URL (Rent)',
          type: 'manual_url',
          source_url: null,
          seed_urls: [],
          connector_config: {},
          terms_checked: true,
          allowed_use_notes: 'User-provided listing URLs',
          rate_limit_per_hour: 100,
          contact_email: null,
          is_enabled: true,
          module_type: 'rent',
        })
      }

      // 2. Create a discovery run
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Supabase unavailable.')

      const { data: run, error: runError } = await supabase
        .from('source_connector_runs')
        .insert([{
          organization_id: organization.id,
          source_id: source.id,
          connector_name: 'ManualUrlConnector',
          connector_type: 'manual_url',
          status: 'succeeded',
          opportunities_fetched: 1,
          opportunities_inserted: 1,
          opportunities_deduplicated: 0,
          opportunities_matched: 0,
          metadata: { source: 'manual_url_import', module_type: 'rent' },
        }])
        .select('*')
        .single()

      if (runError || !run) throw new Error(runError?.message ?? 'Failed to create run.')

      // 3. Extract placeholder and create raw opportunity
      const extracted = extractFromManualUrl(url)
      const rawPayload = {
        ...extracted.rawOpportunity.raw_payload,
        notes: notes || undefined,
        normalizedUrl,
      }

      const { data: rawOpp, error: rawError } = await supabase
        .from('raw_opportunities')
        .insert([{
          organization_id: organization.id,
          source_id: source.id,
          connector_run_id: run.id,
          title: extracted.rawOpportunity.title,
          source_url: url,
          city: null,
          district: null,
          price: null,
          currency: 'EUR',
          size_m2: null,
          bedrooms: null,
          property_type: 'rental',
          raw_payload: rawPayload,
          normalized_payload: rawPayload,
        }])
        .select('*')
        .single()

      if (rawError || !rawOpp) throw new Error(rawError?.message ?? 'Failed to create raw opportunity.')

      toast.success('URL imported. Fill in the details on the next screen.')
      navigate(`/rent/hunter/manual-completion/${rawOpp.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/rent/hunter')} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Rent Hunter
      </Button>

      <RentManualUrlForm
        onSubmit={(url, notes) => handleSubmit(url, notes)}
        onCancel={() => navigate('/rent/hunter')}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}