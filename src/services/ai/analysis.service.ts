import type { Property, InvestmentAnalysis } from '@/lib/types'
import { API_CONFIG, hasAIConfig } from '../config'
import { generateMockAnalysis } from '@/lib/analyzerEngine'

export interface AIAnalysisRequest {
  property: Property
  context?: {
    marketData?: unknown
    comparableProperties?: unknown[]
    userPreferences?: unknown
  }
}

export interface AIInsightRequest {
  analysisId: string
  focusArea?: 'risks' | 'opportunities' | 'renovation' | 'location' | 'financials'
}

export interface AIInsight {
  id: string
  type: 'warning' | 'opportunity' | 'info' | 'success'
  title: string
  description: string
  confidence: number
  category: string
  actionable: boolean
  suggestedActions?: string[]
}

export class AIService {
  async analyzeProperty(request: AIAnalysisRequest): Promise<InvestmentAnalysis> {
    if (!hasAIConfig()) {
      console.warn('AI configuration not found. Using mock analysis.')
      return this.getMockAnalysis(request.property)
    }

    try {
      const prompt = this.buildAnalysisPrompt(request)
      
      const response = await spark.llm(
        spark.llmPrompt`${prompt}`,
        API_CONFIG.ai.modelName,
        true
      )

      const result = JSON.parse(response)
      return this.parseAnalysisResponse(result, request.property)
    } catch (error) {
      console.error('Error analyzing property with AI:', error)
      return this.getMockAnalysis(request.property)
    }
  }

  async generateInsights(request: AIInsightRequest): Promise<AIInsight[]> {
    if (!hasAIConfig()) {
      return this.getMockInsights(request.focusArea)
    }

    try {
      const prompt = this.buildInsightsPrompt(request)
      
      const response = await spark.llm(
        spark.llmPrompt`${prompt}`,
        API_CONFIG.ai.modelName,
        true
      )

      const result = JSON.parse(response)
      return result.insights as AIInsight[]
    } catch (error) {
      console.error('Error generating AI insights:', error)
      return this.getMockInsights(request.focusArea)
    }
  }

