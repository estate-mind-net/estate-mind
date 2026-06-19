import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { OpportunitySource } from '@/lib/types/opportunityHunter'

export type SourceType = 'web_search' | 'demo' | 'manual_url' | 'csv_import' | 'rent_demo'

export interface SourceForm {
  name: string
  type: SourceType
  terms_checked: boolean
  allowed_domains: string
  excluded_domains: string
  max_results_per_run: string
  rate_limit_per_hour: string
  is_enabled: boolean
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
}

const splitCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

export function sourceToForm(source: OpportunitySource, supportedTypes: SourceType[]): SourceForm {
  const config = source.connector_config && typeof source.connector_config === 'object'
    ? source.connector_config
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
  return {
    name: form.name.trim(),
    type: form.type.trim(),
    source_url: null,
    seed_urls: [],
    connector_config: form.type.trim() === 'web_search'
      ? {
          allowed_domains: splitCsv(form.allowed_domains),
          excluded_domains: splitCsv(form.excluded_domains),
          max_results_per_run: Number.isFinite(Number(form.max_results_per_run))
            ? Number(form.max_results_per_run)
            : 20,
        }
      : {},
    terms_checked: form.terms_checked,
    rate_limit_per_hour: Number.isFinite(Number(form.rate_limit_per_hour)) ? Number(form.rate_limit_per_hour) : null,
    is_enabled: form.is_enabled,
    allowed_use_notes: null,
    contact_email: null,
  }
}