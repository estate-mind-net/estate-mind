# OpenAI Server Integration (EstateMind)

This project now includes a repository-owned server-side AI endpoint for deal analysis.

## What Was Added

- A Vite dev-server middleware endpoint:
  - `POST /api/deal-analysis`
- Frontend analyzer flow now calls this endpoint first.
- Existing mock analysis is kept as fallback if endpoint fails or API key is missing.

## Security Model

- `OPENAI_API_KEY` is read only on the server side inside `vite.config.ts` middleware.
- The browser never receives or stores provider secrets.
- Do not use `VITE_OPENAI_API_KEY` for provider credentials.

## Files

- Server endpoint and OpenAI call:
  - `vite.config.ts`
- Frontend API client:
  - `src/services/api/dealAnalysis.service.ts`
- Analyzer flow wiring + fallback:
  - `src/App.tsx`
  - `src/components/DealAnalyzer.tsx`
- Environment template:
  - `.env.local.example`

## Local Setup

1. Create or update `.env.local` in the repository root.
2. Add at minimum:

```env
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4o-mini
```

3. Start the app:

```bash
npm run dev
```

## Test Flow

1. Open the app and navigate to Deal Analyzer.
2. Fill required property fields and submit.
3. Expected behavior:
- If server key is configured and provider call succeeds, report is generated from server AI JSON.
- If server key is missing or provider call fails, app logs a warning and falls back to `generateMockAnalysis`.

## Error Handling

- Endpoint returns sanitized errors without exposing secrets.
- Server logs include status and bounded provider error details for debugging.
- Frontend catches endpoint failures and uses mock analysis fallback to preserve UX.

## Notes

- This endpoint is implemented in Vite middleware for local development safety and minimal changes.
- For production deployment, move this route into a dedicated backend/runtime and keep the same request/response contract.