  async scoreLocation(country: string, city: string, district?: string): Promise<{
    overall: number
    appreciation: number
    rentalDemand: number
    tourismScore: number
    liquidity: number
    infrastructure: number
    summary: string
  }> {
    if (!hasAIConfig()) {
      return this.getMockLocationScore()
    }

    try {
      const prompt = spark.llmPrompt`
Analyze the real estate investment potential of this location:
Country: ${country}
City: ${city}
${district ? `District: ${district}` : ''}

Provide a comprehensive location score with the following metrics (scale 0-100):
- Overall investment score
- Appreciation potential
- Rental demand
- Tourism score
- Liquidity (ease of selling)
- Infrastructure development

Also provide a brief summary (2-3 sentences) of the location's investment characteristics.

Return the result as JSON in the following format:
{
  "overall": <number>,
  "appreciation": <number>,
  "rentalDemand": <number>,
  "tourismScore": <number>,
  "liquidity": <number>,
  "infrastructure": <number>,
  "summary": "<string>"
}
`
      
      const response = await spark.llm(prompt, API_CONFIG.ai.modelName, true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Error scoring location with AI:', error)
      return this.getMockLocationScore()
    }
  }

  async generateMarketSummary(country: string, propertyType: string): Promise<string> {
    if (!hasAIConfig()) {
      return `The ${propertyType} market in ${country} shows moderate growth potential with stable demand from both local and international investors.`
    }

    try {
      const prompt = spark.llmPrompt`
Generate a brief 2-3 sentence market summary for ${propertyType} properties in ${country}.
Focus on current trends, demand, and investment outlook.
`
      
      return await spark.llm(prompt, API_CONFIG.ai.modelName, false)
    } catch (error) {
      console.error('Error generating market summary:', error)
      return `The ${propertyType} market in ${country} shows moderate growth potential.`
    }
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    const { property, context } = request
    const marketDataSection = context?.marketData
      ? `- Market Data Context: ${JSON.stringify(context.marketData)}`
      : '- Market Data Context: unavailable (fallback estimates may be used)'

    return `
You are an expert real estate investment analyst. Analyze the following property and provide a comprehensive investment analysis.

Property Details:
- Type: ${property.type}
- Location: ${property.district}, ${property.city}, ${property.country}
- Asking Price: ${property.price} ${property.currency}
- Size: ${property.size} m²
- Bedrooms: ${property.bedrooms || 'N/A'}
- Condition: ${property.condition || 'Unknown'}
${property.description ? `- Description: ${property.description}` : ''}
${property.expectedRent ? `- Expected Monthly Rent: ${property.expectedRent} ${property.currency}` : ''}
${marketDataSection}

Provide a detailed investment analysis with:
1. Overall investment score (0-100)
2. Buy/Watch/Avoid recommendation
3. Executive summary
4. ROI analysis (rental yield, appreciation potential)
5. Key risks
6. Key opportunities
7. Market context

Return the result as valid JSON following the InvestmentAnalysis schema.
`
  }

  private buildInsightsPrompt(request: AIInsightRequest): string {
    const focusDescription = request.focusArea
      ? `Focus specifically on ${request.focusArea}-related insights.`
      : 'Provide a comprehensive set of insights across all areas.'

    return `
Generate actionable AI-powered insights for a real estate investment property.
${focusDescription}

Provide 3-5 high-value insights that help investors make better decisions.

Each insight should have:
- type: warning | opportunity | info | success
- title: Short, clear headline
- description: 2-3 sentence explanation
- confidence: 0-100
- category: risks | opportunities | market | location | renovation | financials
- actionable: boolean
- suggestedActions: array of recommended next steps (optional)

Return the result as JSON:
{
  "insights": [array of insight objects]
}
`
  }

  private parseAnalysisResponse(response: unknown, property: Property): InvestmentAnalysis {
    return response as InvestmentAnalysis
  }

  private getMockAnalysis(property: Property): InvestmentAnalysis {
    return generateMockAnalysis(property)
  }

  private getMockInsights(focusArea?: string): AIInsight[] {
    const allInsights: AIInsight[] = [
      {
        id: '1',
        type: 'opportunity',
        title: 'Property may be undervalued by 12%',
        description: 'Based on comparable properties in the area, this listing appears to be priced below market value. Similar properties are selling for 10-15% more.',
        confidence: 85,
        category: 'opportunities',
        actionable: true,
        suggestedActions: [
          'Request property inspection',
          'Verify property condition',
          'Make competitive offer quickly',
        ],
      },
      {
        id: '2',
        type: 'success',
        title: 'High Airbnb demand detected',
        description: 'This location shows strong short-term rental performance. Average occupancy rates are 78% with above-market nightly rates.',
        confidence: 92,
        category: 'opportunities',
        actionable: true,
        suggestedActions: [
          'Research local STR regulations',
          'Calculate Airbnb vs long-term rental ROI',
          'Connect with local property managers',
        ],
      },
      {
        id: '3',
        type: 'warning',
        title: 'Legal documentation review recommended',
        description: 'Properties in this area sometimes have complex ownership structures. Professional legal review is advised before proceeding.',
        confidence: 70,
        category: 'risks',
        actionable: true,
        suggestedActions: [
          'Hire local real estate attorney',
          'Request all ownership documents',
          'Verify property title is clear',
        ],
      },
      {
        id: '4',
        type: 'info',
        title: 'Renovation upside identified',
        description: 'Based on property age and condition, strategic renovations could increase property value by 18-25% within 12 months.',
        confidence: 78,
        category: 'renovation',
        actionable: true,
        suggestedActions: [
          'Get 3 contractor estimates',
          'Prioritize kitchen and bathroom updates',
          'Consider energy efficiency upgrades',
        ],
      },
      {
        id: '5',
        type: 'success',
        title: 'Area appreciation trend increasing',
        description: 'Property values in this district have grown 8.2% annually over the past 3 years, outpacing the city average of 5.1%.',
        confidence: 88,
        category: 'location',
        actionable: false,
      },
    ]

    if (!focusArea) {
      return allInsights
    }

    return allInsights.filter(insight => insight.category === focusArea)
  }

  private getMockLocationScore() {
    return {
      overall: 78,
      appreciation: 82,
      rentalDemand: 75,
      tourismScore: 85,
      liquidity: 70,
      infrastructure: 73,
      summary: 'This location shows strong fundamentals with above-average appreciation potential and solid rental demand. Infrastructure development is ongoing, which should support continued growth.',
    }
  }
}

export const aiService = new AIService()
