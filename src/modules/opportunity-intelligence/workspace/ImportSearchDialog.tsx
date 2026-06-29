import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Link, Upload, Plus, CheckCircle, Target } from '@phosphor-icons/react'
import { portalImportEngine } from '../import/PortalImportEngine'
import type { EnrichmentProgress } from '../enrichment/EnrichmentResult'
import type { DataContext } from '../auth/ContextValidation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ImportSearchDialogProps {
  trigger?: React.ReactNode
  context: DataContext | null
  onImportComplete?: (summary: ImportSummary) => void
  onNavigateToImportUrl?: () => void
  onNavigateToNew?: () => void
}

export interface ImportSummary {
  portal: string
  listingsFound: number
  imported: number
  duplicates: number
  rejectedInvalid: number
  excellentFit: number
  goodFit: number
  needsReview: number
  rejected: number
}

type DialogStep = 'input' | 'validating' | 'summary'

const SUPPORTED_PORTALS = [{ id: '4zida', name: '4zida', domain: '4zida.rs' }]

function detectPortal(url: string): { portal: string; valid: boolean } {
  try {
    const parsed = new URL(url)
    for (const p of SUPPORTED_PORTALS) { if (parsed.hostname.includes(p.domain)) return { portal: p.name, valid: true } }
    return { portal: '', valid: false }
  } catch { return { portal: '', valid: false } }
}

export function ImportSearchDialog({ trigger, context, onImportComplete, onNavigateToImportUrl, onNavigateToNew }: ImportSearchDialogProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<DialogStep>('input')
  const [searchUrl, setSearchUrl] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null)

  const handleValidate = () => {
    setError('')
    if (!searchUrl.trim()) { setError('Please paste a search URL.'); return }
    if (!context) { setError('You must be signed in to import.'); return }
    const { portal, valid } = detectPortal(searchUrl)
    if (!valid) { setError('This portal is not yet supported. Currently supported: 4zida.rs'); return }
    console.log('[ImportSearchDialog] Pasted URL:', searchUrl)
    console.log('[ImportSearchDialog] Passing URL to PortalImportEngine:', searchUrl)
    setStep('validating')
    portalImportEngine.importAndPersist(searchUrl, context, {}, (p) => setProgress(p)).then((engineResult) => {
      const result: ImportSummary = {
        portal: engineResult.portal, listingsFound: engineResult.listingsFound,
        imported: engineResult.listingsImported, duplicates: engineResult.duplicatesSkipped,
        rejectedInvalid: engineResult.rejectedInvalid,
        excellentFit: engineResult.scoreDistribution.excellentFit, goodFit: engineResult.scoreDistribution.goodFit,
        needsReview: engineResult.scoreDistribution.possibleFit + engineResult.scoreDistribution.weakFit,
        rejected: engineResult.scoreDistribution.reject,
      }
      setSummary(result); setStep('summary'); onImportComplete?.(result)
    }).catch((err) => { setError(err instanceof Error ? err.message : 'Import failed'); setStep('input') })
  }
  const handleReset = () => { setStep('input'); setSearchUrl(''); setError(''); setSummary(null) }
  const handleClose = () => { setOpen(false); setTimeout(handleReset, 200) }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Compass className="mr-2 h-4 w-4" />Import Search</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2"><Compass className="h-5 w-5 text-accent" />Import Search</DialogTitle>
        </DialogHeader>
        {step === 'input' && (
          <div className="space-y-5">
            <p className="text-sm text-foreground/70 leading-relaxed">Import an existing search from your preferred property portal. EstateMind will discover all opportunities, remove duplicates, score them, and save them to your workspace.</p>
            {!context && <p className="text-sm text-amber-600">You must be signed in to import opportunities.</p>}
            <div className="space-y-2">
              <Label htmlFor="search-url">Paste Search URL</Label>
              <Input id="search-url" value={searchUrl} onChange={(e) => { setSearchUrl(e.target.value); setError('') }} placeholder="https://www.4zida.rs/izdavanje-stanova/novi-sad" className="font-mono text-sm" />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Currently supported</p>
              <div className="flex gap-2">{SUPPORTED_PORTALS.map((p) => <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>)}</div>
            </div>
            <Button onClick={handleValidate} disabled={!context} className="w-full bg-accent text-accent-foreground hover:bg-accent/90"><Compass className="mr-2 h-4 w-4" />Import Search</Button>
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">{showAdvanced ? 'Hide' : 'Show'} Advanced Options</Button></CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {onNavigateToImportUrl && <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { handleClose(); onNavigateToImportUrl() }}><Link className="mr-2 h-3.5 w-3.5" />Import Single Listing URL</Button>}
                <Button variant="outline" size="sm" className="w-full justify-start" disabled><Upload className="mr-2 h-3.5 w-3.5" />Import CSV (coming soon)</Button>
                {onNavigateToNew && <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { handleClose(); onNavigateToNew() }}><Plus className="mr-2 h-3.5 w-3.5" />Create Manual Opportunity</Button>}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        {step === 'validating' && (
          <div className="py-10 text-center space-y-3">
            <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-foreground/70">{progress?.message ?? 'Importing search results...'}</p>
            {progress && progress.total > 0 && (
              <div className="w-full max-w-xs mx-auto">
                <div className="w-full bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: Math.round((progress.current / progress.total) * 100) + '%' }} /></div>
                <p className="text-xs text-muted-foreground mt-1 text-center">{progress.current} / {progress.total}</p>
              </div>
            )}
          </div>
        )}        {step === 'summary' && summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">{summary.imported > 0 ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Target className="h-5 w-5 text-amber-600" />}<h3 className="font-display text-lg font-semibold">{summary.imported > 0 ? 'Search Imported' : 'No Listings Extracted'}</h3></div>
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Portal</span><Badge variant="secondary">{summary.portal}</Badge></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Listings Found</span><span className="font-semibold">{summary.listingsFound}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Saved to Supabase</span><span className="font-semibold text-emerald-600">{summary.imported}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Duplicates Skipped</span><span className="font-semibold">{summary.duplicates}</span></div>
              {summary.rejectedInvalid > 0 && <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Rejected Invalid</span><span className="font-semibold text-amber-600">{summary.rejectedInvalid}</span></div>}
            </Card>
            {summary.imported === 0 && summary.listingsFound === 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <p className="font-medium">No listings were extracted from this URL.</p>
                <p className="text-xs mt-1 text-amber-700">Possible causes: the page structure has changed, the search returned no results, or the fetch was blocked. Check the browser console for diagnostics.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">Excellent Fit</span><span className="font-display text-lg font-bold text-emerald-600">{summary.excellentFit}</span></Card>
              <Card className="p-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">Good Fit</span><span className="font-display text-lg font-bold text-blue-600">{summary.goodFit}</span></Card>
              <Card className="p-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">Needs Review</span><span className="font-display text-lg font-bold text-amber-600">{summary.needsReview}</span></Card>
              <Card className="p-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">Rejected</span><span className="font-display text-lg font-bold text-red-600">{summary.rejected}</span></Card>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { handleClose(); navigate('/decisions') }} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">View Opportunities</Button>
              <Button variant="outline" onClick={handleReset} className="w-full">Import Another Search</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}