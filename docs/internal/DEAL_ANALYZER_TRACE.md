# Deal Analyzer Execution Trace

Date: 2026-06-03
Repository: EstateMind (estatemind)

## Scope

This trace documents exactly what happens after the user clicks Analyze in the current codebase.

## 1) UI Component That Submits Analysis

Submission starts in:
- [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx)

Key flow:
- Form `onSubmit={handleSubmit}` triggers [handleSubmit](src/components/DealAnalyzer.tsx#L31).
- `handleSubmit` builds a `property` object from form values and calls:
  - `await onAnalyze(property)` at [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx#L57).

`onAnalyze` is provided by App:
- [src/App.tsx](src/App.tsx#L31)
- Passed into component at [src/App.tsx](src/App.tsx#L87).

## 2) API Endpoint Called

Frontend API call:
- [src/services/api/dealAnalysis.service.ts](src/services/api/dealAnalysis.service.ts#L14)
- Endpoint: `POST /api/deal-analysis`

Endpoint implementation lives in Vite middleware:
- [vite.config.ts](vite.config.ts#L208)
- Route gate checks:
  - `req.method === 'POST'`
  - `pathname === '/api/deal-analysis'`

## 3) Request Payload Sent (Browser -> Endpoint)

Payload is sent from [src/services/api/dealAnalysis.service.ts](src/services/api/dealAnalysis.service.ts#L20):

```json
{
  "property": {
    "id": "<timestamp string>",
    "title": "...",
    "country": "...",
    "city": "...",
    "district": "...",
    "propertyType": "apartment|villa|house|land|commercial|mixed-use",
    "askingPrice": 425000,
    "currency": "EUR|USD|GBP",
    "sizeSqm": 85,
    "bedrooms": 2,
    "condition": "new|excellent|good|needs-renovation|under-construction",
    "listingUrl": "optional",
    "description": "...",
    "expectedRent": 1800,
    "airbnbAssumptions": "optional",
    "renovationNotes": "optional",
    "legalNotes": "optional",
    "createdAt": "ISO string"
  }
}
```

Source object construction:
- [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx#L35)
- Property type contract:
  - [src/lib/types/property.ts](src/lib/types/property.ts#L4)

## 4) OpenAI Request Payload (Endpoint -> OpenAI)

OpenAI call is built in [vite.config.ts](vite.config.ts#L230), URL:
- `https://api.openai.com/v1/chat/completions` at [vite.config.ts](vite.config.ts#L10)

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer ${OPENAI_API_KEY}`

Body (shape):

```json
{
  "model": "<options.model>",
  "temperature": 0.2,
  "response_format": { "type": "json_object" },
  "messages": [
    {
      "role": "system",
      "content": "You generate conservative real-estate investment analysis as strict JSON."
    },
    {
      "role": "user",
      "content": "<prompt from buildPrompt(property)>"
    }
  ]
}
```

Prompt assembly source:
- [buildPrompt](vite.config.ts#L165)
- Includes strict output schema fields expected by UI.

## 5) OpenAI Model Used

Model value comes from Vite config env resolution:
- [vite.config.ts](vite.config.ts#L285)
- `OPENAI_MODEL` env if present, else default `gpt-4o-mini`

Effective assignment:
- [vite.config.ts](vite.config.ts#L240)

## 6) Response Parsing Logic

### Endpoint-side parsing

1. Parse OpenAI JSON response payload:
- [vite.config.ts](vite.config.ts#L258)

2. Extract content string from first choice:
- [vite.config.ts](vite.config.ts#L261)

3. Parse model content as JSON:
- [vite.config.ts](vite.config.ts#L270)

4. Normalize into UI-compatible `InvestmentAnalysis` shape:
- [normalizeAnalysis](vite.config.ts#L64)
- Adds defaults, numeric coercion, clamping, and recommendation safety.

5. Return to browser:
- `200 { ok: true, analysis }` at [vite.config.ts](vite.config.ts#L272)

### Frontend-side parsing

- Parse endpoint JSON at [src/services/api/dealAnalysis.service.ts](src/services/api/dealAnalysis.service.ts#L24)
- Throws if HTTP not ok or `payload.ok !== true` at [src/services/api/dealAnalysis.service.ts](src/services/api/dealAnalysis.service.ts#L29)
- Returns `payload.analysis` at [src/services/api/dealAnalysis.service.ts](src/services/api/dealAnalysis.service.ts#L34)

## 7) Fallback Logic

Fallback is in App analyze handler:
- [src/App.tsx](src/App.tsx#L31)

Behavior:
- Try `await generateDealAnalysis(property)`.
- On any thrown error, logs warning and falls back to `generateMockAnalysis(property)`:
  - [src/App.tsx](src/App.tsx#L36)
- Then always navigates to report with resulting analysis.

Also endpoint-side fallback-like behavior:
- If `OPENAI_API_KEY` missing -> `503` with safe error at [vite.config.ts](vite.config.ts#L220)
- If OpenAI fails -> `502` at [vite.config.ts](vite.config.ts#L253)
- If malformed/other exception -> `500` at [vite.config.ts](vite.config.ts#L275)

These endpoint errors trigger frontend fallback because the service throws.

## 8) Source of Investment Score

### Primary source (OpenAI path)
- Model-provided `score` in response content JSON.
- Then normalized and clamped in [normalizeAnalysis](vite.config.ts#L110).
- Default fallback score values inside normalization are 65 for each dimension.

### Fallback source (mock path)
- Computed in [generateMockAnalysis](src/lib/analyzerEngine.ts#L3):
  - Base dimensions generated via randomized heuristics.
  - `overall` calculated as rounded mean of six dimensions:
    - [src/lib/analyzerEngine.ts](src/lib/analyzerEngine.ts#L18)

## 9) Source of Recommendation

### Primary source (OpenAI path)
- `payload.recommendation` from model JSON.
- Sanitized in [normalizeAnalysis](vite.config.ts#L102):
  - Accepts only `buy | watch | avoid`.
  - Invalid/missing -> defaults to `watch`.

### Fallback source (mock path)
- Threshold logic in [src/lib/analyzerEngine.ts](src/lib/analyzerEngine.ts#L42):
  - `overall >= 75` -> `buy`
  - `overall >= 60` -> `watch`
  - else `avoid`

## 10) Source of Location Parsing

Location is not geo-parsed by a separate parser; it is directly mapped from submitted form fields.

Field sources:
- `country`, `city`, `district` set from formData in [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx#L39)

Validation gate at endpoint:
- Ensures these are strings in [isPropertyPayload](vite.config.ts#L46)

UI consumption:
- Investment Report renders location as `property.city, property.country`:
  - [src/components/InvestmentReport.tsx](src/components/InvestmentReport.tsx#L68)

## Step-by-Step Execution Flow Diagram

```mermaid
flowchart TD
  A[User clicks Generate AI Analysis] --> B[DealAnalyzer handleSubmit]
  B --> C[Build Property object from formData]
  C --> D[Call onAnalyze(property)]
  D --> E[App handleAnalyze]
  E --> F[generateDealAnalysis service]
  F --> G[POST /api/deal-analysis with { property }]

  G --> H[Vite middleware route match]
  H --> I{OPENAI_API_KEY present?}
  I -- No --> J[Return 503 safe error]
  I -- Yes --> K[Validate property payload]
  K --> L[Build prompt + JSON schema]
  L --> M[POST OpenAI /v1/chat/completions]
  M --> N{OpenAI HTTP ok?}
  N -- No --> O[Log bounded provider details + return 502]
  N -- Yes --> P[Extract choices[0].message.content]
  P --> Q[JSON.parse(content)]
  Q --> R[normalizeAnalysis to InvestmentAnalysis]
  R --> S[Return 200 { ok: true, analysis }]

  J --> T[service throws]
  O --> T
  S --> U[service returns analysis]
  T --> V[App catch: generateMockAnalysis(property)]
  U --> W[setCurrentAnalysis]
  V --> W
  W --> X[setCurrentPage(report)]
  X --> Y[InvestmentReport renders score/recommendation/location]
```
