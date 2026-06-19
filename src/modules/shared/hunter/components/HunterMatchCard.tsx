import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import type { OpportunityMatch, RawOpportunity } from '@/lib/types/opportunityHunter'

export type MatchWithRaw = OpportunityMatch & { raw: RawOpportunity | null }

export interface HunterMatchCardProps {
  match: MatchWithRaw
  /** Show "Save to..." button. Omit to hide. */
  onSave?: (match: MatchWithRaw) => void
  /** Label for the save button */
  saveLabel?: string
  /** Whether save is in progress */
  isSaving?: boolean
}

/**
 * Shared match card used by both Invest and Rent hunter detail pages.
 * Displays: title, location, price, size, score, match/mismatch reasons, missing data.
 */
export function HunterMatchCard({ match, onSave, saveLabel = 'Save', isSaving }: HunterMatchCardProps) {
  const raw = match.raw
  const scoreColor = (match.match_score ?? 0) >= 80 ? 'text-green-600' :
    (match.match_score ?? 0) >= 60 ? 'text-yellow-600' :
    (match.match_score ?? 0) >= 40 ? 'text-orange-600' : 'text-red-600'

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <h3 className="font-display text-lg font-semibold">
            {raw?.title || 'Untitled opportunity'}
          </h3>
          <div className="flex flex-wrap gap-3 text-sm text-foreground/70">
            {raw?.city && <span>{raw.city}</span>}
            {raw?.district && <span>{raw.district}</span>}
            {raw?.price && <span>{raw.currency ?? 'EUR'} {raw.price}{raw.property_type === 'rental' || raw.property_type === 'apartment' ? '/mo' : ''}</span>}
            {raw?.size_m2 && <span>{raw.size_m2} m²</span>}
            {raw?.bedrooms != null && <span>{raw.bedrooms} BR</span>}
            {raw?.property_type && <span className="capitalize">{raw.property_type}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${scoreColor}`}>{match.match_score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>

      {/* Match Reasons */}
      {match.match_reasons && (match.match_reasons as string[]).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Matches</p>
          <div className="flex flex-wrap gap-1.5">
            {(match.match_reasons as string[]).map((reason, i) => (
              <Badge key={i} variant="default" className="gap-1 text-xs">
                <CheckCircle className="h-3 w-3" />
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Mismatch Reasons */}
      {match.mismatch_reasons && (match.mismatch_reasons as string[]).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Mismatches</p>
          <div className="flex flex-wrap gap-1.5">
            {(match.mismatch_reasons as string[]).map((reason, i) => (
              <Badge key={i} variant="destructive" className="gap-1 text-xs">
                <XCircle className="h-3 w-3" />
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing Data */}
      {match.missing_data && (match.missing_data as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(match.missing_data as string[]).map((item, i) => (
            <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
          ))}
        </div>
      )}

      {/* Suggested Next Step */}
      {match.suggested_next_step && (
        <p className="text-xs text-muted-foreground italic">
          {match.suggested_next_step}
        </p>
      )}

      {/* AI Analysis */}
      {match.ai_investment_score != null && (
        <p className="text-xs text-muted-foreground">
          AI score: {match.ai_investment_score} · Recommendation: {match.recommendation ?? 'pending'}
        </p>
      )}

      {/* Listing URL */}
      {raw?.source_url && (
        <p className="text-xs">
          <a
            href={raw.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline break-all"
          >
            {raw.source_url}
          </a>
        </p>
      )}

      {/* Save Button */}
      {onSave && raw && (
        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => onSave(match)}
            disabled={isSaving}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSaving ? 'Saving...' : saveLabel}
          </Button>
        </div>
      )}
    </Card>
  )
}