import { useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from '@/components/ui/sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LandingPage } from '@/components/LandingPage'
import { Dashboard } from '@/components/Dashboard'
import { DealAnalyzer } from '@/components/DealAnalyzer'
import { InvestmentReport } from '@/components/InvestmentReport'
import { PricingPage } from '@/components/PricingPage'
import { PortfolioAnalytics } from '@/components/PortfolioAnalytics'
import { PortfolioDashboard } from '@/components/PortfolioDashboard'
import { MyOpportunities } from '@/components/MyOpportunities'
import { InvestmentPipeline } from '@/components/InvestmentPipeline'
import { PresentationPage } from '@/components/PresentationPage'
import { FoundingPartnerPresentation } from '@/components/FoundingPartnerPresentation'
import { AppNavigation } from '@/components/AppNavigation'
import { AppLayout } from '@/components/navigation/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NewOpportunityPage } from '@/pages/NewOpportunityPage'
import { OpportunityDetailPage } from '@/pages/OpportunityDetailPage'
import { OpportunityInvestmentReportPage } from '@/pages/OpportunityInvestmentReportPage'
import { DueDiligencePage } from '@/pages/DueDiligencePage'
import { PropertyComparisonPage } from '@/pages/PropertyComparisonPage'
import { OpportunityHunterDashboardPage } from '@/pages/OpportunityHunterDashboardPage'
import { OpportunityHunterFormPage } from '@/pages/OpportunityHunterFormPage'
import { OpportunityHunterDetailPage } from '@/pages/OpportunityHunterDetailPage'
import { OpportunityHunterRunDetailPage } from '@/pages/OpportunityHunterRunDetailPage'
import { RentDashboardPage } from '@/modules/rent/pages/RentDashboardPage'
import { NewRentOpportunityPage } from '@/modules/rent/pages/NewRentOpportunityPage'
import { RentDecisionWorkspacePage } from '@/modules/rent/pages/RentDecisionWorkspacePage'
import { MyDecisionsPage } from '@/modules/opportunity-intelligence/pages/MyDecisionsPage'
import { HunterLandingPage } from '@/modules/opportunity-intelligence/pages/HunterLandingPage'
import { DataManagementPage } from '@/modules/opportunity-intelligence/data-management'
import { EditRentOpportunityPage } from '@/modules/rent/pages/EditRentOpportunityPage'
import { RentComparisonPage } from '@/modules/rent/pages/RentComparisonPage'
import { RentHunterFormPage } from '@/modules/rent/hunter/pages/RentHunterFormPage'
import { RentHunterDashboardPage } from '@/modules/rent/hunter/pages/RentHunterDashboardPage'
import { RentHunterDetailPage } from '@/modules/rent/hunter/pages/RentHunterDetailPage'
import { RentImportUrlPage } from '@/modules/rent/hunter/pages/RentImportUrlPage'
import { RentManualCompletionPage } from '@/modules/rent/hunter/pages/RentManualCompletionPage'
import { BuyDashboardPage } from '@/modules/buy/pages/BuyDashboardPage'
import { InvestDashboardPage } from '@/modules/invest/pages/InvestDashboardPage'
import { BuildDashboardPage } from '@/modules/build/pages/BuildDashboardPage'
import { RenovateDashboardPage } from '@/modules/renovate/pages/RenovateDashboardPage'
import { AirbnbDashboardPage } from '@/modules/airbnb/pages/AirbnbDashboardPage'
import { DueDiligenceModulePage } from '@/modules/due-diligence/pages/DueDiligenceModulePage'
import { EnergyDashboardPage } from '@/modules/energy/pages/EnergyDashboardPage'
import { PortfolioModulePage } from '@/modules/portfolio/pages/PortfolioModulePage'
import { useAuth } from '@/hooks/useAuth'
import { generateMockAnalysis } from '@/lib/analyzerEngine'
import { generateDealAnalysis } from '@/services/api/dealAnalysis.service'
import { persistDealAnalyzerResult } from '@/services/supabase/dealPersistence.service'
import { ErrorFallback } from '@/ErrorFallback'
import type { Property, InvestmentAnalysis, Opportunity } from '@/lib/types'

interface AuthPageGuardProps {
  children: ReactNode
}

function AuthPageGuard({ children }: AuthPageGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <AppLayout>{children}</AppLayout>
  )
}

