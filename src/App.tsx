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
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NewOpportunityPage } from '@/pages/NewOpportunityPage'
import { OpportunityDetailPage } from '@/pages/OpportunityDetailPage'
import { OpportunityInvestmentReportPage } from '@/pages/OpportunityInvestmentReportPage'
import { PropertyComparisonPage } from '@/pages/PropertyComparisonPage'
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
    <div className="min-h-screen bg-background">
      <AppNavigation />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </div>
    </div>
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
          <Route path="/reports" element={<WorkspaceShell><ReportsContent /></WorkspaceShell>} />
          <Route path="/compare" element={<WorkspaceShell><PropertyComparisonPage /></WorkspaceShell>} />
          <Route path="/settings" element={<WorkspaceShell><SettingsPage /></WorkspaceShell>} />

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