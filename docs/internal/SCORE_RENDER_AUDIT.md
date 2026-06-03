# Score Render Audit

## Scope

This audit traces the Deal Analyzer overall score path after the investor-grade schema upgrade, from the OpenAI response through normalization, API delivery, frontend state, and `InvestmentReport` rendering.

## Trace

### 1. OpenAI response

Server entry point: `POST /api/deal-analysis` in `vite.config.ts`.

- The raw provider payload is parsed from `choices[0].message.content` into `structured`.
- The active normalization path reads these score-related fields from `structured`:
  - `score`
  - `metrics`
  - `confidenceLevel`
  - `confidence`
  - `overallScore`
  - `investmentScore`
- Only `structured.score.overall` feeds the legacy UI overall score.
- `overallScore`, `investmentScore`, `metrics`, and `confidence` are not used to compute `analysis.score.overall`.

### 2. `normalizeAnalysis()`

Normalization logic lives in `vite.config.ts`.

- `const score = payload.score && typeof payload.score === 'object' ? payload.score : {}`
- Overall UI score is produced here:

```ts
overall: clamp(Math.round(asNumber(score.overall, 65)), 0, 100)
```

Implications:

- If `payload.score` is missing, `null`, or not an object, `score` becomes `{}`.
- If `score.overall` is `undefined`, missing, or `null`, `asNumber(score.overall, 65)` returns `65`.
- If `score.overall` is the string or number `0`, `asNumber(score.overall, 65)` returns `0`.
- Therefore the UI can render `Overall Score = 0` only if `score.overall` survives into normalization as an explicit zero-like value.

### 3. API response

The API returns:

```json
{ "ok": true, "analysis": { ...normalizedAnalysis } }
```

- `analysis.score.overall` is sent exactly as produced by `normalizeAnalysis()`.
- No additional API-layer score transformation occurs after normalization.

### 4. Frontend state

`App.tsx` receives the response via `generateDealAnalysis(property)` and stores it directly:

```ts
analysis = await generateDealAnalysis(property)
setCurrentAnalysis(analysis)
```

- There is no score remapping, coercion, or recomputation in `App.tsx`.
- If API analysis is present, the exact `analysis.score` object is what the report receives.
- If the API call fails, the app falls back to `generateMockAnalysis(property)`, which produces a non-zero computed score path.

### 5. `InvestmentReport` component

`InvestmentReport.tsx` resolves the report object as:

```ts
const report = analysis || mockAnalyses[0]
```

Then renders:

```tsx
<ScoreGauge score={score.overall} size="lg" showLabel={false} />
```

- `InvestmentReport` does not compute or coerce the overall score.
- `ScoreGauge` displays the numeric prop directly and uses it in SVG math.
- There is no fallback from `undefined` to `0` inside `InvestmentReport` or `ScoreGauge`.

## Field Status Check

### `score`

- Active canonical field for the Deal Analyzer UI.
- Required by the current `InvestmentAnalysis` type and consumed by `InvestmentReport`.
- `score.overall` is the only value used for the main rendered overall score.

### `overallScore`

- Not part of the active `InvestmentAnalysis` type.
- Not consumed by `normalizeAnalysis()` when building the UI score.
- Not consumed by `App.tsx`, `InvestmentReport.tsx`, or `ScoreGauge.tsx`.

### `investmentScore`

- Not part of the active Deal Analyzer report path.
- Legacy references exist elsewhere in the codebase, but not in the Deal Analyzer render path.
- Not used by `normalizeAnalysis()` for `analysis.score.overall`.

### `metrics`

- Present in the investor-grade schema and carried through as additional analysis data.
- Not used to compute the legacy `score.overall` field rendered by the current UI.

### `confidence`

- `confidenceLevel` exists in the upgraded normalized payload.
- Neither `confidence` nor `confidenceLevel` affects the overall score rendering path in the current UI.

## Determinations

### Is `score` null?

- If raw `payload.score` is `null`, normalization replaces it with `{}`.
- Result: `analysis.score.overall` becomes `65`, not `0`.

### Is `score` undefined?

- If raw `payload.score` is `undefined` or missing, normalization replaces it with `{}`.
- Result: `analysis.score.overall` becomes `65`, not `0`.

### Is `score` missing?

- If missing entirely, normalization falls back to `65` for `overall`.
- Missing `score` alone does not explain a rendered `0`.

### Is `score` being converted to `0`?

- Yes, but only when `score.overall` is explicitly zero-like in the raw response.
- `asNumber()` preserves `0` because `Number(0)` and `Number('0')` are finite.
- `clamp()` then preserves `0`.

## Likely Cause

The most likely cause of `Overall Score = 0` after the investor-grade upgrade is that the model is returning the legacy `score` block with explicit zero placeholder values, while also returning the new investor-grade fields.

Why this is plausible:

- The upgraded prompt still requests the legacy `score` object for UI compatibility.
- The prompt schema examples show legacy score values as literal zeros.
- `normalizeAnalysis()` trusts explicit `score.overall = 0` and does not recompute or reject it.
- Missing alternate fields like `overallScore`, `investmentScore`, or populated `metrics` do not affect the rendered overall score.

## Temporary Debug Logging Added

Temporary logging was added without changing scoring behavior.

### Server logs in `vite.config.ts`

- Raw score fields from parsed OpenAI content:
  - `overallScore`
  - `score`
  - `investmentScore`
  - `metrics`
  - `confidence`
  - `confidenceLevel`
- Normalized score fields before API response:
  - `analysis.score`
  - `analysis.overallScore`
  - `analysis.investmentScore`
  - `analysis.metrics`
  - `analysis.confidence`
  - `analysis.confidenceLevel`

### Frontend logs

- API response boundary in `src/services/api/dealAnalysis.service.ts`
- Final report render boundary in `src/components/InvestmentReport.tsx`

These logs show:

- raw score values
- normalized score values
- final UI-rendered score values

## Conclusion

Based on the current code path, `Overall Score = 0` is not caused by a missing `score` field, an undefined `score`, or a frontend fallback to zero. It is most consistent with an explicit `score.overall = 0` arriving from the provider response and being preserved by normalization.