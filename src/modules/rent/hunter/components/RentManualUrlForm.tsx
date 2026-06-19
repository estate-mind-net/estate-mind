import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Link } from '@phosphor-icons/react'

interface RentManualUrlFormProps {
  onSubmit: (url: string, notes: string) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function RentManualUrlForm({ onSubmit, onCancel, isSubmitting }: RentManualUrlFormProps) {
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setError('URL is required.')
      return false
    }
    try {
      const parsed = new URL(value)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('URL must start with http:// or https://')
        return false
      }
    } catch {
      setError('Please enter a valid URL.')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateUrl(url)) {
      onSubmit(url.trim(), notes.trim())
    }
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Link className="h-5 w-5" />
          Import Listing URL
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste a rental listing URL. You'll fill in the property details manually on the next screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="listing-url">Listing URL *</Label>
          <Input
            id="listing-url"
            type="url"
            placeholder="https://example.com/listing/123"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError('') }}
            disabled={isSubmitting}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            placeholder="e.g. Found via recommendation, good location"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {isSubmitting ? 'Processing...' : 'Add URL'}
          </Button>
        </div>
      </form>
    </Card>
  )
}