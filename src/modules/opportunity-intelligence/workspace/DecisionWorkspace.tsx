import type { ReactNode } from 'react'
import type { NormalizedOpportunity, OpportunityScore } from '../types'
import { WorkspaceHeader } from './WorkspaceHeader'
import { RecommendationCard } from './RecommendationCard'
import { ConfidencePanel } from './ConfidencePanel'
import { AISummaryPanel } from './AISummaryPanel'
import { EvidencePanel } from './EvidencePanel'
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel'
import { MissingDataPanel } from './MissingDataPanel'
import { RisksPanel } from './RisksPanel'
import { NextActionsPanel } from './NextActionsPanel'
import { TasksPanel } from './TasksPanel'
import { NotesPanel } from './NotesPanel'
import { TimelinePanel } from './TimelinePanel'
import { DocumentsPanel } from './DocumentsPanel'

interface DecisionWorkspaceProps {
  opportunity: NormalizedOpportunity
  score: OpportunityScore
  onBack: () => void
  onEdit?: () => void
  /** Module-specific extra content rendered at the bottom of the left column */
  extraContent?: ReactNode
  /** Module-specific sidebar content rendered at the bottom of the right column */
  extraSidebar?: ReactNode
  /** Override notes */
  initialNotes?: string
  onNotesChange?: (notes: string) => void
}

export function DecisionWorkspace({
  opportunity,
  score,
  onBack,
  onEdit,
  extraContent,
  extraSidebar,
  initialNotes,
  onNotesChange,
}: DecisionWorkspaceProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <WorkspaceHeader
        opportunity={opportunity}
        score={score}
        onBack={onBack}
        onEdit={onEdit}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <RecommendationCard score={score} />
        </div>
        <div>
          <ConfidencePanel score={score} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Left column: 70% */}
        <div className="lg:col-span-5 space-y-5">
          <AISummaryPanel opportunity={opportunity} score={score} />
          <EvidencePanel evidence={score.evidence} />
          <ScoreBreakdownPanel breakdown={score.scoreBreakdown} />
          <RisksPanel opportunity={opportunity} score={score} />
          <MissingDataPanel missingData={score.missingData} />
          {extraContent}
        </div>

        {/* Right column: 30% */}
        <div className="lg:col-span-2 space-y-5">
          <NextActionsPanel opportunity={opportunity} score={score} />
          <TasksPanel />
          <NotesPanel
            initialNotes={initialNotes ?? opportunity.rawDescription ?? ''}
            onNotesChange={onNotesChange}
          />
          <TimelinePanel opportunity={opportunity} />
          <DocumentsPanel sourceUrl={opportunity.sourceUrl} />
          {extraSidebar}
        </div>
      </div>
    </div>
  )
}
