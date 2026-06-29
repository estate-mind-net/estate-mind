import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from '@phosphor-icons/react'

interface DeleteSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchName: string
  opportunityCount: number
  onConfirm: (deleteImported: boolean) => void
}

export function DeleteSearchDialog({ open, onOpenChange, searchName, opportunityCount, onConfirm }: DeleteSearchDialogProps) {
  const [deleteImported, setDeleteImported] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try { onConfirm(deleteImported) } finally { setDeleting(false); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />Delete Search
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{searchName}</p>
            <p className="text-xs text-muted-foreground">{opportunityCount} imported opportunities</p>
          </div>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="delete-mode" checked={!deleteImported} onChange={() => setDeleteImported(false)} className="mt-1" />
              <div><p className="text-sm font-medium">Delete Search Only</p><p className="text-xs text-muted-foreground">Imported opportunities remain in My Opportunities.</p></div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="delete-mode" checked={deleteImported} onChange={() => setDeleteImported(true)} className="mt-1" />
              <div><p className="text-sm font-medium">Delete Search and All Imported Opportunities</p><p className="text-xs text-muted-foreground">Removes {opportunityCount} opportunities, AI reports, notes, and tasks.</p></div>
            </label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