function App() {
  const navigate = useNavigate()
  const [currentAnalysis, setCurrentAnalysis] = useState<InvestmentAnalysis | undefined>()

  const handleNavigate = (page: string, data?: unknown) => {
    if (page === 'report' && data) {
      setCurrentAnalysis(data as InvestmentAnalysis)
      navigate('/reports')
      return
    }

    const routeMap: Record<string, string> = {
      landing: '/',
      dashboard: '/dashboard',
      analyzer: '/analyzer',
      opportunities: '/opportunities',
      'new-opportunity': '/opportunities/new',
      pricing: '/pricing',
      analytics: '/analytics',
      portfolio: '/portfolio',
      pipeline: '/pipeline',
      settings: '/settings',
      presentation: '/presentation',
      'founding-partner-presentation': '/presentation/founding-partner',
      reports: '/reports',
      compare: '/compare',
      'opportunity-hunter': '/opportunity-hunter',
    }

    navigate(routeMap[page] ?? '/')
  }

  const handleAnalyze = async (property: Property) => {
    let analysis: InvestmentAnalysis
    let aiSucceeded = false

    try {
      analysis = await generateDealAnalysis(property)
      aiSucceeded = true
    } catch (error) {
      console.warn('Falling back to mock analysis:', error instanceof Error ? error.message : 'Unknown error')
      analysis = generateMockAnalysis(property)
    }

    if (aiSucceeded) {
      const persistence = await persistDealAnalyzerResult(property, analysis)
      if (!persistence.persisted) {
        console.warn('Deal persistence skipped:', persistence.reason ?? 'Unknown reason')
      }
    }

    setCurrentAnalysis(analysis)
    navigate('/reports')
  }

  const handleViewOpportunity = (opportunity: Opportunity) => {
    if (opportunity.analysis) {
      setCurrentAnalysis(opportunity.analysis)
      navigate('/reports')
    }
  }

  const ReportsContent = () => {
    if (!currentAnalysis) {
      return (
        <Card className="border-dashed p-10 text-center">
          <h1 className="font-display text-2xl font-bold">No report selected</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Run a new analysis from the Deal Analyzer or open an opportunity with a saved analysis.
          </p>
          <Button className="mt-6" onClick={() => navigate('/opportunities/new')}>
            Analyze Property
          </Button>
        </Card>
      )
    }

    return <InvestmentReport analysis={currentAnalysis} onBack={() => navigate('/dashboard')} />
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-background">
              <AppNavigation />
              <LandingPage onNavigate={handleNavigate} />
            </div>
          }
        />
        <Route
          path="/pricing"
          element={
            <div className="min-h-screen bg-background">
              <AppNavigation />
              <PricingPage onNavigate={handleNavigate} />
            </div>
          }
        />
        <Route
          path="/login"
          element={
            <AuthPageGuard>
              <LoginPage />
            </AuthPageGuard>
          }
        />
        <Route
          path="/register"
          element={
            <AuthPageGuard>
              <RegisterPage />
            </AuthPageGuard>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthPageGuard>
              <ForgotPasswordPage />
            </AuthPageGuard>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<WorkspaceShell><Dashboard onNavigate={handleNavigate} /></WorkspaceShell>} />
          <Route
            path="/opportunities"
            element={
              <WorkspaceShell>
                <MyOpportunities onNavigate={handleNavigate} onBack={() => navigate('/dashboard')} />
              </WorkspaceShell>
            }
          />
          <Route
            path="/opportunities/new"
            element={
              <WorkspaceShell>
                <NewOpportunityPage />
              </WorkspaceShell>
            }
          />
          <Route
            path="/opportunities/:opportunityId"
            element={
              <WorkspaceShell>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <OpportunityDetailPage />
                </ErrorBoundary>
              </WorkspaceShell>
            }
          />
          <Route
            path="/opportunities/:opportunityId/report"
            element={
              <WorkspaceShell>
                <OpportunityInvestmentReportPage />
              </WorkspaceShell>
            }
          />
          <Route
            path="/opportunities/:opportunityId/due-diligence"
            element={
              <WorkspaceShell>
                <DueDiligencePage />
              </WorkspaceShell>
            }
          />
          <Route path="/reports" element={<WorkspaceShell><ReportsContent /></WorkspaceShell>} />
          <Route path="/compare" element={<WorkspaceShell><PropertyComparisonPage /></WorkspaceShell>} />
          <Route path="/settings" element={<WorkspaceShell><SettingsPage /></WorkspaceShell>} />
          <Route path="/settings/data-management" element={<WorkspaceShell><DataManagementPage /></WorkspaceShell>} />
          <Route path="/opportunity-hunter" element={<WorkspaceShell><OpportunityHunterDashboardPage /></WorkspaceShell>} />
          <Route path="/opportunity-hunter/runs/:runId" element={<WorkspaceShell><OpportunityHunterRunDetailPage /></WorkspaceShell>} />
          <Route path="/opportunity-hunter/new" element={<WorkspaceShell><OpportunityHunterFormPage /></WorkspaceShell>} />
          <Route path="/opportunity-hunter/:id" element={<WorkspaceShell><OpportunityHunterDetailPage /></WorkspaceShell>} />
          <Route path="/opportunity-hunter/:id/edit" element={<WorkspaceShell><OpportunityHunterFormPage /></WorkspaceShell>} />

          <Route path="/analyzer" element={<WorkspaceShell><DealAnalyzer onAnalyze={handleAnalyze} /></WorkspaceShell>} />
          <Route
            path="/pipeline"
            element={
              <WorkspaceShell>
                <InvestmentPipeline onBack={() => navigate('/dashboard')} onViewOpportunity={handleViewOpportunity} />
              </WorkspaceShell>
            }
          />
          <Route path="/portfolio" element={<WorkspaceShell><PortfolioDashboard /></WorkspaceShell>} />
          <Route path="/analytics" element={<WorkspaceShell><PortfolioAnalytics onBack={() => navigate('/dashboard')} /></WorkspaceShell>} />

          <Route path="/decisions" element={<WorkspaceShell><MyDecisionsPage /></WorkspaceShell>} />
          <Route path="/hunter" element={<WorkspaceShell><HunterLandingPage /></WorkspaceShell>} />
          <Route path="/my-opportunities" element={<Navigate to="/decisions" replace />} />
          <Route path="/opportunities" element={<Navigate to="/decisions" replace />} />
          <Route path="/rent" element={<WorkspaceShell><RentDashboardPage /></WorkspaceShell>} />
          <Route path="/rent/new" element={<WorkspaceShell><NewRentOpportunityPage /></WorkspaceShell>} />
          <Route path="/rent/compare" element={<WorkspaceShell><RentComparisonPage /></WorkspaceShell>} />
          <Route path="/rent/hunter" element={<WorkspaceShell><RentHunterDashboardPage /></WorkspaceShell>} />
          <Route path="/rent/hunter/new" element={<WorkspaceShell><RentHunterFormPage /></WorkspaceShell>} />
          <Route path="/rent/hunter/import-url" element={<WorkspaceShell><RentImportUrlPage /></WorkspaceShell>} />
          <Route path="/rent/hunter/manual-completion/:rawId" element={<WorkspaceShell><RentManualCompletionPage /></WorkspaceShell>} />
          <Route path="/rent/hunter/:id" element={<WorkspaceShell><RentHunterDetailPage /></WorkspaceShell>} />
          <Route path="/rent/:id" element={<WorkspaceShell><RentDecisionWorkspacePage /></WorkspaceShell>} />
          <Route path="/rent/:id/edit" element={<WorkspaceShell><EditRentOpportunityPage /></WorkspaceShell>} />
          <Route path="/buy" element={<WorkspaceShell><BuyDashboardPage /></WorkspaceShell>} />
          <Route path="/invest" element={<WorkspaceShell><InvestDashboardPage /></WorkspaceShell>} />
          <Route path="/build" element={<WorkspaceShell><BuildDashboardPage /></WorkspaceShell>} />
          <Route path="/renovate" element={<WorkspaceShell><RenovateDashboardPage /></WorkspaceShell>} />
          <Route path="/airbnb" element={<WorkspaceShell><AirbnbDashboardPage /></WorkspaceShell>} />
          <Route path="/due-diligence" element={<WorkspaceShell><DueDiligenceModulePage /></WorkspaceShell>} />
          <Route path="/energy" element={<WorkspaceShell><EnergyDashboardPage /></WorkspaceShell>} />
          <Route path="/portfolio-intelligence" element={<WorkspaceShell><PortfolioModulePage /></WorkspaceShell>} />
        </Route>

        <Route path="/presentation" element={<PresentationPage onExit={() => navigate('/')} />} />
        <Route path="/presentation/founding-partner" element={<FoundingPartnerPresentation onExit={() => navigate('/')} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </>
  )
}

export default App