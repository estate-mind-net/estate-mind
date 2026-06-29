# Opportunity Intelligence Engine

## Purpose

The Opportunity Intelligence Engine is the reusable scoring and analysis backbone of EstateMind. It converts raw real estate listings into structured, scored opportunities with evidence tracking, missing-data detection, and confidence scoring.

The engine is module-agnostic. Each intelligence module (Rent, Invest, Build, etc.) provides its own config, normalizer, and scorer, while the engine provides the shared pipeline, types, and services.

## Pipeline Flow

```
Raw Listing Data
    |
    v
[Normalizer]  -- module-specific, converts raw -> NormalizedOpportunity
    |              adds evidence, missing data, confidence score
    v
[Scorer]      -- module-specific, scores against user preferences
    |              returns totalScore, recommendation, breakdown
    v
ScoredOpportunity  -- ready for UI display
```

## Folder Structure

```
src/modules/opportunity-intelligence/
    types.ts                         # Shared types + IMPLEMENTED_MODULES
    index.ts                         # Public barrel export
    debug.ts                         # Debug utility for scoring inspection
    README.md                        # This file
    configs/
        rentModuleConfig.ts          # Rent weights, thresholds, labels
    normalizers/
        rentNormalizer.ts            # RentalApartment -> NormalizedOpportunity
    scoring/
        rentScorer.ts                # NormalizedOpportunity -> OpportunityScore
    services/
        opportunityHunterService.ts  # Orchestrator pipeline
        normalizationService.ts       # Module-aware normalization dispatcher
        scoringService.ts             # Module-aware scoring dispatcher
        sourceRunnerService.ts        # Source discovery stub
    tests/
        engineTests.ts               # Self-contained test runner
```

## How Rent Uses the Engine

```ts
import { normalizeRentListing } from '@/modules/opportunity-intelligence/normalizers/rentNormalizer'
import { scoreRentOpportunity } from '@/modules/opportunity-intelligence/scoring/rentScorer'

const normalized = normalizeRentListing(apartment)
const result = scoreRentOpportunity(normalized, preferences)
// result.totalScore, result.recommendation, result.confidenceScore, result.missingData
```

## How to Add a Future Module (Example: Invest)

### 1. Create config

`configs/investModuleConfig.ts` - define weights, thresholds, labels, preferences interface.

### 2. Create normalizer

`normalizers/investNormalizer.ts` - convert invest listing to NormalizedOpportunity with evidence and missing data.

### 3. Create scorer

`scoring/investScorer.ts` - score against preferences, return OpportunityScore.

### 4. Register in dispatchers

- Add `case 'invest':` to `normalizationService.ts`
- Add `case 'invest':` to `scoringService.ts`

### 5. Mark as implemented

Add `'invest'` to `IMPLEMENTED_MODULES` in `types.ts`.

## Key Design Rules

1. **Do not invent facts.** Missing data goes in `missingData`, reduces `confidenceScore`.
2. **Separate confirmed from inferred.** Use `EvidenceItem.source`.
3. **Scoring must be deterministic.** Same inputs -> same outputs.
4. **Module-specific logic stays in module files.** Generic services only dispatch.
5. **Use `IMPLEMENTED_MODULES`** for guards, not ad-hoc arrays.
6. **Use exhaustive switches** so TypeScript catches missing cases.

## Debugging

```ts
import { debugOpportunity } from '@/modules/opportunity-intelligence'
const report = debugOpportunity(listing, preferences)
console.log(report.summary)
```

## Running Tests

```bash
npx tsx src/modules/opportunity-intelligence/tests/engineTests.ts
```