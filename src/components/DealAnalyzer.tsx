import { useState } from 'react'
import { Brain, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import type { Property, PropertyType, PropertyCondition } from '@/lib/types'

interface DealAnalyzerProps {
  onAnalyze: (property: Property) => void | Promise<void>
}

type DealAnalyzerFormData = {
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
  expectedRent: string
  airbnbAssumptions: string
  renovationNotes: string
  legalNotes: string
}

const DEMO_FORM_DATA: DealAnalyzerFormData = {
  title: '2-bedroom apartment near city center',
  country: 'Portugal',
  city: 'Lisbon',
  district: 'Alcantara',
  propertyType: 'apartment',
  askingPrice: '145000',
  currency: 'EUR',
  sizeSqm: '62',
  bedrooms: '2',
  condition: 'good',
  listingUrl: '',
  description: 'A 2-bedroom apartment close to the city center, transit, cafes, and major business districts. Suitable for long-term rental. Light renovation may improve rentability and resale appeal.',
  expectedRent: '750',
  airbnbAssumptions: 'Potential short-term rental demand from business travelers, university visitors, and weekend tourists, but no verified occupancy or ADR data provided.',
  renovationNotes: 'Light renovation may include painting, bathroom refresh, basic furniture upgrade, and lighting improvement. No contractor quote provided.',
  legalNotes: 'No ownership documents, cadastral extract, debt confirmation, legalization status, or lawyer review provided yet.',
}

export function DealAnalyzer({ onAnalyze }: DealAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [formData, setFormData] = useState<DealAnalyzerFormData>({
    title: '',
    country: '',
    city: '',
    district: '',
    propertyType: 'apartment' as PropertyType,
    askingPrice: '',
    currency: 'EUR',
    sizeSqm: '',
    bedrooms: '',
    condition: 'good' as PropertyCondition,
    listingUrl: '',
    description: '',
    expectedRent: '',
    airbnbAssumptions: '',
    renovationNotes: '',
    legalNotes: ''
  })

  const handlePrefillDemoData = () => {
    setFormData(DEMO_FORM_DATA)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)

    const property: Property = {
      id: Date.now().toString(),
      title: formData.title,
      country: formData.country,
      city: formData.city,
      district: formData.district,
      propertyType: formData.propertyType,
      askingPrice: parseFloat(formData.askingPrice),
      currency: formData.currency,
      sizeSqm: parseFloat(formData.sizeSqm),
      bedrooms: parseInt(formData.bedrooms),
      condition: formData.condition,
      listingUrl: formData.listingUrl || undefined,
      description: formData.description,
      expectedRent: formData.expectedRent ? parseFloat(formData.expectedRent) : undefined,
      airbnbAssumptions: formData.airbnbAssumptions || undefined,
      renovationNotes: formData.renovationNotes || undefined,
      legalNotes: formData.legalNotes || undefined,
      createdAt: new Date().toISOString()
    }

    try {
      await onAnalyze(property)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">AI Deal Analyzer</h1>
        <p className="mt-2 text-foreground/70">
          Submit property details for comprehensive AI-powered investment analysis
        </p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold">Property Information</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Property Title*</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Modern 2BR Apartment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-type">Property Type*</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData({ ...formData, propertyType: value as PropertyType })}
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
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Portugal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City*</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Lisbon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District*</Label>
                <Input
                  id="district"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Príncipe Real"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="asking-price">Asking Price*</Label>
                <Input
                  id="asking-price"
                  type="number"
                  required
                  value={formData.askingPrice}
                  onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                  placeholder="425000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency*</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Size (m²)*</Label>
                <Input
                  id="size"
                  type="number"
                  required
                  value={formData.sizeSqm}
                  onChange={(e) => setFormData({ ...formData, sizeSqm: e.target.value })}
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
                  required
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition*</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value as PropertyCondition })}
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
              <Label htmlFor="description">Description*</Label>
              <Textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the property, location features, nearby amenities..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold">Investment Details</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expected-rent">Expected Monthly Rent</Label>
                <Input
                  id="expected-rent"
                  type="number"
                  value={formData.expectedRent}
                  onChange={(e) => setFormData({ ...formData, expectedRent: e.target.value })}
                  placeholder="1800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="listing-url">Listing URL</Label>
                <Input
                  id="listing-url"
                  type="url"
                  value={formData.listingUrl}
                  onChange={(e) => setFormData({ ...formData, listingUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="airbnb">Airbnb Assumptions</Label>
              <Textarea
                id="airbnb"
                value={formData.airbnbAssumptions}
                onChange={(e) => setFormData({ ...formData, airbnbAssumptions: e.target.value })}
                placeholder="Expected daily rate, occupancy estimates, seasonal patterns..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renovation">Renovation Notes</Label>
              <Textarea
                id="renovation"
                value={formData.renovationNotes}
                onChange={(e) => setFormData({ ...formData, renovationNotes: e.target.value })}
                placeholder="Required updates, estimated costs, potential value increase..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal">Legal/Documentation Notes</Label>
              <Textarea
                id="legal"
                value={formData.legalNotes}
                onChange={(e) => setFormData({ ...formData, legalNotes: e.target.value })}
                placeholder="Permits, zoning, title issues, tenant situations..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isAnalyzing}
              onClick={handlePrefillDemoData}
            >
              Prefill Demo Data
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isAnalyzing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isAnalyzing ? (
                <>
                  <Sparkle className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-5 w-5" />
                  Generate AI Analysis
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
