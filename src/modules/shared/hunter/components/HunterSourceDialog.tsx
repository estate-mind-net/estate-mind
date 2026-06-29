import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { OpportunitySource } from '@/lib/types/opportunityHunter'

export type SourceType = 'web_search' | 'demo' | 'manual_url' | 'csv_import' | 'rent_demo' | 'saved_search' | 'rent_web_search' | 'portal_search' | 'live_scraper'

export interface SourceForm {
  name: string
  type: SourceType
  terms_checked: boolean
  allowed_domains: string
  excluded_domains: string
  max_results_per_run: string
  rate_limit_per_hour: string
  is_enabled: boolean
  // saved_search fields
  portal: string
  searchUrl: string
  notes: string
  // portal_search fields
  city: string
  districts: string
  maxRent: string
  minRent: string
  bedrooms: string
  sizeMin: string
  sizeMax: string
  // live_scraper fields
  scraperPortal: string
  scraperMaxPages: string
  scraperBaseUrlOverride: string
}

export const emptySource: SourceForm = {
  name: '',
  type: 'manual_url',
  terms_checked: false,
  allowed_domains: '',
  excluded_domains: '',
  max_results_per_run: '20',
  rate_limit_per_hour: '24',
  is_enabled: true,
  portal: '',
  searchUrl: '',
  notes: '',
  city: '',
  districts: '',
  maxRent: '',
  minRent: '',
  bedrooms: '',
  sizeMin: '',
  sizeMax: '',
  scraperPortal: '',
  scraperMaxPages: '3',
  scraperBaseUrlOverride: '',
}

const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

export function sourceToForm(source: OpportunitySource, supportedTypes: SourceType[]): SourceForm {
  const config = source.connector_config && typeof source.connector_config === 'object'
    ? source.connector_config as Record<string, unknown>
    : {}

  const allowedDomains = Array.isArray(config.allowed_domains)
    ? config.allowed_domains.filter((item): item is string => typeof item === 'string').join(', ')
    : ''
  const excludedDomains = Array.isArray(config.excluded_domains)
    ? config.excluded_domains.filter((item): item is string => typeof item === 'string').join(', ')
    : ''
  const maxResultsPerRun = Number(config.max_results_per_run)

  return {
    name: source.name,
    type: supportedTypes.includes(source.type as SourceType) ? source.type as SourceType : supportedTypes[0],
    terms_checked: source.terms_checked,
    allowed_domains: allowedDomains,
    excluded_domains: excludedDomains,
    max_results_per_run: Number.isFinite(maxResultsPerRun) && maxResultsPerRun > 0 ? String(maxResultsPerRun) : '20',
    rate_limit_per_hour: source.rate_limit_per_hour != null ? String(source.rate_limit_per_hour) : '24',
    is_enabled: source.is_enabled,
    portal: typeof config.portal === 'string' ? config.portal : '',
    searchUrl: typeof config.searchUrl === 'string' ? config.searchUrl : '',
    notes: typeof config.notes === 'string' ? config.notes : '',
    city: typeof config.city === 'string' ? config.city : '',
    districts: Array.isArray(config.districts) ? (config.districts as string[]).join(', ') : '',
    maxRent: config.maxRent != null ? String(config.maxRent) : '',
    minRent: config.minRent != null ? String(config.minRent) : '',
    bedrooms: config.bedrooms != null ? String(config.bedrooms) : '',
    sizeMin: config.sizeMin != null ? String(config.sizeMin) : '',
    sizeMax: config.sizeMax != null ? String(config.sizeMax) : '',
    scraperPortal: typeof config.portal === 'string' ? config.portal : '',
    scraperMaxPages: config.maxPages != null ? String(config.maxPages) : '3',
    scraperBaseUrlOverride: typeof config.baseUrlOverride === 'string' ? config.baseUrlOverride : '',
  }
}

export interface HunterSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSourceId: string | null
  sourceForm: SourceForm
  onFormChange: (form: SourceForm) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  supportedSourceTypes: SourceType[]
}

/**
 * Shared source create/edit dialog for Hunter modules.
 * Used by both Invest and Rent hunter dashboards.
 */
