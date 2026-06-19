import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface RentBriefFormState {
  title: string
  city: string
  districts: string
  max_rent: string
  min_rent: string
  currency: string
  min_size_m2: string
  max_size_m2: string
  bedrooms: string
  furnished_required: boolean
  parking_required: boolean
  balcony_required: boolean
  elevator_required: boolean
  pets_allowed_required: boolean
  remote_work_important: boolean
  quiet_important: boolean
  max_floor: string
  notes: string
  is_active: boolean
}

const emptyForm: RentBriefFormState = {
  title: '',
  city: 'Novi Sad',
  districts: '',
  max_rent: '',
  min_rent: '',
  currency: 'EUR',
  min_size_m2: '',
  max_size_m2: '',
  bedrooms: '',
  furnished_required: false,
  parking_required: false,
  balcony_required: false,
  elevator_required: false,
  pets_allowed_required: false,
  remote_work_important: false,
  quiet_important: false,
  max_floor: '',
  notes: '',
  is_active: true,
}

const splitCsv = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean)
const parseNumber = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function RentHunterFormPage() {
  const navigate = useNavigate()
  const { organization } = useAuth()

  const [form, setForm] = useState<RentBriefFormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!organization?.id) {
      toast.error('Organization context is required.')
      return
    }

    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }

    if (!form.city.trim()) {
      toast.error('City is required.')
      return
    }

    if (!form.max_rent.trim()) {
      toast.error('Max rent is required.')
      return
    }

    setIsSaving(true)
    try {
      const districts = splitCsv(form.districts)
      const maxRent = parseNumber(form.max_rent) ?? 0

      const payload = {
        title: form.title.trim(),
        countries: ['Serbia'],
        cities: [form.city.trim()],
        districts,
        min_price: parseNumber(form.min_rent),
        max_price: maxRent,
        currency: form.currency.trim() || 'EUR',
        min_size_m2: parseNumber(form.min_size_m2),
        max_size_m2: parseNumber(form.max_size_m2),
        property_types: ['apartment'],
        rental_strategy: 'long_term' as const,
        target_yield: null,
        risk_tolerance: 'medium' as const,
        renovation_preference: 'any' as const,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
        module_type: 'rent',
        module_data: {
          furnished_required: form.furnished_required,
          parking_required: form.parking_required,
          balcony_required: form.balcony_required,
          elevator_required: form.elevator_required,
          pets_allowed_required: form.pets_allowed_required,
          remote_work_important: form.remote_work_important,
          quiet_important: form.quiet_important,
          max_floor: parseNumber(form.max_floor),
          preferred_districts: districts,
          bedrooms: parseNumber(form.bedrooms),
        },
      }

      // Create the brief via the existing service (module_type included in initial insert)
      const created = await opportunityHunterService.createBrief(organization.id, payload)

      toast.success('Rent search brief created.')
      navigate(`/rent/hunter/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save brief.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/rent/hunter')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Rent Hunter
      </Button>

      <Card className="p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">New Rent Search Brief</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define your rental criteria for apartment discovery.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g. 2BR Liman under €600"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Districts (comma-separated)</Label>
            <Input
              placeholder="Liman, Center, Grbavica"
              value={form.districts}
              onChange={(e) => setForm((prev) => ({ ...prev, districts: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <Input
              type="number"
              placeholder="2"
              value={form.bedrooms}
              onChange={(e) => setForm((prev) => ({ ...prev, bedrooms: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Monthly Rent</Label>
            <Input
              type="number"
              placeholder="600"
              value={form.max_rent}
              onChange={(e) => setForm((prev) => ({ ...prev, max_rent: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Min Monthly Rent (optional)</Label>
            <Input
              type="number"
              placeholder="300"
              value={form.min_rent}
              onChange={(e) => setForm((prev) => ({ ...prev, min_rent: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Min Size (m²)</Label>
            <Input
              type="number"
              placeholder="40"
              value={form.min_size_m2}
              onChange={(e) => setForm((prev) => ({ ...prev, min_size_m2: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Size (m², optional)</Label>
            <Input
              type="number"
              placeholder="80"
              value={form.max_size_m2}
              onChange={(e) => setForm((prev) => ({ ...prev, max_size_m2: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Floor (optional)</Label>
            <Input
              type="number"
              placeholder="5"
              value={form.max_floor}
              onChange={(e) => setForm((prev) => ({ ...prev, max_floor: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="font-display text-lg font-semibold">Requirements</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.furnished_required}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, furnished_required: checked }))}
              />
              <Label>Furnished required</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.parking_required}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, parking_required: checked }))}
              />
              <Label>Parking required</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.balcony_required}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, balcony_required: checked }))}
              />
              <Label>Balcony preferred</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.elevator_required}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, elevator_required: checked }))}
              />
              <Label>Elevator preferred</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.pets_allowed_required}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, pets_allowed_required: checked }))}
              />
              <Label>Pets allowed required</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.remote_work_important}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, remote_work_important: checked }))}
              />
              <Label>Remote work important</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.quiet_important}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, quiet_important: checked }))}
              />
              <Label>Quiet area important</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            placeholder="Additional preferences or context..."
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
          />
          <Label>Active brief</Label>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Create Rent Brief'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/rent/hunter')}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}