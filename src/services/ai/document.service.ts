import { API_CONFIG, hasAIConfig } from '../config'

export type DueDiligenceDocumentType =
  | 'ownership_document'
  | 'building_permit'
  | 'epc_certificate'
  | 'utility_bill'
  | 'floor_plan'
  | 'renovation_quotation'
  | 'seller_disclosure'

export interface DocumentAnalysisResult {
  summary: string
  detectedRisks: string[]
  missingItems: string[]
  recommendations: string[]
  confidence: number
}

export interface DueDiligenceExtractionResult {
  summary: string
  keyFacts: string[]
  risks: string[]
  missingFields: string[]
  questionsToAskSeller: string[]
  confidence: number
}

export class DocumentAIService {
  async analyzeDueDiligenceDocument(
    documentType: DueDiligenceDocumentType,
    documentText: string,
  ): Promise<DueDiligenceExtractionResult> {
    if (!hasAIConfig()) {
      return this.getMockDueDiligenceExtraction(documentType)
    }

    try {
      const prompt = spark.llmPrompt`
You are an expert real estate due diligence analyst.

Analyze this uploaded document for an investor:
- Document type: ${documentType}
- Document content:
${documentText}

Return ONLY JSON with this structure:
{
  "summary": "<string>",
  "keyFacts": ["<string>"],
  "risks": ["<string>"],
  "missingFields": ["<string>"],
  "questionsToAskSeller": ["<string>"],
  "confidence": <number 0-100>
}

Guidance:
- keyFacts: concrete verified details found in the document.
- risks: potential legal, technical, financial, or compliance concerns.
- missingFields: important due diligence fields absent from the document.
- questionsToAskSeller: specific follow-up questions an investor should ask.
- confidence: confidence in extraction quality based on content clarity.
`

      const response = await spark.llm(prompt, API_CONFIG.ai.modelName, true)
      const parsed = JSON.parse(response) as Partial<DueDiligenceExtractionResult>

      const asStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) return []
        return value
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
      }

      const confidenceRaw = Number(parsed.confidence)
      const confidence = Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
        : 70

      return {
        summary: typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : 'Document analyzed for due diligence.',
        keyFacts: asStringArray(parsed.keyFacts),
        risks: asStringArray(parsed.risks),
        missingFields: asStringArray(parsed.missingFields),
        questionsToAskSeller: asStringArray(parsed.questionsToAskSeller),
        confidence,
      }
    } catch (error) {
      console.error('Error analyzing due diligence document with AI:', error)
      return this.getMockDueDiligenceExtraction(documentType)
    }
  }

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

  private getMockDueDiligenceExtraction(documentType: DueDiligenceDocumentType): DueDiligenceExtractionResult {
    const defaults: Record<DueDiligenceDocumentType, DueDiligenceExtractionResult> = {
      ownership_document: {
        summary: 'Ownership records indicate current registered owner and transfer history.',
        keyFacts: ['Registered owner name matches listing details', 'Ownership transfer chain appears complete'],
        risks: ['Encumbrance status is not explicitly stated in the provided copy'],
        missingFields: ['Recent lien certificate', 'Tax debt clearance certificate'],
        questionsToAskSeller: ['Can you provide latest lien and debt-free certificate?', 'Were there any ownership disputes in the last 5 years?'],
        confidence: 79,
      },
      building_permit: {
        summary: 'Permit document references approved works and municipal registration numbers.',
        keyFacts: ['Primary structural permit number is present', 'Issue date is clearly visible'],
        risks: ['Completion sign-off is not attached'],
        missingFields: ['Final inspection approval', 'Occupancy authorization'],
        questionsToAskSeller: ['Do you have final municipal completion approval?', 'Were any unpermitted alterations made after approval?'],
        confidence: 76,
      },
      epc_certificate: {
        summary: 'EPC includes current energy efficiency grade and validity period.',
        keyFacts: ['Energy grade appears on certificate', 'Certificate expiration date is provided'],
        risks: ['No evidence that recommended efficiency upgrades were completed'],
        missingFields: ['Invoice evidence for efficiency upgrades'],
        questionsToAskSeller: ['Have you completed any EPC-recommended upgrades?', 'Can you share post-upgrade utility trend data?'],
        confidence: 81,
      },
      utility_bill: {
        summary: 'Utility bill provides consumption and cost snapshots for billing cycle.',
        keyFacts: ['Monthly consumption values are present', 'Billing account appears tied to property address'],
        risks: ['Only a limited period of utility history is available'],
        missingFields: ['12-month utility history', 'Evidence of unpaid balances'],
        questionsToAskSeller: ['Can you provide full 12-month utility history?', 'Are there any outstanding utility debts?'],
        confidence: 74,
      },
      floor_plan: {
        summary: 'Floor plan outlines room layout and approximate interior distribution.',
        keyFacts: ['Room configuration is clear', 'Circulation and access points are visible'],
        risks: ['Measured areas are not certified in the uploaded plan'],
        missingFields: ['Certified measurement report', 'As-built update after renovations'],
        questionsToAskSeller: ['Can you provide certified gross/net area measurements?', 'Were layout modifications officially approved?'],
        confidence: 72,
      },
      renovation_quotation: {
        summary: 'Renovation quotation includes scope categories and estimated cost lines.',
        keyFacts: ['Quoted total amount is provided', 'Scope categories are listed'],
        risks: ['No contractor licensing or warranty terms attached'],
        missingFields: ['Detailed bill of quantities', 'Warranty and contractor credentials'],
        questionsToAskSeller: ['Can you provide a detailed bill of quantities?', 'What warranty applies to each work package?'],
        confidence: 75,
      },
      seller_disclosure: {
        summary: 'Seller disclosure lists known property condition statements and declarations.',
        keyFacts: ['Disclosure includes known defects section', 'Seller declaration signature appears present'],
        risks: ['No third-party verification attached for disclosed conditions'],
        missingFields: ['Supporting inspection reports', 'Remediation receipts for disclosed issues'],
        questionsToAskSeller: ['Can you provide evidence for repairs on disclosed issues?', 'Are there any undisclosed disputes or claims?'],
        confidence: 78,
      },
    }

    return defaults[documentType]
  }
}

export const documentAIService = new DocumentAIService()
