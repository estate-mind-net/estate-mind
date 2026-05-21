import { API_CONFIG, hasAIConfig } from '../config'

export interface DocumentAnalysisResult {
  summary: string
  detectedRisks: string[]
  missingItems: string[]
  recommendations: string[]
  confidence: number
}

export class DocumentAIService {
  async analyzeDocument(
    documentType: 'title' | 'permit' | 'contract' | 'appraisal' | 'inspection' | 'other',
    documentText: string
  ): Promise<DocumentAnalysisResult> {
    if (!hasAIConfig()) {
      return this.getMockDocumentAnalysis(documentType)
    }

    try {
      const prompt = spark.llmPrompt`
You are a real estate document analysis expert. Analyze the following ${documentType} document:

${documentText}

Provide:
1. A brief summary of the document's key points
2. Any detected risks or red flags
3. Missing items or information that should be present
4. Recommendations for next steps
5. Your confidence level in this analysis (0-100)

Return the result as JSON:
{
  "summary": "<string>",
  "detectedRisks": [<array of strings>],
  "missingItems": [<array of strings>],
  "recommendations": [<array of strings>],
  "confidence": <number>
}
`

      const response = await spark.llm(prompt, API_CONFIG.ai.modelName, true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Error analyzing document with AI:', error)
      return this.getMockDocumentAnalysis(documentType)
    }
  }

  async extractPropertyDetails(documentText: string): Promise<{
    address?: string
    price?: number
    size?: number
    bedrooms?: number
    bathrooms?: number
    yearBuilt?: number
    lotSize?: number
    [key: string]: unknown
  }> {
    if (!hasAIConfig()) {
      return {}
    }

    try {
      const prompt = spark.llmPrompt`
Extract structured property information from the following document text:

${documentText}

Identify and extract any of the following fields if present:
- address
- price
- size (in square meters)
- bedrooms
- bathrooms
- yearBuilt
- lotSize
- any other relevant property details

Return the result as JSON with only the fields you can confidently extract.
`

      const response = await spark.llm(prompt, API_CONFIG.ai.modelName, true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Error extracting property details:', error)
      return {}
    }
  }

  async generateDueDiligenceChecklist(propertyType: string, country: string): Promise<{
    items: Array<{
      category: string
      task: string
      priority: 'high' | 'medium' | 'low'
      description: string
    }>
  }> {
    if (!hasAIConfig()) {
      return this.getMockChecklist(propertyType, country)
    }

    try {
      const prompt = spark.llmPrompt`
Generate a comprehensive due diligence checklist for purchasing a ${propertyType} property in ${country}.

Include items across these categories:
- Legal & Title
- Financial
- Physical Inspection
- Environmental
- Zoning & Permits
- Market Analysis

For each item, provide:
- category
- task name
- priority (high, medium, low)
- brief description

Return the result as JSON:
{
  "items": [array of checklist items]
}
`

      const response = await spark.llm(prompt, API_CONFIG.ai.modelName, true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Error generating checklist:', error)
      return this.getMockChecklist(propertyType, country)
    }
  }

  private getMockDocumentAnalysis(documentType: string): DocumentAnalysisResult {
    const mockResults: Record<string, DocumentAnalysisResult> = {
      title: {
        summary: 'Title deed appears to be in order with clear ownership chain. Property is free of liens.',
        detectedRisks: [],
        missingItems: ['Recent survey certificate'],
        recommendations: [
          'Verify current owner matches title deed',
          'Confirm property boundaries with survey',
          'Check for any recent easements or encumbrances',
        ],
        confidence: 85,
      },
      permit: {
        summary: 'Building permits are present for the main structure. Some renovation work may require additional permits.',
        detectedRisks: ['Potential unpermitted bathroom addition'],
        missingItems: ['Certificate of occupancy', 'Final inspection approval'],
        recommendations: [
          'Request certificate of occupancy from seller',
          'Verify bathroom addition with local building department',
          'Consider permit remediation costs in offer',
        ],
        confidence: 78,
      },
      contract: {
        summary: 'Standard purchase agreement with typical contingencies. Closing timeline is reasonable.',
        detectedRisks: [],
        missingItems: ['Home warranty addendum', 'Appliance list'],
        recommendations: [
          'Add home warranty for major systems',
          'Clarify which appliances are included',
          'Consider shorter inspection period',
        ],
        confidence: 92,
      },
      default: {
        summary: 'Document has been reviewed. Key information extracted successfully.',
        detectedRisks: [],
        missingItems: [],
        recommendations: ['Professional review recommended for legal documents'],
        confidence: 75,
      },
    }

    return mockResults[documentType] || mockResults.default
  }

  private getMockChecklist(propertyType: string, country: string) {
    return {
      items: [
        {
          category: 'Legal & Title',
          task: 'Title Search',
          priority: 'high' as const,
          description: 'Conduct comprehensive title search to verify ownership and identify liens',
        },
        {
          category: 'Legal & Title',
          task: 'Property Survey',
          priority: 'high' as const,
          description: 'Order professional survey to confirm boundaries and identify encroachments',
        },
        {
          category: 'Financial',
          task: 'Property Tax Review',
          priority: 'high' as const,
          description: 'Review property tax history and verify current tax status',
        },
        {
          category: 'Financial',
          task: 'HOA Fees & Documents',
          priority: 'medium' as const,
          description: 'Request HOA financial statements, bylaws, and fee schedules',
        },
        {
          category: 'Physical Inspection',
          task: 'Home Inspection',
          priority: 'high' as const,
          description: 'Hire licensed inspector for comprehensive property inspection',
        },
        {
          category: 'Physical Inspection',
          task: 'Pest Inspection',
          priority: 'medium' as const,
          description: 'Check for termites, wood rot, and other pest damage',
        },
        {
          category: 'Zoning & Permits',
          task: 'Zoning Verification',
          priority: 'high' as const,
          description: 'Confirm current zoning and permitted uses',
        },
        {
          category: 'Zoning & Permits',
          task: 'Permit History',
          priority: 'medium' as const,
          description: 'Review building permit history for unpermitted work',
        },
        {
          category: 'Market Analysis',
          task: 'Comparable Sales',
          priority: 'medium' as const,
          description: 'Research recent sales of similar properties in the area',
        },
        {
          category: 'Environmental',
          task: 'Environmental Assessment',
          priority: 'low' as const,
          description: 'Consider Phase I environmental assessment if commercial or industrial history',
        },
      ],
    }
  }
}

export const documentAIService = new DocumentAIService()
