import type { Property } from './property'
import type { AiFindingSourceType } from './aiFinding'

export type InvestmentRecommendation = 'buy' | 'watch' | 'avoid'

export interface InvestmentScore {
  overall: number
  rentalYield: number
  airbnbPotential: number
  appreciation: number
  renovation: number
  legal: number
  liquidity: number
  energy: number
}

export interface RentalYieldEstimate {
  monthly: number
  annual: number
  percentage: number
}

export interface AirbnbPotential {
  dailyRate: number
  occupancy: number
  monthlyRevenue: number
  annualRevenue: number
  percentage: number
}

export interface RenovationROI {
  estimatedCost: number
  valueIncrease: number
  roi: number
}

export interface AppreciationPotential {
  oneYear: number
  threeYear: number
  fiveYear: number
}

export type AnalysisConfidenceLevel = 'low' | 'medium' | 'high'

export interface ExecutiveDecision {
  recommendation: 'BUY' | 'WATCH' | 'AVOID'
  score: number
  confidence: 'Low' | 'Medium' | 'High'
  summary: string
}

export interface FinancialModel {
  askingPrice: number
  estimatedMonthlyRent: number
  annualRent: number
  grossRentalYield: number
  airbnbYield: number
  estimatedROI: number
  projectedValue5Year: number
  estimatedMonthlyCashflow: number
}

export interface ScenarioAnalysisRow {
  monthlyRent: number
  rentalYield: number
  annualROI: number
  projectedRoi5Year: number
  projectedPropertyValue5Year: number
}

export interface ScenarioAnalysis {
  conservative: ScenarioAnalysisRow
  base: ScenarioAnalysisRow
  optimistic: ScenarioAnalysisRow
}

export interface InvestmentThesis {
  reasonsToInvest: string[]
  risks: string[]
  upsideOpportunities: string[]
}

export interface DataQuality {
  usedLiveMarketData: boolean
  usedDeterministicFallback: boolean
  confidenceLevel: 'Low' | 'Medium' | 'High'
  missingData: string[]
}

export interface ConfidenceBreakdown {
  confidence: number
  dataCompleteness: number
  evidenceStrength: number
  sourceQuality: number
}

export type MissingEvidenceSeverity = 'critical' | 'important' | 'optional'

export interface AnalysisFindingItem {
  title: string
  value: string
  confidence: number | null
  sourceType: AiFindingSourceType
  explanation: string
  severity?: MissingEvidenceSeverity
}

export type AnalysisFindingBucket =
  | 'facts'
  | 'estimates'
  | 'assumptions'
  | 'risks'
  | 'opportunities'
  | 'missingEvidence'

export interface AnalysisFindings {
  facts: AnalysisFindingItem[]
  estimates: AnalysisFindingItem[]
  assumptions: AnalysisFindingItem[]
  risks: AnalysisFindingItem[]
  opportunities: AnalysisFindingItem[]
  missingEvidence: AnalysisFindingItem[]
}

export interface InvestmentAnalysis {
  id: string
  propertyId: string
  property: Property
  score: InvestmentScore
  recommendation: InvestmentRecommendation
  executiveSummary: string
  rentalYieldEstimate: RentalYieldEstimate
  airbnbPotential: AirbnbPotential
  renovationROI: RenovationROI
  appreciationPotential: AppreciationPotential
  risks: string[]
  opportunities: string[]
  assumptions: string[]
  missingData: string[]
  findings?: AnalysisFindings
  recommendationConfidence?: ConfidenceBreakdown
  confidenceLevel?: AnalysisConfidenceLevel
  executiveDecision?: ExecutiveDecision
  financialModel?: FinancialModel
  scenarioAnalysis?: ScenarioAnalysis
  investmentThesisDetail?: InvestmentThesis
  dueDiligenceChecklist?: string[]
  dataQuality?: DataQuality
  reportText?: string
  analyzedAt: string
}
