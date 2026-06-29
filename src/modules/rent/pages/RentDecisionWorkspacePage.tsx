import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Brain } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DecisionWorkspace } from '@/modules/opportunity-intelligence/workspace'
import { normalizeRentListing } from '@/modules/opportunity-intelligence/normalizers/rentNormalizer'
import { scoreRentOpportunity } from '@/modules/opportunity-intelligence/scoring/rentScorer'
import { toRentModulePreferences } from '@/modules/opportunity-intelligence/configs/rentModuleConfig'
import { opportunityRepository } from '../repositories/OpportunityRepository'
import { generateRentAnalysis } from '../services/rentAnalysis'
import { getLatestRentAnalysis, saveRentAnalysis, replaceRentAnalysisFindings } from '../services/rentAnalysisPersistence'
import { RentAnalysisReport } from '../components/RentAnalysisReport'
import type { RentAnalysisResult } from '../services/rentAnalysis'
import type { RentalApartment } from '../types'
import { DEFAULT_RENT_PREFERENCES, RENTAL_STATUS_LABELS } from '../types'
import type { RentalStatus } from '../types'
import { useAuth } from '@/hooks/useAuth'





export function RentDecisionWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  const [apartment, setApartment] = useState<RentalApartment | null>(null)

  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<RentAnalysisResult | null>(null)
  const [analysisAt, setAnalysisAt] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let cancelled = false
    async function load() {
      if (organization?.id && user?.id) {
        try {
          const r = await opportunityRepository.getById(id!, { organizationId: organization.id, userId: user.id })
          if (!cancelled && r.success && r.data) {
            setApartment(r.data)
            try {
              const a = await getLatestRentAnalysis(id!, { organizationId: organization.id })
              if (!cancelled && a.success && a.data) { setAnalysis(a.data); setAnalysisAt('Previously saved') }
            } catch {}
            setLoading(false); return
          }
        } catch {}
      }
      if (!cancelled) {
        /* no local fallback */

        setLoading(false)
      }
    }
    load(); return () => { cancelled = true }
  }, [id, organization?.id, user?.id, refreshKey])
  const normalized = useMemo(() => apartment ? normalizeRentListing(apartment) : null, [apartment])
  const score = useMemo(() => {
    if (!normalized) return null
    return scoreRentOpportunity(normalized, toRentModulePreferences(DEFAULT_RENT_PREFERENCES))
  }, [normalized])

  const isUser = apartment ? true : false

  const handleStatusChange = async (status: RentalStatus) => {
    if (!id || !apartment) return
    if (organization?.id && user?.id) {
      await opportunityRepository.updateStatus(id, status, { organizationId: organization.id, userId: user.id })
      toast.success('Status updated.')
    }
    setRefreshKey((k) => k + 1)
  }

  const handleGenerateAnalysis = async () => {
    if (!apartment) return
    const result = generateRentAnalysis(apartment, DEFAULT_RENT_PREFERENCES)
    setAnalysis(result); setAnalysisAt(null)
    if (organization?.id && id) {
      const ctx = { organizationId: organization.id }
      const [n, f] = await Promise.all([
        saveRentAnalysis(id, result, apartment, DEFAULT_RENT_PREFERENCES, ctx),
        replaceRentAnalysisFindings(id, result, ctx),
      ])
      if (n.success && f.success) { toast.success('Analysis saved.'); setAnalysisAt('Saved to cloud') }
    } else { toast.success('Analysis generated.') }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><Card className="p-10 text-center"><p className="text-muted-foreground">Loading...</p></Card></div>
  if (!apartment || !normalized || !score) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent')}>Back to Rent</Button>
        <Card className="border-dashed p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Opportunity not found</h1>
        </Card>
      </div>
    )
  }

  return (
    <DecisionWorkspace
      opportunity={normalized}
      score={score}
      onBack={() => navigate('/rent')}
      onEdit={isUser ? () => navigate('/rent/' + id + '/edit') : undefined}
      initialNotes={apartment.notes}
      extraContent={
        <div className="space-y-5">
          {isUser && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">Status</h3>
                <Select value={apartment.status ?? 'new'} onValueChange={(v) => handleStatusChange(v as RentalStatus)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RENTAL_STATUS_LABELS) as [RentalStatus, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">AI Analysis</h3>
              <div className="flex items-center gap-2">
              </div>
            </div>
            <Button onClick={handleGenerateAnalysis} className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
              <Brain className="mr-2 h-4 w-4" />
              {analysis ? 'Regenerate Analysis' : 'Generate Analysis'}
            </Button>
            {analysis && (
              <div className="space-y-2">
                {analysisAt && <p className="text-xs text-muted-foreground">{analysisAt}</p>}
                <RentAnalysisReport analysis={analysis} />
              </div>
            )}
          </Card>
        </div>
      }
    />
  )
}