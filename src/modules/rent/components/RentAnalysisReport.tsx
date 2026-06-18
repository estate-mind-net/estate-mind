import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { RentAnalysisResult } from '../services/rentAnalysis'
import type { RentRecommendation } from '../types'

interface RentAnalysisReportProps {
  analysis: RentAnalysisResult
}

const recommendationVariant: Record<RentRecommendation, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Excellent Fit': 'default',
  'Good Fit': 'secondary',
  Watch: 'outline',
  Avoid: 'destructive',
}

export function RentAnalysisReport({ analysis }: RentAnalysisReportProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4 bg-gradient-to-br from-accent/5 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">AI Rent Analysis</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Confidence: {analysis.confidenceScore}%</span>
            <Badge variant={recommendationVariant[analysis.recommendation]}>{analysis.recommendation}</Badge>
          </div>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{analysis.executiveSummary}</p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Price Assessment</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{analysis.priceAssessment}</p>
        </Card>

        <Card className="p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Location Assessment</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{analysis.locationAssessment}</p>
        </Card>

        <Card className="p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Couple Suitability</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{analysis.coupleSuitability}</p>
        </Card>

        <Card className="p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Remote Work Suitability</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{analysis.remoteWorkSuitability}</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-3 border-green-200">
          <h3 className="font-display text-lg font-semibold text-green-700">Key Pros</h3>
          {analysis.keyPros.length > 0 ? (
            <ul className="space-y-2">
              {analysis.keyPros.map((item, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2">
                  <span className="text-green-500 shrink-0">+</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific pros identified.</p>
          )}
        </Card>

        <Card className="p-6 space-y-3 border-red-200">
          <h3 className="font-display text-lg font-semibold text-red-700">Key Cons</h3>
          {analysis.keyCons.length > 0 ? (
            <ul className="space-y-2">
              {analysis.keyCons.map((item, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2">
                  <span className="text-red-500 shrink-0">−</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific cons identified.</p>
          )}
        </Card>
      </div>

      {analysis.comfortRisks.length > 0 && (
        <Card className="p-6 space-y-3 border-amber-200">
          <h3 className="font-display text-lg font-semibold text-amber-700">Comfort Risks</h3>
          <ul className="space-y-2">
            {analysis.comfortRisks.map((item, i) => (
              <li key={i} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-amber-500 shrink-0">⚠</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {analysis.missingInformation.length > 0 && (
        <Card className="p-6 space-y-3 border-dashed">
          <h3 className="font-display text-lg font-semibold text-muted-foreground">Missing Information</h3>
          <ul className="space-y-2">
            {analysis.missingInformation.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="shrink-0">?</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        This analysis is generated deterministically from available data. It does not constitute financial or legal advice. Verify all information independently before making a decision.
      </p>
    </div>
  )
}