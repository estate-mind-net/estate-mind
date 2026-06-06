import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import type { Property } from '@/lib/types'
import { generateDealAnalysis } from '@/services/api/dealAnalysis.service'
import { isProduction } from '@/services/config'
import { opportunityWorkspaceService, type CreateOpportunityInput } from '@/services/supabase/opportunityWorkspace.service'
import type { PropertyCondition, PropertyType } from '@/lib/types'

type NewOpportunityFormData = {
  title: string
  country: string
  city: string
  district: string
  propertyType: PropertyType
  askingPrice: string
  currency: string
  sizeSqm: string
  bedrooms: string
  condition: PropertyCondition
  listingUrl: string
  description: string
}

const INITIAL_FORM_DATA: NewOpportunityFormData = {
  title: '',
  country: '',
  city: '',
  district: '',
  propertyType: 'apartment',
  askingPrice: '',
  currency: 'EUR',
  sizeSqm: '',
  bedrooms: '',
  condition: 'good',
  listingUrl: '',
  description: '',
}

const DEMO_FORM_DATA: NewOpportunityFormData = {
  title: 'Central Lisbon 2BR Apartment',
  country: 'Portugal',
  city: 'Lisbon',
  district: 'Alcantara',
  propertyType: 'apartment',
  askingPrice: '128000',
  currency: 'EUR',
  sizeSqm: '56',
  bedrooms: '2',
  condition: 'excellent',
  listingUrl: 'https://example.com/central-lisbon-2br-apartment',
  description:
    'Renovated two-bedroom apartment in a central district, close to schools, public transport, cafes, and major employment zones. Suitable for long-term rental or owner occupation.',
}

const toPayload = (formData: NewOpportunityFormData): CreateOpportunityInput => ({
  title: formData.title.trim(),
  country: formData.country.trim(),
  city: formData.city.trim(),
  district: formData.district.trim(),
  propertyType: formData.propertyType,
  askingPrice: Number(formData.askingPrice),
  currency: formData.currency,
  sizeSqm: Number(formData.sizeSqm),
  bedrooms: Number(formData.bedrooms),
  condition: formData.condition,
  listingUrl: formData.listingUrl.trim(),
  description: formData.description.trim(),
})

const toPropertyForAnalysis = (input: CreateOpportunityInput): Property => ({
  id: `new-opportunity-${Date.now()}`,
  title: input.title,
  country: input.country,
  city: input.city,
  district: input.district,
  propertyType: input.propertyType,
  askingPrice: input.askingPrice,
  currency: input.currency,
  sizeSqm: input.sizeSqm,
  bedrooms: input.bedrooms,
  condition: input.condition,
  listingUrl: input.listingUrl,
  description: input.description,
  createdAt: new Date().toISOString(),
})

