import { Lightning, Phone, Eye, CurrencyCircleDollar, FileText, ShieldCheck } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import type { NormalizedOpportunity, OpportunityScore } from '../types'

interface ActionItem {
  label: string
  icon: React.ReactNode
  priority: 'high' | 'medium' | 'low'
}

function getRecommendedActions(
  opportunity: NormalizedOpportunity,
  score: OpportunityScore,
): ActionItem[] {
  const actions: ActionItem[] = []

  // Always recommend viewing if score is decent
  if (score.totalScore >= 50) {
    actions.push({ label: 'Schedule viewing', icon: <Eye className="h-3.5 w-3.5" />, priority: 'high' })
  }

  // If missing price data, ask about it
  const missing = score.missingData.map((m) => m.field)
  if (missing.includes('price') || missing.includes('sourceUrl')) {
    actions.push({ label: 'Verify pricing details', icon: <CurrencyCircleDollar className="h-3.5 w-3.5" />, priority: 'high' })
  }

  // Module-specific: rent
  if (opportunity.moduleType === 'rent') {
    const md = opportunity.moduleData
    if (md.monthlyRent && typeof md.monthlyRent === 'number' && md.monthlyRent > 0) {
      actions.push({ label: 'Ask about deposit amount', icon: <CurrencyCircleDollar className="h-3.5 w-3.5" />, priority: 'medium' })
      actions.push({ label: 'Request utility costs', icon: <Lightning className="h-3.5 w-3.5" />, priority: 'medium' })
    }
    actions.push({ label: 'Contact landlord/agent', icon: <Phone className="h-3.5 w-3.5" />, priority: 'high' })
    actions.push({ label: 'Ask about lease duration', icon: <FileText className="h-3.5 w-3.5" />, priority: 'low' })
  }

  // If source URL exists, verify it
  if (opportunity.sourceUrl) {
    actions.push({ label: 'Verify original listing', icon: <ShieldCheck className="h-3.5 w-3.5" />, priority: 'medium' })
  }

  return actions
}

const priorityOrder = { high: 0, medium: 1, low: 2 }
const priorityColor = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-foreground/50' }

interface NextActionsPanelProps {
  opportunity: NormalizedOpportunity
  score: OpportunityScore
}

export function NextActionsPanel({ opportunity, score }: NextActionsPanelProps) {
  const actions = getRecommendedActions(opportunity, score)

  if (actions.length === 0) return null

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Next Actions
      </h3>
      <div className="space-y-1.5">
        {actions
          .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
          .map((action, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <span className={priorityColor[action.priority]}>{action.icon}</span>
              <span className="text-sm text-foreground/80">{action.label}</span>
            </div>
          ))}
      </div>
    </Card>
  )
}
