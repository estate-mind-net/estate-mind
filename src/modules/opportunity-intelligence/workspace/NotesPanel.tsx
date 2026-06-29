import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface NotesPanelProps {
  initialNotes?: string
  onNotesChange?: (notes: string) => void
  readOnly?: boolean
}

export function NotesPanel({ initialNotes = '', onNotesChange, readOnly = false }: NotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [editing, setEditing] = useState(false)

  const handleSave = () => {
    onNotesChange?.(notes)
    setEditing(false)
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
          Notes
        </h3>
        {!readOnly && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-xs h-6 px-2">
            Edit
          </Button>
        )}
      </div>

      {editing && !readOnly ? (
        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Add your notes about this opportunity..."
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setNotes(initialNotes); setEditing(false) }} className="text-xs h-6 px-2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs h-6 px-2">
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {notes ? (
            <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{notes}</p>
          ) : (
            <p className="text-xs text-foreground/40 italic">No notes yet.</p>
          )}
        </div>
      )}
    </Card>
  )
}
