# OpenAI Response Audit (Deal Analyzer)

Date: 2026-06-03
Repository: EstateMind (estatemind)

## Scope

Audit of the OpenAI response quality path used by Deal Analyzer server endpoint in [vite.config.ts](vite.config.ts).

## 1) buildPrompt() Inspection

Function:
- [buildPrompt](vite.config.ts#L165)

Prompt behavior:
- Sets role framing: conservative real estate analyst.
- Requires JSON-only response.
- Injects full property payload as JSON string.
- Includes explicit output schema (JSON.stringify object) in prompt text.

Prompt instruction lines:
- Return valid JSON only.
- No markdown.
- Do not include secrets.
- Use only schema fields.

## 2) Exact JSON Schema Requested From OpenAI

Requested schema in [buildPrompt](vite.config.ts#L176):

```json
{
  "score": {
    "overall": 0,
    "rentalYield": 0,
    "airbnbPotential": 0,
    "appreciation": 0,
    "renovation": 0,
    "legal": 0,
    "liquidity": 0,
    "energy": 0
  },
  "recommendation": "watch",
  "executiveSummary": "string",
  "rentalYieldEstimate": { "monthly": 0, "annual": 0, "percentage": 0 },
  "airbnbPotential": {
    "dailyRate": 0,
    "occupancy": 0,
    "monthlyRevenue": 0,
    "annualRevenue": 0,
    "percentage": 0
  },
  "renovationROI": { "estimatedCost": 0, "valueIncrease": 0, "roi": 0 },
  "appreciationPotential": { "oneYear": 0, "threeYear": 0, "fiveYear": 0 },
  "risks": ["string"],
  "opportunities": ["string"],
  "assumptions": ["string"],
  "missingData": ["string"]
}
```

## 3) Exact Fields Expected by normalizeAnalysis()

Function:
- [normalizeAnalysis](vite.config.ts#L64)

Raw input fields read from OpenAI payload:
- `score.overall`
- `score.rentalYield`
- `score.airbnbPotential`
- `score.appreciation`
- `score.renovation`
- `score.legal`
- `score.liquidity`
- `score.energy`
- `recommendation`
- `executiveSummary`
- `rentalYieldEstimate.monthly`
- `rentalYieldEstimate.annual`
- `rentalYieldEstimate.percentage`
- `airbnbPotential.dailyRate`
- `airbnbPotential.occupancy`
- `airbnbPotential.monthlyRevenue`
- `airbnbPotential.annualRevenue`
- `airbnbPotential.percentage`
- `renovationROI.estimatedCost`
- `renovationROI.valueIncrease`
- `renovationROI.roi`
- `appreciationPotential.oneYear`
- `appreciationPotential.threeYear`
- `appreciationPotential.fiveYear`
- `risks`
- `opportunities`
- `assumptions`
- `missingData`

Also uses property-derived fields for fallback calculations:
- `property.askingPrice`
- `property.expectedRent`
- `property.id`

## 4) All Default Values Used by normalizeAnalysis()

Numeric/structural defaults:
- `askingPrice` fallback: `1`.
- `expectedRent` fallback: `askingPrice * 0.0035`.
- `rentalYieldEstimate` object fallback: `{}`.
- `airbnbPotential` object fallback: `{}`.
- `renovationROI` object fallback: `{}`.
- `appreciationPotential` object fallback: `{}`.

Score defaults (before clamp):
- `overall`: `65`
- `rentalYield`: `65`
- `airbnbPotential`: `65`
- `appreciation`: `65`
- `renovation`: `65`
- `legal`: `65`
- `liquidity`: `65`
- `energy`: `65`

Derived metric defaults:
- `rentalMonthly`: `expectedRent`
- `rentalAnnual`: `rentalMonthly * 12`
- `rentalPct`: `(rentalAnnual / max(askingPrice,1)) * 100`
- `airbnbMonthly`: `rentalMonthly * 1.2`
- `airbnbAnnual`: `airbnbMonthly * 12`
- `airbnbPct`: `(airbnbAnnual / max(askingPrice,1)) * 100`
- `dailyRate`: `airbnbMonthly / 30`
- `occupancy`: `62`
- `estimatedCost`: `askingPrice * 0.06`
- `valueIncrease`: `askingPrice * 0.08`
- `roi`: `18`
- `oneYear`: `3`
- `threeYear`: `10`
- `fiveYear`: `18`

Text/list defaults:
- `recommendation`: `watch` when not one of `buy|watch|avoid`.
- `executiveSummary`: `AI analysis completed with limited market context. Validate assumptions before investing.`
- `risks`: `['Market volatility and regulatory changes should be reviewed.']`
- `opportunities`: `['Comparable pricing and rental demand may support upside.']`
- `assumptions`: `['Estimates are based on limited local market context.']`
- `missingData`: `['Property tax records and detailed inspection report are missing.']`

Metadata defaults:
- `id`: `analysis-${Date.now()}`
- `propertyId`: `property.id ?? property-${Date.now()}`
- `analyzedAt`: `new Date().toISOString()`

## 5) Conditions That Can Produce Specific Outcomes

### score = 0

Any score dimension becomes `0` when input resolves to `<= 0` after `asNumber(...)`, `Math.round`, and `clamp(0..100)`.

This includes cases like:
- Model explicitly returns `0`.
- Model returns negative values (clamped to `0`).
- Model returns `null`, `false`, or empty string for a dimension:
  - `Number(null) -> 0`
  - `Number(false) -> 0`
  - `Number('') -> 0`

Important nuance:
- Missing/undefined/non-numeric values do **not** become `0`; they take fallback `65` via `asNumber(value, 65)`.

### recommendation = watch

`watch` occurs when:
- Model explicitly returns `"watch"`.
- Model returns invalid or missing recommendation (anything not `buy|watch|avoid`) and sanitization defaults to `watch`.
- Fallback mock path is used and mock `overall` score is between `60` and `74`:
  - See [src/lib/analyzerEngine.ts](src/lib/analyzerEngine.ts#L42)

### missing dimensions

There are two perspectives:
- OpenAI payload can omit dimensions.
- Final normalized analysis sent to UI does **not** have missing dimensions because `normalizeAnalysis()` always materializes all score fields and core sections.

If a score dimension is missing in OpenAI output:
- It is auto-filled with default `65` (unless model provided a value coercing to zero, as above).

## 6) Verify Whether OpenAI Output Is Logged

Before this audit logging patch:
- Successful OpenAI output was not logged.
- Only error paths were logged:
  - request failure status/body slice
  - empty content
  - generic endpoint error

Current status after temporary logging patch:
- Raw OpenAI response text can be logged.
- Parsed OpenAI JSON can be logged.
- Normalized analysis can be logged.

## 7) Temporary Debug Logging Added

Location:
- [vite.config.ts](vite.config.ts#L258)
- [vite.config.ts](vite.config.ts#L264)
- [vite.config.ts](vite.config.ts#L273)

What is logged (when enabled):
- Raw OpenAI response text: `console.debug('[deal-analysis] raw OpenAI response', rawResponseText)`
- Parsed JSON object: `console.debug('[deal-analysis] parsed OpenAI response JSON', payload)`
- Normalized analysis object: `console.debug('[deal-analysis] normalized analysis', analysis)`

How to enable:
- Set `DEBUG_OPENAI_RESPONSE=1` in `.env.local`.
- Restart dev server.

Notes:
- This does not change business logic or API contract.
- Logs are server-side only.
- Secret keys are still not emitted to client.
