import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { saveUserApartment } from '../services/rentStorage'
import type { RentalApartment } from '../types'

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

const INITIAL_FORM: FormData = {
  title: '',
  city: '',
  district: '',
  address: '',
  monthlyRent: '',
  currency: 'EUR',
  sizeM2: '',
  bedrooms: '',
  furnished: false,
  parking: false,
  balcony: false,
  elevator: false,
  petsAllowed: false,
  floor: '',
  listingUrl: '',
  notes: '',
  contactName: '',
  contactPhone: '',
  nextAction: '',
}

export function NewRentOpportunityPage() {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)

  const updateText = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const updateBool = (key: keyof FormData, value: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.city.trim() || !formData.district.trim() || !formData.monthlyRent || !formData.sizeM2 || !formData.bedrooms) {
      toast.error('Please fill in all required fields.')
      return
    }

    setIsSaving(true)

    try {
      const apartment: RentalApartment = {
        id: `rent-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        status: 'new',
        contactName: formData.contactName.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        nextAction: formData.nextAction.trim() || undefined,
      }

      saveUserApartment(apartment)
      toast.success('Rental listing saved locally.')
      navigate(`/rent/${apartment.id}`)
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent
        </Button>
      </div>

      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Add Rental Listing</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Enter details about a rental apartment. Saved locally in your browser.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Apartment Details</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Title*</Label>
              <Input id="title" required value={formData.title} onChange={(e) => updateText('title', e.target.value)} placeholder="Modern 2BR near Liman Park" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City*</Label>
                <Input id="city" required value={formData.city} onChange={(e) => updateText('city', e.target.value)} placeholder="Novi Sad" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District*</Label>
                <Input id="district" required value={formData.district} onChange={(e) => updateText('district', e.target.value)} placeholder="Liman 2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateText('address', e.target.value)} placeholder="Bulevar Cara Lazara 42" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Monthly Rent*</Label>
                <Input id="monthlyRent" type="number" min={0} required value={formData.monthlyRent} onChange={(e) => updateText('monthlyRent', e.target.value)} placeholder="650" />
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
                <Input id="sizeM2" type="number" min={0} required value={formData.sizeM2} onChange={(e) => updateText('sizeM2', e.target.value)} placeholder="55" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms*</Label>
                <Input id="bedrooms" type="number" min={0} required value={formData.bedrooms} onChange={(e) => updateText('bedrooms', e.target.value)} placeholder="2" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input id="floor" type="number" min={0} value={formData.floor} onChange={(e) => updateText('floor', e.target.value)} placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listingUrl">Listing URL</Label>
                <Input id="listingUrl" type="url" value={formData.listingUrl} onChange={(e) => updateText('listingUrl', e.target.value)} placeholder="https://..." />
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
                <Input id="contactName" value={formData.contactName} onChange={(e) => updateText('contactName', e.target.value)} placeholder="Landlord or agent name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input id="contactPhone" value={formData.contactPhone} onChange={(e) => updateText('contactPhone', e.target.value)} placeholder="+381..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextAction">Next Action</Label>
                <Input id="nextAction" value={formData.nextAction} onChange={(e) => updateText('nextAction', e.target.value)} placeholder="e.g. Schedule viewing" />
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={formData.notes} onChange={(e) => updateText('notes', e.target.value)} placeholder="Any additional notes about the apartment, neighbourhood, or landlord." />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/rent')} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Listing'}
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