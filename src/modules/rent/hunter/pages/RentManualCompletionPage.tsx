import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/services/supabase/client'
import { evaluateRentMatch, type RentSearchBrief } from '../rentMatchingEngine'
import { rentSupabaseAdapter } from '../../services/rentSupabaseAdapter'
import { FourZidaPasteHelper } from '../components/FourZidaPasteHelper'
import type { RawOpportunity } from '@/lib/types/opportunityHunter'
import type { RentalApartment } from '../../types'

interface ListingFormData {
  title: string
  city: string
  district: string
  monthlyRent: string
  currency: string
  sizeM2: string
  bedrooms: string
  floor: string
  furnished: boolean
  parking: boolean
  balcony: boolean
  elevator: boolean
  petsAllowed: boolean
}

const emptyForm: ListingFormData = {
  title: '',
  city: 'Novi Sad',
  district: '',
  monthlyRent: '',
  currency: 'EUR',
  sizeM2: '',
  bedrooms: '',
  floor: '',
  furnished: false,
  parking: false,
  balcony: false,
  elevator: false,
  petsAllowed: false,
}

export function RentManualCompletionPage() {
  const { rawId } = useParams<{ rawId: string }>()
  const navigate = useNavigate()
  const { user, organization } = useAuth()

  const [form, setForm] = useState<ListingFormData>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isMatching, setIsMatching] = useState(false)
  const [rawOpp, setRawOpp] = useState<RawOpportunity | null>(null)
  const [matchResult, setMatchResult] = useState<{
    matchScore: number
    matchReasons: string[]
    mismatchReasons: string[]
  } | null>(null)

  useEffect(() => {
    if (!rawId || !organization?.id) { setIsLoading(false); return }

    async function load() {
      const supabase = getSupabaseClient()
      if (!supabase) { setIsLoading(false); return }

      const { data, error } = await supabase
        .from('raw_opportunities')
        .select('*')
        .eq('organization_id', organization!.id)
        .eq('id', rawId!)
        .maybeSingle()

      if (error || !data) {
        toast.error('Raw opportunity not found.')
        navigate('/rent/hunter')
        return
      }

      const raw = data as RawOpportunity
      setRawOpp(raw)
      setForm({
        title: raw.title || '',
        city: raw.city || 'Novi Sad',
        district: raw.district || '',
        monthlyRent: raw.price != null ? String(raw.price) : '',
        currency: raw.currency || 'EUR',
        sizeM2: raw.size_m2 != null ? String(raw.size_m2) : '',
        bedrooms: raw.bedrooms != null ? String(raw.bedrooms) : '',
        floor: '',
        furnished: false,
        parking: false,
        balcony: false,
        elevator: false,
        petsAllowed: false,
      })
      setIsLoading(false)
    }

    void load()
  }, [rawId, organization?.id, navigate])

  const update = (patch: Partial<ListingFormData>) => setForm((prev) => ({ ...prev, ...patch }))

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validate = (): string[] => {
    const errors: string[] = []
    if (!form.city.trim()) errors.push('City is required.')
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) errors.push('Monthly rent is required and must be greater than 0.')
    if (!form.sizeM2 || Number(form.sizeM2) <= 0) errors.push('Size (m²) is required and must be greater than 0.')
    if (form.bedrooms === '' || Number(form.bedrooms) < 0) errors.push('Bedrooms is required and must be 0 or more.')
    return errors
  }

  const handleSaveAndMatch = async () => {
    if (!rawOpp || !organization?.id || !user?.id) return
    const errors = validate()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])

    setIsSaving(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Supabase unavailable.')

      // Update the raw opportunity with completed data
      const updatedPayload = {
        ...(rawOpp.raw_payload ?? {}),
        needs_manual_completion: false,
        furnished: form.furnished,
        parking: form.parking,
        balcony: form.balcony,
        elevator: form.elevator,
        petsAllowed: form.petsAllowed,
        floor: form.floor ? Number(form.floor) : undefined,
        contactName: undefined,
        contactPhone: undefined,
      }

      const { error: updateError } = await supabase
        .from('raw_opportunities')
        .update({
          title: form.title || `Listing in ${form.city}`,
          city: form.city,
          district: form.district || null,
          price: Number(form.monthlyRent),
          currency: form.currency,
          size_m2: form.sizeM2 ? Number(form.sizeM2) : null,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          raw_payload: updatedPayload,
          normalized_payload: updatedPayload,
        })
        .eq('id', rawOpp.id)

      if (updateError) throw new Error(updateError.message)

      // Run matching against active rent briefs
      setIsMatching(true)
      const briefs = await supabase
        .from('investment_search_briefs')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .or('module_type.is.null,module_type.eq.rent')

      const rentBriefs = (briefs.data ?? []).filter(
        (b: Record<string, unknown>) => (b as { module_type?: string }).module_type === 'rent',
      ) as unknown as RentSearchBrief[]

      const updatedRaw: RawOpportunity = {
        ...rawOpp,
        title: form.title || `Listing in ${form.city}`,
        city: form.city,
        district: form.district || null,
        price: Number(form.monthlyRent),
        currency: form.currency,
        size_m2: form.sizeM2 ? Number(form.sizeM2) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        raw_payload: updatedPayload,
      }

      let bestScore = 0
      let bestReasons: string[] = []
      let bestMismatches: string[] = []

      for (const brief of rentBriefs) {
        const result = evaluateRentMatch(brief, updatedRaw)
        if (result.matchScore > bestScore) {
          bestScore = result.matchScore
          bestReasons = result.matchReasons
          bestMismatches = result.mismatchReasons
        }

        // Store the match
        await supabase
          .from('opportunity_matches')
          .insert([{
            organization_id: organization.id,
            brief_id: brief.id,
            raw_opportunity_id: rawOpp.id,
            source_id: rawOpp.source_id,
          match_score: result.matchScore,
          match_reasons: result.matchReasons,
          mismatch_reasons: result.mismatchReasons,
          missing_data: result.missingData,
          suggested_next_step: result.isRejected ? 'Does not meet criteria' : 'Review and save to Rent',
          rank_score: result.rankScore,
          }])
      }

      setMatchResult({
        matchScore: bestScore,
        matchReasons: bestReasons,
        mismatchReasons: bestMismatches,
      })

      toast.success('Listing completed and matched.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save listing.')
    } finally {
      setIsSaving(false)
      setIsMatching(false)
    }
  }

  const handleSaveToRent = async () => {
    if (!rawOpp || !organization?.id || !user?.id) return

    setIsSaving(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Supabase unavailable.')

      // Reload the updated raw opportunity
      const { data: updated } = await supabase
        .from('raw_opportunities')
        .select('*')
        .eq('id', rawOpp.id)
        .maybeSingle()

      const raw = (updated as RawOpportunity) ?? rawOpp

      const apartment: Omit<RentalApartment, 'id'> = {
        title: raw.title || form.title || 'Imported listing',
        city: raw.city || form.city || 'Novi Sad',
        district: raw.district || form.district || '',
        monthlyRent: raw.price ?? Number(form.monthlyRent) ?? 0,
        currency: raw.currency || form.currency || 'EUR',
        sizeM2: raw.size_m2 ?? (form.sizeM2 ? Number(form.sizeM2) : 0),
        bedrooms: raw.bedrooms ?? (form.bedrooms ? Number(form.bedrooms) : 0),
        furnished: form.furnished,
        parking: form.parking,
        balcony: form.balcony,
        elevator: form.elevator,
        petsAllowed: form.petsAllowed,
        floor: form.floor ? Number(form.floor) : undefined,
        listingUrl: raw.source_url ?? undefined,
        status: 'new',
      }

      const result = await rentSupabaseAdapter.createRentApartment(apartment, {
        organizationId: organization.id,
        userId: user.id,
      })

      if (result.success && result.data) {
        toast.success('Saved to Rent.')
        navigate(`/rent/${result.data.id}`)
      } else {
        toast.error(result.error ?? 'Failed to save apartment.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save to Rent.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent/hunter')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent Hunter
        </Button>
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Loading listing...</p>
        </Card>
      </div>
    )
  }

  const is4zida = rawOpp?.source_url?.includes('4zida.rs') ?? false

  const handleApplyParsedFields = (fields: Record<string, unknown>) => {
    setForm((prev) => ({
      ...prev,
      ...(fields.title != null && { title: String(fields.title) }),
      ...(fields.city != null && { city: String(fields.city) }),
      ...(fields.district != null && { district: String(fields.district) }),
      ...(fields.monthlyRent != null && { monthlyRent: String(fields.monthlyRent) }),
      ...(fields.currency != null && { currency: String(fields.currency) }),
      ...(fields.sizeM2 != null && { sizeM2: String(fields.sizeM2) }),
      ...(fields.bedrooms != null && { bedrooms: String(fields.bedrooms) }),
      ...(fields.floor != null && { floor: String(fields.floor) }),
      ...(fields.furnished != null && { furnished: Boolean(fields.furnished) }),
      ...(fields.parking != null && { parking: Boolean(fields.parking) }),
      ...(fields.balcony != null && { balcony: Boolean(fields.balcony) }),
      ...(fields.elevator != null && { elevator: Boolean(fields.elevator) }),
      ...(fields.petsAllowed != null && { petsAllowed: Boolean(fields.petsAllowed) }),
    }))
    toast.success('Fields applied from 4zida text.')
  }

  const scoreColor = (matchResult?.matchScore ?? 0) >= 80 ? 'text-green-600' :
    (matchResult?.matchScore ?? 0) >= 60 ? 'text-yellow-600' :
    (matchResult?.matchScore ?? 0) >= 40 ? 'text-orange-600' : 'text-red-600'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/rent/hunter')} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Rent Hunter
      </Button>

      <Card className="p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Complete Listing Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the property details from the listing URL.
          </p>
          <div className="mt-3 rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> We do not scrape this site. Please confirm listing details manually.
          </div>
          {rawOpp?.source_url && (
            <p className="text-xs mt-2">
              <a href={rawOpp.source_url} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">
                {rawOpp.source_url}
              </a>
            </p>
          )}
        </div>

        {/* 4zida helper — only visible for 4zida.rs URLs */}
        {is4zida && (
          <FourZidaPasteHelper onApply={handleApplyParsedFields} />
        )}

        {/* Basic Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Cozy 2BR in Liman" />
          </div>
          <div className="space-y-2">
            <Label>City *</Label>
            <Input value={form.city} onChange={(e) => update({ city: e.target.value })} placeholder="Novi Sad" />
          </div>
          <div className="space-y-2">
            <Label>District</Label>
            <Input value={form.district} onChange={(e) => update({ district: e.target.value })} placeholder="Liman" />
          </div>
          <div className="space-y-2">
            <Label>Monthly Rent *</Label>
            <Input type="number" value={form.monthlyRent} onChange={(e) => update({ monthlyRent: e.target.value })} placeholder="550" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => update({ currency: e.target.value })} placeholder="EUR" />
          </div>
          <div className="space-y-2">
            <Label>Size (m²)</Label>
            <Input type="number" value={form.sizeM2} onChange={(e) => update({ sizeM2: e.target.value })} placeholder="55" />
          </div>
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <Input type="number" value={form.bedrooms} onChange={(e) => update({ bedrooms: e.target.value })} placeholder="2" />
          </div>
          <div className="space-y-2">
            <Label>Floor</Label>
            <Input type="number" value={form.floor} onChange={(e) => update({ floor: e.target.value })} placeholder="3" />
          </div>
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'furnished' as const, label: 'Furnished' },
              { key: 'parking' as const, label: 'Parking' },
              { key: 'balcony' as const, label: 'Balcony' },
              { key: 'elevator' as const, label: 'Elevator' },
              { key: 'petsAllowed' as const, label: 'Pets Allowed' },
            ].map((amenity) => (
              <label key={amenity.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[amenity.key]}
                  onChange={(e) => update({ [amenity.key]: e.target.checked })}
                  className="rounded border-input"
                />
                {amenity.label}
              </label>
            ))}
          </div>
        </div>

        {/* Match Result */}
        {matchResult && (
          <Card className="p-4 bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Match Result</h3>
              <p className={`text-2xl font-bold ${scoreColor}`}>{matchResult.matchScore}/100</p>
            </div>
            {matchResult.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {matchResult.matchReasons.map((r, i) => (
                  <Badge key={i} variant="default" className="text-xs gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {r}
                  </Badge>
                ))}
              </div>
            )}
            {matchResult.mismatchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {matchResult.mismatchReasons.map((r, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">{r}</Badge>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-sm text-destructive">{err}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          {!matchResult ? (
            <>
              <Button variant="outline" onClick={() => navigate('/rent/hunter')} disabled={isSaving || isMatching}>
                Cancel
              </Button>
              <Button onClick={handleSaveAndMatch} disabled={isSaving || isMatching}>
                {isSaving ? 'Saving...' : isMatching ? 'Matching...' : 'Save & Match'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate('/rent/hunter')}>
                Done
              </Button>
              <Button onClick={handleSaveToRent} disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isSaving ? 'Saving...' : 'Save to Rent'}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}