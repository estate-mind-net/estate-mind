import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { opportunityHunterService } from '@/services/supabase/opportunityHunter.service'
import type { InvestmentSearchBrief } from '@/lib/types/opportunityHunter'

interface BriefFormState {
  title: string
  countries: string
  cities: string
  districts: string
  min_price: string
  max_price: string
  currency: string
  min_size_m2: string
  max_size_m2: string
  property_types: string
  rental_strategy: InvestmentSearchBrief['rental_strategy']
  target_yield: string
  risk_tolerance: InvestmentSearchBrief['risk_tolerance']
  renovation_preference: InvestmentSearchBrief['renovation_preference']
  notes: string
  is_active: boolean
}

const emptyForm: BriefFormState = {
  title: '',
  countries: '',
  cities: '',
  districts: '',
  min_price: '',
  max_price: '',
  currency: 'EUR',
  min_size_m2: '',
  max_size_m2: '',
  property_types: '',
  rental_strategy: 'mixed',
  target_yield: '',
  risk_tolerance: 'medium',
  renovation_preference: 'any',
  notes: '',
  is_active: true,
}

const splitCsv = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean)
const parseNumber = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function OpportunityHunterFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = useMemo(() => Boolean(id), [id])
  const navigate = useNavigate()
  const { organization } = useAuth()

  const [form, setForm] = useState<BriefFormState>(emptyForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!isEdit || !id || !organization?.id) return

      setIsLoading(true)
      try {
        const brief = await opportunityHunterService.getBrief(organization.id, id)
        if (!brief) {
          toast.error('Search brief not found.')
          navigate('/opportunity-hunter')
          return
        }

        setForm({
          title: brief.title,
          countries: brief.countries.join(', '),
          cities: brief.cities.join(', '),
          districts: brief.districts.join(', '),
          min_price: brief.min_price?.toString() ?? '',
          max_price: brief.max_price?.toString() ?? '',
          currency: brief.currency ?? 'EUR',
          min_size_m2: brief.min_size_m2?.toString() ?? '',
          max_size_m2: brief.max_size_m2?.toString() ?? '',
          property_types: brief.property_types.join(', '),
          rental_strategy: brief.rental_strategy,
          target_yield: brief.target_yield?.toString() ?? '',
          risk_tolerance: brief.risk_tolerance,
          renovation_preference: brief.renovation_preference,
          notes: brief.notes ?? '',
          is_active: brief.is_active,
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load brief.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id, isEdit, navigate, organization?.id])

  const handleSave = async () => {
    if (!organization?.id) {
      toast.error('Organization context is required.')
      return
    }

    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        countries: splitCsv(form.countries),
        cities: splitCsv(form.cities),
        districts: splitCsv(form.districts),
        min_price: parseNumber(form.min_price),
        max_price: parseNumber(form.max_price),
        currency: form.currency.trim() || null,
        min_size_m2: parseNumber(form.min_size_m2),
        max_size_m2: parseNumber(form.max_size_m2),
        property_types: splitCsv(form.property_types),
        rental_strategy: form.rental_strategy,
        target_yield: parseNumber(form.target_yield),
        risk_tolerance: form.risk_tolerance,
        renovation_preference: form.renovation_preference,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      }

      if (isEdit && id) {
        await opportunityHunterService.updateBrief(organization.id, id, payload)
        toast.success('Search brief updated.')
        navigate(`/opportunity-hunter/${id}`)
      } else {
        const created = await opportunityHunterService.createBrief(organization.id, payload)
        toast.success('Search brief created.')
        navigate(`/opportunity-hunter/${created.id}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save brief.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading brief...</p>
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/opportunity-hunter')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Opportunity Hunter
      </Button>

      <Card className="p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{isEdit ? 'Edit Search Brief' : 'New Search Brief'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define your acquisition criteria for nightly opportunity discovery.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Countries (comma-separated)</Label>
            <Input value={form.countries} onChange={(e) => setForm((prev) => ({ ...prev, countries: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Cities (comma-separated)</Label>
            <Input value={form.cities} onChange={(e) => setForm((prev) => ({ ...prev, cities: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Districts (comma-separated)</Label>
            <Input value={form.districts} onChange={(e) => setForm((prev) => ({ ...prev, districts: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Property Types (comma-separated)</Label>
            <Input value={form.property_types} onChange={(e) => setForm((prev) => ({ ...prev, property_types: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Min Price</Label>
            <Input type="number" value={form.min_price} onChange={(e) => setForm((prev) => ({ ...prev, min_price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Max Price</Label>
            <Input type="number" value={form.max_price} onChange={(e) => setForm((prev) => ({ ...prev, max_price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Min Size (m2)</Label>
            <Input type="number" value={form.min_size_m2} onChange={(e) => setForm((prev) => ({ ...prev, min_size_m2: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Max Size (m2)</Label>
            <Input type="number" value={form.max_size_m2} onChange={(e) => setForm((prev) => ({ ...prev, max_size_m2: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Target Yield (%)</Label>
            <Input type="number" value={form.target_yield} onChange={(e) => setForm((prev) => ({ ...prev, target_yield: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Rental Strategy</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.rental_strategy}
              onChange={(e) => setForm((prev) => ({ ...prev, rental_strategy: e.target.value as InvestmentSearchBrief['rental_strategy'] }))}
            >
              <option value="long_term">long_term</option>
              <option value="airbnb">airbnb</option>
              <option value="flip">flip</option>
              <option value="mixed">mixed</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Risk Tolerance</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.risk_tolerance}
              onChange={(e) => setForm((prev) => ({ ...prev, risk_tolerance: e.target.value as InvestmentSearchBrief['risk_tolerance'] }))}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Renovation Preference</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.renovation_preference}
              onChange={(e) => setForm((prev) => ({ ...prev, renovation_preference: e.target.value as InvestmentSearchBrief['renovation_preference'] }))}
            >
              <option value="none">none</option>
              <option value="light">light</option>
              <option value="heavy">heavy</option>
              <option value="any">any</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={4} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))} />
            <Label>Active brief</Label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEdit ? 'Update Brief' : 'Create Brief'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/opportunity-hunter')}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
