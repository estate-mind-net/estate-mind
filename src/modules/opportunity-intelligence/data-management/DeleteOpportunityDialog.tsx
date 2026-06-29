import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from '@phosphor-icons/react'

interface DeleteOpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityTitle: string
  onConfirm: () => void
}

export function DeleteOpportunityDialog({ open, onOpenChange, opportunityTitle, onConfirm }: DeleteOpportunityDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try { onConfirm() } finally { setDeleting(false); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />Delete Opportunity
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">This permanently deletes:</p>
          <ul className="text-sm text-foreground/70 space-y-1 list-disc pl-5">
            <li>Opportunity</li><li>Decision Workspace data</li><li>Notes</li><li>Tasks</li><li>AI Reports</li>
          </ul>
          <p className="text-sm font-medium">The originating Search Source will NOT be deleted.</p>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium truncate">{opportunityTitle}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete Opportunity'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
