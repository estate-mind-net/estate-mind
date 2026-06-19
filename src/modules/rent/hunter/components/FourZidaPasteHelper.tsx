import { useState } from 'react'
import { ClipboardText, CheckCircle, Warning, ArrowRight } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { parse4zidaRentalText, type ParsedFourZidaListing } from '../services/portalHelpers/fourZidaTextParser'

interface FourZidaPasteHelperProps {
  onApply: (fields: Record<string, unknown>) => void
}

export function FourZidaPasteHelper({ onApply }: FourZidaPasteHelperProps) {
  const [pastedText, setPastedText] = useState('')
  const [parsed, setParsed] = useState<ParsedFourZidaListing | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleExtract = () => {
    if (!pastedText.trim()) return
    const result = parse4zidaRentalText(pastedText)
    setParsed(result)
  }

  const handleApply = () => {
    if (!parsed) return
    const fields: Record<string, unknown> = {}
    if (parsed.title) fields.title = parsed.title
    if (parsed.city) fields.city = parsed.city
    if (parsed.district) fields.district = parsed.district
    if (parsed.monthlyRent != null) fields.monthlyRent = parsed.monthlyRent
    if (parsed.currency) fields.currency = parsed.currency
    if (parsed.sizeM2 != null) fields.sizeM2 = parsed.sizeM2
    if (parsed.bedrooms != null) fields.bedrooms = parsed.bedrooms
    if (parsed.floor != null) fields.floor = parsed.floor
    if (parsed.furnished != null) fields.furnished = parsed.furnished
    if (parsed.parking != null) fields.parking = parsed.parking
    if (parsed.balcony != null) fields.balcony = parsed.balcony
    if (parsed.elevator != null) fields.elevator = parsed.elevator
    if (parsed.petsAllowed != null) fields.petsAllowed = parsed.petsAllowed
    onApply(fields as Parameters<typeof onApply>[0])
  }

  if (!isExpanded) {
    return (
      <Card className="border-accent/30 bg-accent/5 p-4">
        <button
          type="button"
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-accent hover:text-accent/80"
          onClick={() => setIsExpanded(true)}
        >
          <ClipboardText className="h-4 w-4" />
          Paste listing text from 4zida to auto-fill fields
        </button>
      </Card>
    )
  }

  return (
    <Card className="border-accent/30 bg-accent/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardText className="h-4 w-4 text-accent" />
            4zida.rs Text Extractor
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Copy visible text from the 4zida listing page and paste it below.
            We parse it locally — no data is sent to any server.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
          Hide
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fourzida-text" className="text-xs">Listing text</Label>
        <textarea
          id="fourzida-text"
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          placeholder="Paste the visible listing description from 4zida here...&#10;&#10;Example:&#10;Dvosoban stan, Liman 2&#10;55m², 2. sprat&#10;550€ mesečno&#10;Namešten, terasa, parking"
          value={pastedText}
          onChange={(e) => { setPastedText(e.target.value); setParsed(null) }}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExtract}
        disabled={!pastedText.trim()}
        className="border-accent text-accent hover:bg-accent/10"
      >
        Extract Fields
      </Button>

      {parsed && (
        <div className="space-y-3 pt-2 border-t border-accent/20">
          {/* Confidence */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <Badge variant={parsed.confidence >= 60 ? 'default' : parsed.confidence >= 30 ? 'secondary' : 'destructive'}>
              {parsed.confidence}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({parsed.extractedFields.length} field{parsed.extractedFields.length !== 1 ? 's' : ''} extracted)
            </span>
          </div>

          {/* Extracted fields */}
          {parsed.extractedFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsed.extractedFields.map((field) => (
                <Badge key={field} variant="outline" className="text-xs gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {field}
                </Badge>
              ))}
            </div>
          )}

          {/* Warnings */}
          {parsed.warnings.length > 0 && (
            <div className="space-y-1">
              {parsed.warnings.map((warning, i) => (
                <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                  <Warning className="h-3 w-3" />
                  {warning}
                </p>
              ))}
            </div>
          )}

          {/* Apply button */}
          {parsed.extractedFields.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1"
            >
              <ArrowRight className="h-3 w-3" />
              Apply to Form
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}