import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { LandingPage } from '@/components/LandingPage'
import { Dashboard } from '@/components/Dashboard'
import { DealAnalyzer } from '@/components/DealAnalyzer'
import { InvestmentReport } from '@/components/InvestmentReport'
import { PricingPage } from '@/components/PricingPage'
import { PortfolioAnalytics } from '@/components/PortfolioAnalytics'
import { OpportunityTracker } from '@/components/OpportunityTracker'
import { InvestmentPipeline } from '@/components/InvestmentPipeline'
import { PageLayout } from '@/components/PageLayout'
import { generateMockAnalysis } from '@/lib/analyzerEngine'
import type { Property, InvestmentAnalysis, Opportunity } from '@/lib/types'

type Page = 'landing' | 'dashboard' | 'analyzer' | 'report' | 'opportunities' | 'pricing' | 'analytics' | 'pipeline'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [currentAnalysis, setCurrentAnalysis] = useState<InvestmentAnalysis | undefined>()

  const handleNavigate = (page: string, data?: unknown) => {
    if (page === 'report' && data) {
      setCurrentAnalysis(data as InvestmentAnalysis)
      setCurrentPage('report')
    } else {
      setCurrentPage(page as Page)
    }
    window.scrollTo(0, 0)
  }

  const handleAnalyze = (property: Property) => {
    const analysis = generateMockAnalysis(property)
    setCurrentAnalysis(analysis)
    setCurrentPage('report')
    window.scrollTo(0, 0)
  }

  const handleViewOpportunity = (opportunity: Opportunity) => {
    if (opportunity.analysis) {
      setCurrentAnalysis(opportunity.analysis)
      setCurrentPage('report')
      window.scrollTo(0, 0)
    }
  }

  return (
    <>
      {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
      
      {currentPage === 'pricing' && <PricingPage onNavigate={handleNavigate} />}
      
      {currentPage === 'dashboard' && (
        <PageLayout>
          <Dashboard onNavigate={handleNavigate} />
        </PageLayout>
      )}

      {currentPage === 'pipeline' && (
        <PageLayout>
          <InvestmentPipeline 
            onBack={() => handleNavigate('dashboard')}
            onViewOpportunity={handleViewOpportunity}
          />
        </PageLayout>
      )}

      {currentPage === 'opportunities' && (
        <PageLayout>
          <OpportunityTracker 
            onNavigate={handleNavigate} 
            onBack={() => handleNavigate('dashboard')}
          />
        </PageLayout>
      )}
      
      {currentPage === 'analyzer' && (
        <PageLayout fullWidth>
          <DealAnalyzer onAnalyze={handleAnalyze} />
        </PageLayout>
      )}
      
      {currentPage === 'report' && (
        <PageLayout>
          <InvestmentReport 
            analysis={currentAnalysis} 
            onBack={() => handleNavigate('dashboard')} 
          />
        </PageLayout>
      )}

      {currentPage === 'analytics' && (
        <PageLayout>
          <PortfolioAnalytics onBack={() => handleNavigate('dashboard')} />
        </PageLayout>
      )}

      <Toaster />
    </>
  )
}

export default App