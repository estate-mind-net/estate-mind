import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Wrench, Trash, AlertTriangle } from '@phosphor-icons/react'
import { clearModuleData, clearAllTestData, countOpportunities } from './resetService'
import type { DeleteResult, DataContext } from './resetService'

interface DeveloperToolsPanelProps {
  context: DataContext | null
  onResetComplete?: () => void
}

type DestructiveAction = 'clear-rent' | 'clear-all' | null

export function DeveloperToolsPanel({ context, onResetComplete }: DeveloperToolsPanelProps) {
  const [activeAction, setActiveAction] = useState<DestructiveAction>(null)
  const [confirmText, setConfirmText] = useState('')
  const [result, setResult] = useState<DeleteResult | null>(null)
  const [executing, setExecuting] = useState(false)
  const [opportunityCount, setOpportunityCount] = useState(0)
  const hasContext = context !== null
  const confirmEnabled = confirmText === 'DELETE' && hasContext

  const handleOpen = async (action: DestructiveAction) => {
    setActiveAction(action); setConfirmText('')
    const count = await countOpportunities(context); setOpportunityCount(count)
  }

  const handleExecute = async () => {
    if (!activeAction) return; setExecuting(true)
    try {
      const r = activeAction === 'clear-rent' ? await clearModuleData('rent', context) : await clearAllTestData(context)
      setResult(r); setActiveAction(null); setConfirmText(''); onResetComplete?.()
    } catch (e) { setResult({ opportunitiesRemoved: 0, searchSourcesRemoved: 0, analysesRemoved: 0, notesRemoved: 0, skipped: [], errors: [e instanceof Error ? e.message : 'Unknown error'] }) }
    finally { setExecuting(false) }
  }

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-accent" />Developer Tools</h2>
      <p className="text-xs text-muted-foreground">These actions delete data from Supabase. Type DELETE to confirm.</p>
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full justify-start" disabled={!hasContext} onClick={() => handleOpen('clear-rent')}><Trash className="mr-2 h-3.5 w-3.5" />Clear Rent Data</Button>
        <Button variant="outline" size="sm" className="w-full justify-start" disabled><Trash className="mr-2 h-3.5 w-3.5" />Clear Invest Data (coming soon)</Button>
        <Button variant="outline" size="sm" className="w-full justify-start" disabled={!hasContext} onClick={() => handleOpen('clear-all')}><Trash className="mr-2 h-3.5 w-3.5" />Clear All Test Data</Button>
        <Button variant="outline" size="sm" className="w-full justify-start" disabled><Trash className="mr-2 h-3.5 w-3.5" />Reload Seed Data</Button>
        <p className="text-xs text-muted-foreground pl-2">Seed data must be loaded through Supabase seed.sql.</p>
      </div>
      {result && (
        <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
          <p>Opportunities: {result.opportunitiesRemoved}</p>
          <p>Matches: {result.matchesRemoved}</p>
          <p>Raw opportunities: {result.rawOpportunitiesRemoved}</p>
          <p>Sources: {result.sourcesRemoved}</p>
          <p>Briefs: {result.briefsRemoved}</p>
          <p>Notes: {result.notesRemoved}</p>
          <p>Properties: {result.propertiesRemoved}</p>
          {result.skipped.length > 0 && <p className="text-muted-foreground">Skipped: {result.skipped.join(', ')}</p>}
          {result.errors.length > 0 && <p className="text-destructive">Errors: {result.errors.join(', ')}</p>}
        </div>
      )}
      <Dialog open={activeAction !== null} onOpenChange={() => { setActiveAction(null); setConfirmText('') }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />{activeAction === 'clear-rent' ? 'Clear Rent Data' : 'Clear All Test Data'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">This will permanently delete from Supabase:</p>
            <ul className="text-sm text-foreground/70 space-y-1 list-disc pl-5">
              <li>All {activeAction === 'clear-rent' ? 'Rent' : ''} opportunities ({opportunityCount} items)</li>
              <li>Linked notes, AI reports, and analyses</li>
            </ul>
            <p className="text-sm font-medium">This cannot be undone.</p>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Type DELETE to confirm:</label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" className="font-mono" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActiveAction(null); setConfirmText('') }}>Cancel</Button>
            <Button variant="destructive" onClick={handleExecute} disabled={!confirmEnabled || executing}>{executing ? 'Deleting...' : 'Execute'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}