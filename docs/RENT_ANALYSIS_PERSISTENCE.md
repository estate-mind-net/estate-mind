# Rent Analysis Persistence — Architecture Documentation

## Purpose

The Rent Analysis persistence layer saves deterministic rental analysis results to Supabase so that:
- Analysis survives page refreshes
- Findings are queryable via the shared `ai_findings` table
- The full analysis context is preserved in the `notes` table
- Other modules can eventually reuse the same pattern

## Persistence Flow

```
User clicks "Generate Rent Analysis"
         │
         ▼
generateRentAnalysis(apartment, preferences)
  → RentAnalysisResult (pure, deterministic)
         │
         ▼
┌────────────────────────────────────┐
│ Is source === 'cloud'?            │
│  YES → persist to Supabase        │
│  NO  → display only               │
└────────────┬───────────────────────┘
             │ YES
             ▼
┌─ saveRentAnalysis() ──────────────────────────┐
│  1. Build note content with metadata           │
│  2. Insert into notes table                    │
│  3. Return { success, data?, error? }          │
└────────────────────────────────────────────────┘
             │ (parallel)
             ▼
┌─ replaceRentAnalysisFindings() ───────────────┐
│  1. Map analysis → AiFindingCreateInput[]      │
│  2. Delete existing findings for opportunity    │
│  3. Insert new findings                         │
│  4. Return { success, error? }                  │
└────────────────────────────────────────────────┘
             │
             ▼
     UI displays analysis
     Badge: "Saved to cloud"
```

On page load (cloud-backed only):
```
RentOpportunityDetailPage mounts
         │
         ▼
getLatestRentAnalysis(opportunityId, context)
  → Scan notes table for latest with type='rent_analysis'
  → Parse JSON, extract RentAnalysisResult
  → If found: set analysis state, show "Previously saved" badge
  → If not found: show "Generate Rent Analysis" button
```

## Notes Table Usage

The analysis is stored as a JSON string in the `notes.content` column.

### Note Content Shape

```json
{
  "type": "rent_analysis",
  "analysisVersion": "rent-deterministic-v1",
  "generatedAt": "2026-06-18T12:00:00.000Z",
  "source": "deterministic",
  "preferences": {
    "maxBudget": 800,
    "minimumSize": 40,
    "preferredDistrict": "Liman",
    "furnishedRequired": true,
    "parkingRequired": false,
    "petsRequired": false,
    "remoteWorkImportant": true,
    "coupleMode": true
  },
  "result": {
    "executiveSummary": "...",
    "priceAssessment": "...",
    "locationAssessment": "...",
    "coupleSuitability": "...",
    "remoteWorkSuitability": "...",
    "comfortRisks": ["..."],
    "keyPros": ["..."],
    "keyCons": ["..."],
    "missingInformation": ["..."],
    "confidenceScore": 85,
    "recommendation": "Good Fit"
  },
  "snapshot": {
    "score": 78,
    "recommendation": "Good Fit",
    "confidenceScore": 85,
    "rentPerM2": 11.82
  }
}
```

### Metadata Fields

| Field | Value | Purpose |
|---|---|---|
| `type` | `"rent_analysis"` | Discriminator — distinguishes from investment analysis notes |
| `analysisVersion` | `"rent-deterministic-v1"` | Version tag for future schema evolution |
| `generatedAt` | ISO timestamp | When the analysis was generated |
| `source` | `"deterministic"` | Indicates this is rule-based, not AI-generated |

### Database Columns Used

| Column | Value |
|---|---|
| `organization_id` | From auth context |
| `opportunity_id` | The rent opportunity ID |
| `content` | JSON string of the note content above |

## AI Findings Table Usage

Each meaningful piece of the analysis is stored as a row in `ai_findings`.

### Mapping

| RentAnalysisResult field | `finding_type` | `category` | `source_type` |
|---|---|---|---|
| `keyPros[]` | `opportunity` | `opportunities` | `listing` |
| `keyCons[]` | `risk` | `risks` | `listing` |
| `comfortRisks[]` | `risk` | `risks` | `listing` |
| `missingInformation[]` | `missing_evidence` | `missingEvidence` | `listing` |

### Finding Row Shape

```json
{
  "organization_id": "org-123",
  "opportunity_id": "opp-456",
  "category": "opportunities",
  "title": "Rent (€650) is comfortably below your €800 budget.",
  "finding_type": "opportunity",
  "confidence": 85,
  "source_type": "listing",
  "evidence": "Rent (€650) is comfortably below your €800 budget.",
  "metadata": {
    "explanation": "Rent (€650) is comfortably below your €800 budget.",
    "value": "Rent (€650) is comfortably below your €800 budget."
  }
}
```

### Replace Pattern

Findings use a delete-then-insert pattern:
1. Delete all rows where `organization_id` AND `opportunity_id` match
2. Insert new rows

This is the same pattern used by the Investment module's `replaceAiFindingsForOpportunity`.

## Local/Demo Behavior

| Source | Generate | Persist | Load on Visit | Button Text |
|---|---|---|---|---|
| Cloud | ✅ Deterministic | ✅ notes + ai_findings | ✅ From notes | "Regenerate Rent Analysis" if saved, "Generate Rent Analysis" if not |
| Local | ✅ Deterministic | ❌ Not persisted | ❌ | "Generate Rent Analysis" / "Regenerate Rent Analysis" |
| Demo | ✅ Deterministic | ❌ Not persisted | ❌ | "Generate Rent Analysis" / "Regenerate Rent Analysis" |

### Save Failure Handling

If `saveRentAnalysis` or `replaceRentAnalysisFindings` fails:
- Analysis is still displayed in the UI (user doesn't lose their work)
- Toast: "Analysis generated but not saved: {error message}"
- No "Saved to cloud" badge

## Known Limitations

1. **Only latest analysis shown**: `getLatestRentAnalysis` loads the most recent note with `type='rent_analysis'`. Previous analyses are preserved in the notes table but not surfaced in the UI.

2. **Findings replaced on each generate**: Each regeneration deletes all previous findings for that opportunity (including any investment findings if the opportunity was originally created as an investment). This is consistent with the Investment module behavior.

3. **Preferences not compared**: When loading a saved analysis, the UI does not compare the saved preferences with current preferences. The user sees the analysis with whatever preferences were active when it was generated.

4. **No incremental updates**: Each generate replaces the full analysis. There's no way to update individual findings.

5. **Confidence score on findings**: All findings use the overall `confidenceScore` from the analysis. Individual findings don't have independent confidence values.

6. **Title truncation**: Finding titles are truncated to 80 characters with "..." suffix.

## Future OpenAI Path

When OpenAI integration is added:

1. **Extend `source` type**: Change from `'deterministic'` to `'ai_assisted'` or `'openai'`
2. **Extend `AiFindingSourceType`**: Add `'ai_rent_analysis'` or reuse `'ai_inference'`
3. **Replace `generateRentAnalysis()`**: Call OpenAI API, map response to `RentAnalysisResult`
4. **Keep persistence layer unchanged**: `saveRentAnalysis()` and `replaceRentAnalysisFindings()` work with any `RentAnalysisResult` regardless of source
5. **Add `analysisVersion`**: Use `'rent-ai-v1'` to distinguish from deterministic
6. **Hybrid approach**: Run deterministic analysis first (always available), then optionally enhance with AI if API key is configured

The persistence layer is source-agnostic — it stores whatever `RentAnalysisResult` it receives, making the OpenAI path a drop-in replacement at the generation layer only.