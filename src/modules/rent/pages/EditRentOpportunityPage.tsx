import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { opportunityRepository } from '../repositories/OpportunityRepository'
import type { RentalApartment } from '../types'
import { useAuth } from '@/hooks/useAuth'



type FormData = {
  title: string
  city: string
  district: string
  address: string
  monthlyRent: string
  currency: string
  sizeM2: string
  bedrooms: string
  furnished: boolean
  parking: boolean
  balcony: boolean
  elevator: boolean
  petsAllowed: boolean
  floor: string
  listingUrl: string
  notes: string
  contactName: string
  contactPhone: string
  nextAction: string
}

function apartmentToForm(apartment: RentalApartment): FormData {
  return {
    title: apartment.title,
    city: apartment.city,
    district: apartment.district,
    address: apartment.address ?? '',
    monthlyRent: String(apartment.monthlyRent),
    currency: apartment.currency,
    sizeM2: String(apartment.sizeM2),
    bedrooms: String(apartment.bedrooms),
    furnished: apartment.furnished,
    parking: apartment.parking,
    balcony: apartment.balcony,
    elevator: apartment.elevator,
    petsAllowed: apartment.petsAllowed,
    floor: apartment.floor !== undefined ? String(apartment.floor) : '',
    listingUrl: apartment.listingUrl ?? '',
    notes: apartment.notes ?? '',
    contactName: apartment.contactName ?? '',
    contactPhone: apartment.contactPhone ?? '',
    nextAction: apartment.nextAction ?? '',
  }
}

export function EditRentOpportunityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [apartment, setApartment] = useState<RentalApartment | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }

    let cancelled = false

    async function load() {
      if (organization?.id && user?.id) {
        try {
          const result = await opportunityRepository.getById(id!, {
            organizationId: organization.id,
            userId: user.id,
          })
          if (!cancelled && result.success && result.data) {
            setApartment(result.data)
            setSource('cloud')
            setFormData(apartmentToForm(result.data))
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) { setLoading(false) }
    }

    load()
    return () => { cancelled = true }
  }, [id, organization?.id, user?.id])

  const updateText = (key: keyof FormData, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateBool = (key: keyof FormData, value: boolean) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData || !apartment) return

    if (!formData.title.trim() || !formData.city.trim() || !formData.district.trim() || !formData.monthlyRent || !formData.sizeM2 || !formData.bedrooms) {
      toast.error('Please fill in all required fields.')
      return
    }

    setIsSaving(true)

    const updated: RentalApartment = {
      ...apartment,
      title: formData.title.trim(),
      city: formData.city.trim(),
      district: formData.district.trim(),
      address: formData.address.trim() || undefined,
      monthlyRent: Number(formData.monthlyRent),
      currency: formData.currency,
      sizeM2: Number(formData.sizeM2),
      bedrooms: Number(formData.bedrooms),
      furnished: formData.furnished,
      parking: formData.parking,
      balcony: formData.balcony,
      elevator: formData.elevator,
      petsAllowed: formData.petsAllowed,
      floor: formData.floor ? Number(formData.floor) : undefined,
      listingUrl: formData.listingUrl.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      contactName: formData.contactName.trim() || undefined,
      contactPhone: formData.contactPhone.trim() || undefined,
      nextAction: formData.nextAction.trim() || undefined,
    }

    try {
      if (source === 'cloud' && organization?.id) {
        const result = await opportunityRepository.update(updated, {
          organizationId: organization.id,
          userId: user?.id ?? '',
        })
        if (result.success) {
          toast.success('Listing updated in cloud.')
          navigate(`/rent/${updated.id}`)
          return
        }
        toast.error(result.error ?? 'Failed to update in cloud.')
      } else {
        updateUserApartment(updated)
        toast.success('Listing updated.')
        navigate(`/rent/${updated.id}`)
      }
    } catch {
      // No fallback - Supabase only
      try {
        updateUserApartment(updated)
        toast.success('Listing updated locally.')
        navigate(`/rent/${updated.id}`)
      } catch {
        toast.error('Failed to update. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent
        </Button>
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Loading apartment...</p>
        </Card>
      </div>
    )
  }

  if (source === 'demo') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent
        </Button>
        <Card className="border-dashed p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Demo apartments cannot be edited</h1>
          <p className="mt-3 text-muted-foreground">
            Only user-created listings can be edited. You can create your own listing and edit it anytime.
          </p>
          <Button className="mt-6" onClick={() => navigate('/rent/new')}>Create New Listing</Button>
        </Card>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent
        </Button>
        <Card className="border-dashed p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Listing not found</h1>
          <p className="mt-3 text-muted-foreground">This listing may have been deleted.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate(`/rent/${id}`)} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Detail
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Edit Listing</h1>
          {source === 'cloud' && <Badge variant="default" className="gap-1"><Cloud className="h-3 w-3" /> Cloud</Badge>}
          {source === 'local' && <Badge variant="secondary" className="gap-1"><Database className="h-3 w-3" /> Local</Badge>}
        </div>
        <p className="text-sm text-foreground/70">
          Update the details of your rental listing.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Apartment Details</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Title*</Label>
              <Input id="title" required value={formData.title} onChange={(e) => updateText('title', e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City*</Label>
                <Input id="city" required value={formData.city} onChange={(e) => updateText('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District*</Label>
                <Input id="district" required value={formData.district} onChange={(e) => updateText('district', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateText('address', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Monthly Rent*</Label>
                <Input id="monthlyRent" type="number" min={0} required value={formData.monthlyRent} onChange={(e) => updateText('monthlyRent', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency*</Label>
                <Select value={formData.currency} onValueChange={(v) => updateText('currency', v)}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="RSD">RSD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizeM2">Size (m²)*</Label>
                <Input id="sizeM2" type="number" min={0} required value={formData.sizeM2} onChange={(e) => updateText('sizeM2', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms*</Label>
                <Input id="bedrooms" type="number" min={0} required value={formData.bedrooms} onChange={(e) => updateText('bedrooms', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input id="floor" type="number" min={0} value={formData.floor} onChange={(e) => updateText('floor', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listingUrl">Listing URL</Label>
                <Input id="listingUrl" type="url" value={formData.listingUrl} onChange={(e) => updateText('listingUrl', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h2 className="font-display text-lg font-bold">Features</h2>
            <ToggleRow label="Furnished" checked={formData.furnished} onChange={(v) => updateBool('furnished', v)} />
            <ToggleRow label="Parking" checked={formData.parking} onChange={(v) => updateBool('parking', v)} />
            <ToggleRow label="Balcony" checked={formData.balcony} onChange={(v) => updateBool('balcony', v)} />
            <ToggleRow label="Elevator" checked={formData.elevator} onChange={(v) => updateBool('elevator', v)} />
            <ToggleRow label="Pets Allowed" checked={formData.petsAllowed} onChange={(v) => updateBool('petsAllowed', v)} />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h2 className="font-display text-lg font-bold">Contact & Next Steps</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input id="contactName" value={formData.contactName} onChange={(e) => updateText('contactName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input id="contactPhone" value={formData.contactPhone} onChange={(e) => updateText('contactPhone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextAction">Next Action</Label>
                <Input id="nextAction" value={formData.nextAction} onChange={(e) => updateText('nextAction', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={formData.notes} onChange={(e) => updateText('notes', e.target.value)} />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(`/rent/${id}`)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <FloppyDisk className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm font-normal cursor-pointer" htmlFor={undefined}>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}