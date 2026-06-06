// Vercel Serverless Function entrypoint.
// Production and `vercel dev` route /api/deal-analysis here.
// Business logic is centralized in src/lib/server/dealAnalysisHandler.ts.

import { handleDealAnalysisRequest } from '../src/lib/server/dealAnalysisHandler'

export default async function handler(request: Request): Promise<Response> {
  return handleDealAnalysisRequest(request)
}
