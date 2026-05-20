import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { LandingPage } from '@/components/LandingPage'
import { Dashboard } from '@/components/Dashboard'
import { DealAnalyzer } from '@/components/DealAnalyzer'
import { InvestmentReport } from '@/components/InvestmentReport'
import { PricingPage } from '@/components/PricingPage'
import { generateMockAnalysis } from '@/lib/analyzerEngine'
import type { Property, InvestmentAnalysis } from '@/lib/types'

type Page = 'landing' | 'dashboard' | 'analyzer' | 'report' | 'opportunities' | 'pricing'

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

  return (
    <>
      {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
      
      {currentPage === 'pricing' && <PricingPage onNavigate={handleNavigate} />}
      
      {(currentPage === 'dashboard' || currentPage === 'opportunities') && (
        <div className="min-h-screen bg-background p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Dashboard onNavigate={handleNavigate} />
          </div>
        </div>
      )}
      
      {currentPage === 'analyzer' && (
        <div className="min-h-screen bg-background p-6 lg:p-8">
          <DealAnalyzer onAnalyze={handleAnalyze} />
        </div>
      )}
      
      {currentPage === 'report' && (
        <div className="min-h-screen bg-background p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <InvestmentReport 
              analysis={currentAnalysis} 
              onBack={() => handleNavigate('dashboard')} 
            />
          </div>
        </div>
      )}

      <Toaster />
    </>
  )
}

export default App