export function HunterSourceDialog({
  open,
  onOpenChange,
  editingSourceId,
  sourceForm,
  onFormChange,
  onSave,
  onCancel,
  isSaving,
  supportedSourceTypes,
}: HunterSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingSourceId ? 'Edit Source' : 'Add Source'}</DialogTitle>
          <DialogDescription>
            {editingSourceId ? 'Update the discovery source configuration.' : 'Create a discovery source and persist it to the source registry.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={sourceForm.name} onChange={(e) => onFormChange({ ...sourceForm, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={sourceForm.type}
              onChange={(e) => onFormChange({ ...sourceForm, type: e.target.value as SourceType })}
            >
              {supportedSourceTypes.map((hint) => (
                <option key={hint} value={hint}>{hint}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Allowed Domains</Label>
            <Input
              placeholder="example.com, listings.example.org"
              value={sourceForm.allowed_domains}
              onChange={(e) => onFormChange({ ...sourceForm, allowed_domains: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Excluded Domains</Label>
            <Input
              placeholder="social.example.com, ads.example.net"
              value={sourceForm.excluded_domains}
              onChange={(e) => onFormChange({ ...sourceForm, excluded_domains: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Results Per Run</Label>
            <Input
              type="number"
              value={sourceForm.max_results_per_run}
              onChange={(e) => onFormChange({ ...sourceForm, max_results_per_run: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Rate Limit Per Hour</Label>
            <Input
              type="number"
              value={sourceForm.rate_limit_per_hour}
              onChange={(e) => onFormChange({ ...sourceForm, rate_limit_per_hour: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={sourceForm.terms_checked} onChange={(e) => onFormChange({ ...sourceForm, terms_checked: e.target.checked })} />
            Terms checked
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={sourceForm.is_enabled} onChange={(e) => onFormChange({ ...sourceForm, is_enabled: e.target.checked })} />
            Enabled
          </label>

          {/* saved_search dynamic fields */}
          {sourceForm.type === 'saved_search' && (
            <>
              <div className="space-y-2">
                <Label>Portal</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sourceForm.portal}
                  onChange={(e) => onFormChange({ ...sourceForm, portal: e.target.value })}
                >
                  <option value="">Select portal...</option>
                  <option value="4zida">4zida</option>
                  <option value="CityExpert">CityExpert</option>
                  <option value="Halo Oglasi">Halo Oglasi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Saved Search URL</Label>
                <Input
                  placeholder="https://..."
                  value={sourceForm.searchUrl}
                  onChange={(e) => onFormChange({ ...sourceForm, searchUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="e.g. Liman apartments under €800"
                  value={sourceForm.notes}
                  onChange={(e) => onFormChange({ ...sourceForm, notes: e.target.value })}
                />
              </div>
            </>
          )}

          {/* live_scraper dynamic fields */}
          {sourceForm.type === 'live_scraper' && (
            <>
              <div className="space-y-2">
                <Label>Portal</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sourceForm.scraperPortal}
                  onChange={(e) => onFormChange({ ...sourceForm, scraperPortal: e.target.value })}
                >
                  <option value="">Select portal...</option>
                  <option value="4zida">4zida</option>
                  <option value="halooglasi">Halo Oglasi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Novi Sad"
                  value={sourceForm.city}
                  onChange={(e) => onFormChange({ ...sourceForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Pages (1-3)</Label>
                <Input
                  type="number"
                  min="1"
                  max="3"
                  placeholder="3"
                  value={sourceForm.scraperMaxPages}
                  onChange={(e) => onFormChange({ ...sourceForm, scraperMaxPages: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Base URL Override (optional)</Label>
                <Input
                  placeholder="https://4zida.rs/izdavanje-stanova/novi-sad"
                  value={sourceForm.scraperBaseUrlOverride}
                  onChange={(e) => onFormChange({ ...sourceForm, scraperBaseUrlOverride: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Districts (comma-separated, optional)</Label>
                <Input
                  placeholder="Liman 1, Liman 2, Grbavica"
                  value={sourceForm.districts}
                  onChange={(e) => onFormChange({ ...sourceForm, districts: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="e.g. Direct scrape of 4zida listings"
                  value={sourceForm.notes}
                  onChange={(e) => onFormChange({ ...sourceForm, notes: e.target.value })}
                />
              </div>
            </>
          )}

          {/* portal_search dynamic fields */}
          {sourceForm.type === 'portal_search' && (
            <>
              <div className="space-y-2">
                <Label>Portal</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sourceForm.portal}
                  onChange={(e) => onFormChange({ ...sourceForm, portal: e.target.value })}
                >
                  <option value="">Select portal...</option>
                  <option value="4zida">4zida</option>
                  <option value="CityExpert">CityExpert</option>
                  <option value="Halo Oglasi">Halo Oglasi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Novi Sad"
                  value={sourceForm.city}
                  onChange={(e) => onFormChange({ ...sourceForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Districts (comma-separated)</Label>
                <Input
                  placeholder="Liman 1, Liman 2, Grbavica"
                  value={sourceForm.districts}
                  onChange={(e) => onFormChange({ ...sourceForm, districts: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Rent (€)</Label>
                <Input
                  type="number"
                  placeholder="300"
                  value={sourceForm.minRent}
                  onChange={(e) => onFormChange({ ...sourceForm, minRent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Rent (€)</Label>
                <Input
                  type="number"
                  placeholder="800"
                  value={sourceForm.maxRent}
                  onChange={(e) => onFormChange({ ...sourceForm, maxRent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  placeholder="2"
                  value={sourceForm.bedrooms}
                  onChange={(e) => onFormChange({ ...sourceForm, bedrooms: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Size (m²)</Label>
                <Input
                  type="number"
                  placeholder="40"
                  value={sourceForm.sizeMin}
                  onChange={(e) => onFormChange({ ...sourceForm, sizeMin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Size (m²)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={sourceForm.sizeMax}
                  onChange={(e) => onFormChange({ ...sourceForm, sizeMax: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : editingSourceId ? 'Update Source' : 'Save Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Build a source payload from form state for create/update API calls.
 */
export function buildSourcePayload(form: SourceForm): Omit<OpportunitySource, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'last_run_at'> {
  let connector_config: Record<string, unknown> = {}

  if (form.type.trim() === 'web_search') {
    connector_config = {
      allowed_domains: splitCsv(form.allowed_domains),
      excluded_domains: splitCsv(form.excluded_domains),
      max_results_per_run: Number.isFinite(Number(form.max_results_per_run))
        ? Number(form.max_results_per_run)
        : 20,
    }
  } else if (form.type.trim() === 'saved_search') {
    connector_config = {
      portal: form.portal || null,
      searchUrl: form.searchUrl.trim() || null,
      notes: form.notes.trim() || null,
    }
  } else if (form.type.trim() === 'portal_search') {
    connector_config = {
      portal: form.portal || null,
      city: form.city.trim() || null,
      districts: splitCsv(form.districts),
      maxRent: Number.isFinite(Number(form.maxRent)) && form.maxRent.trim() !== '' ? Number(form.maxRent) : null,
      minRent: Number.isFinite(Number(form.minRent)) && form.minRent.trim() !== '' ? Number(form.minRent) : null,
      bedrooms: Number.isFinite(Number(form.bedrooms)) && form.bedrooms.trim() !== '' ? Number(form.bedrooms) : null,
      sizeMin: Number.isFinite(Number(form.sizeMin)) && form.sizeMin.trim() !== '' ? Number(form.sizeMin) : null,
      sizeMax: Number.isFinite(Number(form.sizeMax)) && form.sizeMax.trim() !== '' ? Number(form.sizeMax) : null,
    }
  } else if (form.type.trim() === 'live_scraper') {
    connector_config = {
      portal: form.scraperPortal || '4zida',
      city: form.city.trim() || null,
      districts: splitCsv(form.districts),
      maxPages: Number.isFinite(Number(form.scraperMaxPages)) && form.scraperMaxPages.trim() !== ''
        ? Math.min(Math.round(Number(form.scraperMaxPages)), 3)
        : 3,
      baseUrlOverride: form.scraperBaseUrlOverride.trim() || null,
    }
  }

  return {
    name: form.name.trim(),
    type: form.type.trim(),
    source_url: form.type.trim() === 'saved_search' ? form.searchUrl.trim() || null : null,
    seed_urls: [],
    connector_config,
    terms_checked: form.terms_checked,
    rate_limit_per_hour: Number.isFinite(Number(form.rate_limit_per_hour)) ? Number(form.rate_limit_per_hour) : null,
    is_enabled: form.is_enabled,
    allowed_use_notes: null,
    contact_email: null,
  }
}