export function NewOpportunityPage() {
  const navigate = useNavigate()
  const { user, profile, organization } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<NewOpportunityFormData>(INITIAL_FORM_DATA)

  const handleFillDemoData = () => {
    setFormData(DEMO_FORM_DATA)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    console.info('[new-opportunity] submit check', {
      authUserId: user?.id ?? null,
      organizationId: organization?.id ?? null,
      profileId: profile?.id ?? null,
      profileOrganizationId: profile?.organization_id ?? null,
    })

    if (!user?.id || !organization?.id) {
      console.error('[new-opportunity] blocked: missing user or organization', {
        hasUser: Boolean(user?.id),
        hasOrganization: Boolean(organization?.id),
        profileOrganizationId: profile?.organization_id ?? null,
      })
      toast.error('Your account does not have an active organization yet.')
      return
    }

    setIsSaving(true)
    console.info('[new-opportunity] create started')

    try {
      const payload = toPayload(formData)
      let opportunityId = ''

      try {
        const result = await opportunityWorkspaceService.createOpportunity(payload, {
          organizationId: organization.id,
          userId: user.id,
          profileId: profile?.id,
        })
        opportunityId = result.opportunityId
        console.info('[new-opportunity] create succeeded', { opportunityId })
      } catch (createError) {
        throw new Error(createError instanceof Error ? createError.message : 'Failed to create opportunity.')
      }

      try {
        navigate(`/opportunities/${opportunityId}`)
      } catch (navigateError) {
        console.error('[new-opportunity] navigate failed', navigateError)
        throw new Error('Opportunity was created, but redirect failed. Please open it from My Opportunities.')
      }

      toast.success('Opportunity saved successfully. AI analysis will continue in the background.')

      void (async () => {
        try {
          const analysis = await generateDealAnalysis(toPropertyForAnalysis(payload))
          const persistResult = await opportunityWorkspaceService.persistOpportunityAnalysis(analysis, {
            organizationId: organization.id,
            opportunityId,
          })

          if (!persistResult.saved) {
            const warningMessage = persistResult.warning ?? 'Opportunity was saved, but AI analysis note could not be persisted.'
            console.warn('[new-opportunity] AI failed', { warning: warningMessage, opportunityId })
            toast.warning(`Opportunity saved. AI analysis warning: ${warningMessage}`)
          }
        } catch (analysisError) {
          const warningMessage = analysisError instanceof Error
            ? analysisError.message
            : 'Opportunity was saved, but AI analysis failed.'
          console.warn('[new-opportunity] AI failed', { warning: warningMessage, opportunityId })
          toast.warning(`Opportunity saved. AI analysis warning: ${warningMessage}`)
        }
      })()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Failed to create opportunity.'
      if (isProduction()) {
        toast.error('Could not create the opportunity. Please try again.')
      } else {
        toast.error(rawMessage)
      }
    } finally {
      setIsSaving(false)
      console.info('[new-opportunity] submit finished')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/opportunities')} className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Button>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">New Opportunity</h1>
          <p className="mt-2 text-sm sm:text-base text-foreground/70">
            Add a property opportunity to your organization workspace.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={handleFillDemoData}>
          Fill Demo Data
        </Button>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Property Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Modern 2BR Apartment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-type">Property Type*</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData((current) => ({ ...current, propertyType: value as PropertyType }))}
                >
                  <SelectTrigger id="property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="mixed-use">Mixed Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="country">Country*</Label>
                <Input
                  id="country"
                  required
                  value={formData.country}
                  onChange={(event) => setFormData((current) => ({ ...current, country: event.target.value }))}
                  placeholder="Portugal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City*</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Lisbon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District*</Label>
                <Input
                  id="district"
                  required
                  value={formData.district}
                  onChange={(event) => setFormData((current) => ({ ...current, district: event.target.value }))}
                  placeholder="Principe Real"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="asking-price">Asking Price*</Label>
                <Input
                  id="asking-price"
                  type="number"
                  min="0"
                  required
                  value={formData.askingPrice}
                  onChange={(event) => setFormData((current) => ({ ...current, askingPrice: event.target.value }))}
                  placeholder="425000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency*</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData((current) => ({ ...current, currency: value }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (EUR)</SelectItem>
                    <SelectItem value="USD">USD (USD)</SelectItem>
                    <SelectItem value="GBP">GBP (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size-m2">Size m2*</Label>
                <Input
                  id="size-m2"
                  type="number"
                  min="0"
                  required
                  value={formData.sizeSqm}
                  onChange={(event) => setFormData((current) => ({ ...current, sizeSqm: event.target.value }))}
                  placeholder="85"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms*</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  required
                  value={formData.bedrooms}
                  onChange={(event) => setFormData((current) => ({ ...current, bedrooms: event.target.value }))}
                  placeholder="2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition*</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData((current) => ({ ...current, condition: value as PropertyCondition }))}
                >
                  <SelectTrigger id="condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="needs-renovation">Needs Renovation</SelectItem>
                    <SelectItem value="under-construction">Under Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-url">Listing URL*</Label>
              <Input
                id="listing-url"
                type="url"
                required
                value={formData.listingUrl}
                onChange={(event) => setFormData((current) => ({ ...current, listingUrl: event.target.value }))}
                placeholder="https://example.com/listing/123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description*</Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe the property, neighborhood context, and any important details."
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/opportunities')} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
